import asyncio
import base64
import json
import logging
import os
import aiohttp
from typing import Optional

from livekit.agents.stt import (
    STT,
    RecognizeStream,
    SpeechEvent,
    SpeechEventType,
    SpeechData,
    STTCapabilities,
)
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS

logger = logging.getLogger("sarvam_realtime_stt")


class SarvamRealtimeRecognizeStream(RecognizeStream):
    def __init__(self, stt: STT, conn_options, api_key: str, language: str):
        super().__init__(stt=stt, conn_options=conn_options, sample_rate=16000)
        self._api_key = api_key
        self._language = language

    async def _run(self) -> None:
        # Use server-side VAD so Sarvam auto-detects speech boundaries.
        # LiveKit's pipeline pushes frames continuously but never calls flush(),
        # so manual endpointing would never produce a final transcript.
        ws_url = (
            f"wss://api.sarvam.ai/speech-to-text-realtime/ws"
            f"?language_code={self._language}"
            f"&model=saaras:v3-realtime"
            f"&mode=transcribe"
            f"&endpointing=vad"
            f"&stream_type=fast"
            f"&silence_duration_ms=1500"
            f"&min_speech_duration_ms=200"
            f"&threshold=0.3"
        )

        async with aiohttp.ClientSession() as session:
            try:
                async with session.ws_connect(
                    ws_url,
                    headers={"api-subscription-key": self._api_key},
                    autoping=True,
                    heartbeat=15,
                ) as ws:
                    logger.info("[Sarvam Realtime STT] Connected to WebSocket.")

                    # Wait for session.begin
                    first_msg = await ws.receive()
                    if first_msg.type == aiohttp.WSMsgType.TEXT:
                        init_data = json.loads(first_msg.data)
                        logger.info(f"[Sarvam Realtime STT] Session init: {init_data.get('event', 'unknown')}")

                    async def recv_task():
                        """Receive transcription events from Sarvam."""
                        try:
                            async for msg in ws:
                                if msg.type == aiohttp.WSMsgType.TEXT:
                                    try:
                                        data = json.loads(msg.data)
                                        event_type = data.get("event")

                                        if event_type == "transcript.partial":
                                            text = data.get("text", "").strip()
                                            if text:
                                                self._event_ch.send_nowait(SpeechEvent(
                                                    type=SpeechEventType.INTERIM_TRANSCRIPT,
                                                    alternatives=[SpeechData(language=self._language, text=text)]
                                                ))

                                        elif event_type == "transcript.final":
                                            text = data.get("text", "").strip()
                                            if text:
                                                logger.info(f"[Sarvam Realtime STT] FINAL: {text}")
                                                self._event_ch.send_nowait(SpeechEvent(
                                                    type=SpeechEventType.FINAL_TRANSCRIPT,
                                                    alternatives=[SpeechData(language=self._language, text=text)]
                                                ))

                                        elif event_type == "vad.speech_start":
                                            logger.debug("[Sarvam Realtime STT] Speech started (server VAD)")

                                        elif event_type == "vad.speech_end":
                                            logger.debug("[Sarvam Realtime STT] Speech ended (server VAD)")

                                        elif event_type == "error":
                                            logger.error(f"[Sarvam Realtime STT] Server error: code={data.get('code')} msg={data.get('message')}")
                                            if data.get("is_fatal"):
                                                return

                                        elif event_type == "pong":
                                            pass  # keepalive response

                                        elif event_type == "session.end":
                                            logger.info(f"[Sarvam Realtime STT] Session ended. Audio duration: {data.get('audio_duration_s')}s")
                                            return

                                    except Exception as e:
                                        logger.error(f"[Sarvam Realtime STT] Error parsing message: {e}")

                                elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                                    logger.warning(f"[Sarvam Realtime STT] WebSocket closed/error: {msg.type}")
                                    break
                        except asyncio.CancelledError:
                            pass

                    async def ping_task():
                        """Keep the WebSocket alive."""
                        try:
                            while True:
                                await asyncio.sleep(10)
                                await ws.send_json({"event": "ping"})
                        except (asyncio.CancelledError, Exception):
                            pass

                    r_task = asyncio.create_task(recv_task())
                    p_task = asyncio.create_task(ping_task())

                    try:
                        async for frame in self._input_ch:
                            if isinstance(frame, self._FlushSentinel):
                                # Pipeline is flushing — we can ignore since Sarvam's
                                # server VAD handles endpointing automatically
                                continue

                            # Send audio frames as base64
                            raw_bytes = bytes(frame.data.cast("b"))
                            if len(raw_bytes) == 0:
                                continue

                            b64_audio = base64.b64encode(raw_bytes).decode("utf-8")
                            await ws.send_json({
                                "event": "audio_input",
                                "audio": b64_audio
                            })
                    except asyncio.CancelledError:
                        pass
                    finally:
                        p_task.cancel()
                        try:
                            await ws.send_json({"event": "end"})
                        except Exception:
                            pass
                        # Give recv_task a moment to process any final messages
                        try:
                            await asyncio.wait_for(r_task, timeout=2.0)
                        except (asyncio.TimeoutError, asyncio.CancelledError):
                            r_task.cancel()

            except Exception as e:
                logger.error(f"[Sarvam Realtime STT] Connection error: {e}")


class SarvamRealtimeSTT(STT):
    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        language: Optional[str] = None,
    ):
        capabilities = STTCapabilities(streaming=True, interim_results=True)
        super().__init__(capabilities=capabilities)
        self._api_key = api_key or os.environ.get("SARVAM_API_KEY")
        if not self._api_key:
            raise ValueError("SARVAM_API_KEY is required.")
        self._language = language or "te-IN"

    async def _recognize_impl(self, buffer, *, language, conn_options) -> SpeechEvent:
        raise NotImplementedError("SarvamRealtimeSTT only supports streaming via stream()")

    def stream(
        self, *, conn_options=None
    ) -> RecognizeStream:
        return SarvamRealtimeRecognizeStream(
            stt=self,
            conn_options=conn_options or DEFAULT_API_CONNECT_OPTIONS,
            api_key=self._api_key,
            language=self._language,
        )
