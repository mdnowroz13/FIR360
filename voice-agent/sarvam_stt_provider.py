import asyncio
import io
import json
import logging
import os
import wave
import aiohttp

from typing import AsyncIterable, Optional

from livekit.agents.stt import (
    STT,
    STTCapabilities,
    SpeechEvent,
    SpeechEventType,
    SpeechData,
    RecognizeStream,
)
from livekit.agents.utils import AudioBuffer

logger = logging.getLogger("sarvam_stt")

class SarvamRecognizeStream(RecognizeStream):
    def __init__(
        self,
        *,
        stt: STT,
        conn_options,
        api_key: str,
        language: str,
    ):
        # Sarvam recommends 16kHz audio
        super().__init__(stt=stt, conn_options=conn_options, sample_rate=16000)
        self._api_key = api_key
        self._language = language
        self._pcm_buffer = bytearray()
        
    async def _run(self) -> None:
        async with aiohttp.ClientSession() as session:
            try:
                async for frame in self._input_ch:
                    if isinstance(frame, self._FlushSentinel):
                        if len(self._pcm_buffer) > 0:
                            # Process the accumulated audio chunk
                            await self._process_audio_chunk(session)
                            self._pcm_buffer.clear()
                    else:
                        # Accumulate PCM data (16-bit mono 16kHz)
                        self._pcm_buffer.extend(frame.data.cast("b"))
            except Exception as e:
                logger.error(f"Error in Sarvam STT stream: {e}")

    async def _process_audio_chunk(self, session: aiohttp.ClientSession):
        try:
            # 1. Convert PCM to WAV in memory
            wav_io = io.BytesIO()
            with wave.open(wav_io, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2) # 16-bit
                wf.setframerate(16000)
                wf.writeframes(self._pcm_buffer)
            
            wav_bytes = wav_io.getvalue()

            # 2. Prepare the multipart form data for Sarvam
            form = aiohttp.FormData()
            form.add_field('file', wav_bytes, filename='audio.wav', content_type='audio/wav')
            form.add_field('model', 'saaras:v3')
            form.add_field('language_code', self._language)
            form.add_field('mode', 'transcribe')

            headers = {
                'api-subscription-key': self._api_key
            }

            # 3. Post to Sarvam API
            async with session.post(
                "https://api.sarvam.ai/speech-to-text-translate",
                data=form,
                headers=headers
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    transcript = result.get("transcript", "").strip()
                    if transcript:
                        logger.info(f"[Sarvam STT] Transcript: {transcript}")
                        speech_data = SpeechData(language=self._language, text=transcript)
                        event = SpeechEvent(
                            type=SpeechEventType.FINAL_TRANSCRIPT,
                            alternatives=[speech_data]
                        )
                        self._event_ch.send_nowait(event)
                else:
                    err_text = await response.text()
                    logger.error(f"Sarvam STT failed with status {response.status}: {err_text}")

        except Exception as e:
            logger.error(f"Error processing audio for Sarvam STT: {e}")


class SarvamSTT(STT):
    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        language: Optional[str] = None,
        capabilities: Optional[STTCapabilities] = None,
    ):
        if capabilities is None:
            # We don't support interim results because we process full chunks
            capabilities = STTCapabilities(streaming=True, interim_results=False)
        super().__init__(capabilities=capabilities)
        self._api_key = api_key or os.environ.get("SARVAM_API_KEY")
        if not self._api_key:
            raise ValueError("SARVAM_API_KEY is required.")
        self._language = language or "te-IN"

    async def _recognize_impl(
        self,
        buffer: AudioBuffer,
        *,
        language: Optional[str],
        conn_options,
    ) -> SpeechEvent:
        raise NotImplementedError("Sarvam STT only supports streaming via RecognizeStream in this implementation.")

    def stream(
        self,
        *,
        language: Optional[str] = None,
        conn_options = None,
    ) -> RecognizeStream:
        if not language:
            language = self._language
            
        if conn_options is None:
            from livekit.agents import APIConnectOptions
            conn_options = APIConnectOptions()

        return SarvamRecognizeStream(
            stt=self,
            conn_options=conn_options,
            api_key=self._api_key,
            language=language
        )
