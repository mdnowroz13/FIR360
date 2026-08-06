import asyncio
import io
import logging
import shutil
import uuid
from typing import AsyncGenerator
from dataclasses import dataclass

from pydub import AudioSegment
import edge_tts

from livekit.agents import tts
from livekit.rtc import AudioFrame

logger = logging.getLogger("edge-tts-provider")

# Map supported language codes to Edge TTS Male Neural voices
MALE_VOICE_MAP = {
    "en-IN": "en-IN-PrabhatNeural",
    "hi-IN": "hi-IN-MadhurNeural",
    "bn-IN": "bn-IN-BashkarNeural",
    "gu-IN": "gu-IN-NiranjanNeural",
    "kn-IN": "kn-IN-GaganNeural",
    "ml-IN": "ml-IN-MidhunNeural",
    "mr-IN": "mr-IN-ManoharNeural",
    "ta-IN": "ta-IN-ValluvarNeural",
    "te-IN": "te-IN-MohanNeural",
}

@dataclass
class _TTSOptions:
    voice: str

class EdgeTTS(tts.TTS):
    def __init__(self, language_code: str = "hi-IN"):
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=False),
            sample_rate=24000,
            num_channels=1
        )
        
        # Verify ffmpeg is installed (required by pydub for MP3 decoding)
        if not shutil.which("ffmpeg"):
            logger.error("FFmpeg not found! pydub requires ffmpeg to decode edge-tts MP3 chunks.")
            raise RuntimeError(
                "FFmpeg is not installed or not in PATH.\n"
                "Please install FFmpeg to use Edge TTS:\n"
                "Windows: Run 'winget install ffmpeg' in PowerShell as Administrator.\n"
                "Mac: Run 'brew install ffmpeg'\n"
                "Linux: Run 'sudo apt install ffmpeg'"
            )
            
        # Get the corresponding male voice, default to Hindi if unknown
        voice = MALE_VOICE_MAP.get(language_code, "hi-IN-MadhurNeural")
        self._opts = _TTSOptions(voice=voice)
        logger.info(f"Initialized EdgeTTS with voice: {self._opts.voice}")

    def synthesize(self, text: str) -> tts.ChunkedStream:
        return EdgeTTSStream(self, text, self._opts)

class EdgeTTSStream(tts.ChunkedStream):
    def __init__(self, tts_instance: tts.TTS, text: str, opts: _TTSOptions):
        super().__init__(tts=tts_instance, input_text=text)
        self._text = text
        self._opts = opts
        # We start the communicate stream and iterate through it asynchronously
        self._comm = edge_tts.Communicate(text, opts.voice)
        self._stream = self._comm.stream()
        self._buffer = io.BytesIO()

    async def _run(self) -> None:
        # Edge TTS streams the MP3 chunks. LiveKit Agents TTS pipeline expects 
        # small raw PCM frames to be yielded. To avoid complex async pydub streaming,
        # we will gather the full sentence audio first, then decode and yield it.
        # This is acceptable because we set streaming=False in TTSCapabilities,
        # which means LiveKit won't call this for incomplete sentences, it'll pass whole chunks.
        
        has_data = False
        try:
            logger.info(f"Starting edge-tts synthesis for text: '{self._text[:50]}...'")
            async for chunk in self._stream:
                if chunk["type"] == "audio":
                    self._buffer.write(chunk["data"])
                    has_data = True
        except Exception as e:
            logger.error(f"Error during edge-tts stream: {e}", exc_info=True)
            return
            
        if not has_data:
            logger.warning("edge-tts returned no audio data!")
            return
            
        audio_size = self._buffer.tell()
        logger.info(f"Successfully received {audio_size} bytes of MP3 data from edge-tts.")
        
        # Decode MP3 to raw PCM (16-bit, 24kHz, mono to match typical LiveKit standards)
        try:
            self._buffer.seek(0)
            audio_segment = AudioSegment.from_file(self._buffer, format="mp3")
            # Force target parameters to ensure compatibility with AudioFrame
            audio_segment = audio_segment.set_frame_rate(24000).set_channels(1).set_sample_width(2)
            raw_pcm = audio_segment.raw_data
            
            # Create a LiveKit AudioFrame
            samples_per_channel = len(raw_pcm) // 2  # 16-bit = 2 bytes per sample
            audio_frame = AudioFrame(
                data=raw_pcm,
                sample_rate=24000,
                num_channels=1,
                samples_per_channel=samples_per_channel,
            )
            
            # Yield the synthesized audio chunk back to the pipeline
            frame_duration = (samples_per_channel / 24000) * 1000
            logger.info(f"Successfully decoded PCM. Yielding AudioFrame: {samples_per_channel} samples, 24kHz, 1 channel ({frame_duration:.1f}ms)")
            
            self._event_ch.send_nowait(tts.SynthesizedAudio(
                request_id=uuid.uuid4().hex,
                frame=audio_frame
            ))
        except Exception as e:
            logger.error(f"Failed to decode audio with pydub (is ffmpeg installed?): {e}", exc_info=True)
