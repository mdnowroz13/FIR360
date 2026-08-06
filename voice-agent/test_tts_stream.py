import asyncio
import edge_tts

async def main():
    comm = edge_tts.Communicate("Hello", "en-IN-NeerjaNeural")
    # edge-tts returns mp3 chunks
    chunks = []
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            chunks.append(chunk["data"])
    print(f"Total audio bytes: {sum(len(c) for c in chunks)}")

asyncio.run(main())
