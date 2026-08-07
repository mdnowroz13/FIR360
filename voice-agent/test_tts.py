import os
import urllib.request
import json
from dotenv import load_dotenv

load_dotenv()

def test_tts():
    url = "https://api.sarvam.ai/text-to-speech"
    payload = {
        "inputs": ["నమస్కారం"],
        "target_language_code": "te-IN",
        "speaker": "anushka",
        "pitch": 0,
        "pace": 1.0,
        "loudness": 1.5,
        "speech_sample_rate": 8000,
        "enable_preprocessing": True,
        "model": "bulbul:v3"
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'api-subscription-key': os.getenv('SARVAM_API_KEY'),
            'Content-Type': 'application/json'
        }
    )
    
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read().decode('utf-8'))
        print("Success! Keys in response:", result.keys())
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")

test_tts()
