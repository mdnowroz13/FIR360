import asyncio
import base64
import io
import json
import logging
import os
import wave
import uuid
import aiohttp

from typing import Optional

from livekit import rtc
from livekit.agents.tts import (
    TTS,
    TTSCapabilities,
    ChunkedStream,
    SynthesizedAudio,
)

logger = logging.getLogger("sarvam_tts")

class SarvamChunkedStream(ChunkedStream):
    def __init__(self, tts: TTS, input_text: str, api_key: str, language: str):
        super().__init__(tts=tts, input_text=input_text)
        self._api_key = api_key
        self._language = language

    async def _run(self) -> None:
        if not self._input_text.strip():
            return

        payload = {
            "text": self._input_text,
            "language_code": self._language,
            "speaker": "priya",
            "model": "bulbul:v3",
            "output_audio_codec": "linear16",
            "speech_sample_rate": 16000,
            "enable_preprocessing": True
        }

        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    "https://api.sarvam.ai/text-to-speech/stream",
                    json=payload,
                    headers={
                        "api-subscription-key": self._api_key,
                        "Content-Type": "application/json"
                    }
                ) as response:
                    if response.status == 200:
                        request_id = str(uuid.uuid4())
                        leftover = b""
                        
                        # Read binary chunks as they arrive, buffering to
                        # ensure each AudioFrame has an even byte count (int16)
                        async for chunk in response.content.iter_chunked(4096):
                            data = leftover + chunk
                            # Keep any trailing odd byte for next iteration
                            usable = len(data) - (len(data) % 2)
                            if usable == 0:
                                leftover = data
                                continue
                            leftover = data[usable:]
                            pcm = data[:usable]
                            
                            audio_frame = rtc.AudioFrame(
                                data=pcm,
                                sample_rate=16000,
                                num_channels=1,
                                samples_per_channel=len(pcm) // 2
                            )
                            synthesized = SynthesizedAudio(
                                frame=audio_frame,
                                request_id=request_id
                            )
                            self._event_ch.send_nowait(synthesized)
                        
                        # Flush any remaining leftover (should be 0 or 1 byte)
                        if len(leftover) >= 2:
                            usable = len(leftover) - (len(leftover) % 2)
                            pcm = leftover[:usable]
                            audio_frame = rtc.AudioFrame(
                                data=pcm,
                                sample_rate=16000,
                                num_channels=1,
                                samples_per_channel=len(pcm) // 2
                            )
                            self._event_ch.send_nowait(SynthesizedAudio(
                                frame=audio_frame,
                                request_id=request_id
                            ))
                    else:
                        err_msg = await response.text()
                        logger.error(f"Sarvam TTS failed with status {response.status}: {err_msg}")
            except Exception as e:
                logger.error(f"Error in Sarvam TTS stream: {e}")


class SarvamTTS(TTS):
    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        language: Optional[str] = None,
    ):
        capabilities = TTSCapabilities(streaming=False)
        # We request 16000 Hz from Sarvam's linear16 streaming endpoint
        super().__init__(capabilities=capabilities, sample_rate=16000, num_channels=1)
        
        self._api_key = api_key or os.environ.get("SARVAM_API_KEY")
        if not self._api_key:
            raise ValueError("SARVAM_API_KEY is required.")
        self._language = language or "te-IN"

    def synthesize(self, text: str, *, conn_options=None) -> ChunkedStream:
        return SarvamChunkedStream(
            tts=self,
            input_text=text,
            api_key=self._api_key,
            language=self._language
        )
