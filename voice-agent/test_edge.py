import asyncio
import edge_tts

async def main():
    voices = await edge_tts.list_voices()
    indian_voices = [v for v in voices if 'IN' in v['Locale']]
    for v in indian_voices:
        print(f"{v['Locale']}: {v['ShortName']}")

asyncio.run(main())
