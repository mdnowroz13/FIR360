import os
import aiohttp
import asyncio
import wave
import io
from dotenv import load_dotenv

load_dotenv()

async def test():
    wav_io = io.BytesIO()
    with wave.open(wav_io, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(b'\x00' * 32000) # 1 sec silent audio
    
    form = aiohttp.FormData()
    form.add_field('file', wav_io.getvalue(), filename='audio.wav', content_type='audio/wav')
    form.add_field('model', 'saaras:v3')
    form.add_field('language_code', 'te-IN')
    form.add_field('mode', 'transcribe')
    
    async with aiohttp.ClientSession() as session:
        api_key = os.getenv('SARVAM_API_KEY')
        print(f"API Key found: {bool(api_key)}")
        async with session.post(
            'https://api.sarvam.ai/speech-to-text-translate', 
            data=form, 
            headers={'api-subscription-key': api_key}
        ) as resp:
            print(f"Status: {resp.status}")
            print(await resp.text())

asyncio.run(test())
