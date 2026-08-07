import asyncio
import json
import logging
import uuid
import websockets
from typing import AsyncIterable, Optional, Union
from livekit import rtc
from livekit.agents.stt import (
    STT,
    STTCapabilities,
    SpeechEvent,
    SpeechEventType,
    SpeechData,
    RecognizeStream,
)
from livekit.agents.utils import AudioBuffer

logger = logging.getLogger("vexyl_stt")

class VexylRecognizeStream(RecognizeStream):
    def __init__(
        self,
        *,
        stt: STT,
        conn_options,
        url: str,
        api_key: Optional[str],
        language: str,
    ):
        # Vexyl requires 16kHz audio
        super().__init__(stt=stt, conn_options=conn_options, sample_rate=16000)
        self._url = url
        self._api_key = api_key
        self._language = language
        self._session_id = str(uuid.uuid4())
        
    async def _run(self) -> None:
        headers = {}
        if self._api_key:
            headers["X-API-Key"] = self._api_key
            
        try:
            async with websockets.connect(self._url, additional_headers=headers, open_timeout=60, close_timeout=5) as ws:
                # 1. Send start message
                start_msg = {
                    "type": "start",
                    "lang": self._language,
                    "session_id": self._session_id
                }
                await ws.send(json.dumps(start_msg))
                
                # Wait for ready signal
                ready_response = await ws.recv()
                
                # 2. Start send and receive tasks
                async def send_task():
                    try:
                        async for frame in self._input_ch:
                            if isinstance(frame, self._FlushSentinel):
                                await ws.send(json.dumps({"type": "stop"}))
                            else:
                                # Send binary PCM audio (16-bit mono 16kHz)
                                await ws.send(frame.data.cast("b"))
                    except Exception as e:
                        logger.error(f"Error in Vexyl send_task: {e}")
                
                async def recv_task():
                    try:
                        async for msg in ws:
                            if isinstance(msg, str):
                                data = json.loads(msg)
                                if data.get("type") == "final":
                                    text = data.get("text", "").strip()
                                    if text:
                                        speech_data = SpeechData(language=data.get("lang", self._language), text=text)
                                        event = SpeechEvent(
                                            type=SpeechEventType.FINAL_TRANSCRIPT,
                                            alternatives=[speech_data]
                                        )
                                        self._event_ch.send_nowait(event)
                                elif data.get("type") == "stopped":
                                    pass # Server confirmed flush
                    except websockets.exceptions.ConnectionClosed:
                        logger.info("Vexyl STT WebSocket closed")
                    except Exception as e:
                        logger.error(f"Error in Vexyl recv_task: {e}")

                sender = asyncio.create_task(send_task())
                receiver = asyncio.create_task(recv_task())
                
                await asyncio.gather(sender, receiver)
                
        except Exception as e:
            logger.error(f"Vexyl STT connection failed: {e}")
            raise


class VexylSTT(STT):
    def __init__(
        self,
        *,
        url: str,
        api_key: Optional[str] = None,
        language: Optional[str] = None,
        capabilities: Optional[STTCapabilities] = None,
    ):
        if capabilities is None:
            capabilities = STTCapabilities(streaming=True, interim_results=False)
        super().__init__(capabilities=capabilities)
        self._url = url
        self._api_key = api_key
        self._language = language or "hi-IN"

    async def _recognize_impl(
        self,
        buffer: AudioBuffer,
        *,
        language: Optional[str],
        conn_options,
    ) -> SpeechEvent:
        raise NotImplementedError("Vexyl STT only supports streaming mode for now.")

    def stream(
        self,
        *,
        language: Optional[str] = None,
        conn_options = None,
    ) -> RecognizeStream:
        if not language:
            language = self._language
            
        # Mock conn_options if not provided since we inherit from base
        if conn_options is None:
            from livekit.agents import APIConnectOptions
            conn_options = APIConnectOptions()

        return VexylRecognizeStream(
            stt=self,
            conn_options=conn_options,
            url=self._url,
            api_key=self._api_key,
            language=language
        )
