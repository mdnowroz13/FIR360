import os
import json
import logging
import re
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, JobProcess, WorkerOptions, cli, llm
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import openai, groq, silero
from supabase import create_client, Client
from livekit.agents.llm.fallback_adapter import FallbackAdapter
from sarvam_realtime_stt import SarvamRealtimeSTT
from sarvam_tts_provider import SarvamTTS

load_dotenv()
logger = logging.getLogger("voice-agent")

# Initialize Supabase
supabase_url = os.environ.get("SUPABASE_URL", "")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
supabase: Client = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

class FIRAssistantInterface(llm.FunctionContext):
    def __init__(self, draft_id: str):
        super().__init__()
        self.draft_id = draft_id
        self.flagged_fields = set()

    @llm.ai_callable(description="Saves the compiled initial statement or story narrated by the complainant.")
    def save_initial_statement(self, statement: str):
        logger.info(f"Saving initial statement: {statement}")
        if supabase and self.draft_id:
            try:
                supabase.table('fir_drafts').update({'raw_transcript': statement}).eq('id', self.draft_id).execute()
            except Exception as e:
                logger.error(f"Failed to save statement: {e}")
        return "Initial statement saved successfully."

    @llm.ai_callable(description="Updates an incident field or answer to an interview question.")
    def update_incident_field(self, field_name: str, value: str):
        self.flagged_fields.discard(field_name.lower())
        logger.info(f"Updating field {field_name} with {value}")
        if supabase and self.draft_id:
            # Here you would typically query the questions to find the matching ID and update its answer.
            pass
        return f"Updated {field_name} successfully."

    @llm.ai_callable(description="Flags a missing required field that needs to be asked about.")
    def flag_missing_field(self, field_name: str):
        self.flagged_fields.add(field_name.lower())
        logger.info(f"Flagged missing field: {field_name}")
        return f"Flagged {field_name}."

    @llm.ai_callable(description="Suggests a legal section based on the incident.")
    def suggest_legal_section(self, code: str, title: str, reason: str, confidence: str):
        logger.info(f"Suggested section {code}: {title}")
        return "Section suggested."

    @llm.ai_callable(description="Confirms the report with the officer and finalizes it.")
    async def confirm_and_finalize(self, officer_confirmed: bool = False):
        if len(self.flagged_fields) > 0:
            logger.warning(f"Prevented premature finalization. Unanswered fields: {self.flagged_fields}")
            return f"Error: You flagged missing fields {list(self.flagged_fields)} but never received an answer for them. You MUST ask the user these questions and wait for their answer before finalizing."
            
        if not officer_confirmed:
            logger.warning("Prevented finalization without explicit confirmation.")
            return "Error: The officer has not explicitly confirmed. You must verbally ask 'Do you confirm this report?' and set officer_confirmed to True when they reply."
            
        self.finalized = True
        logger.info("Report confirmed and finalized.")
        
        async def close_session():
            msg = "Thank you, your report has been successfully filed."
            # Provide simple translations for the closing message
            lang = getattr(self, "language_code", "en-IN")
            if lang.startswith("hi"): msg = "धन्यवाद, आपकी रिपोर्ट सफलतापूर्वक दर्ज कर ली गई है।"
            elif lang.startswith("bn"): msg = "ধন্যবাদ, আপনার রিপোর্ট সফলভাবে দায়ের করা হয়েছে।"
            elif lang.startswith("gu"): msg = "આભાર, તમારો રિપોર્ટ સફળતાપૂર્વક ફાઈલ થઈ ગયો છે."
            elif lang.startswith("ta"): msg = "நன்றி, உங்கள் அறிக்கை வெற்றிகரமாக பதிவு செய்யப்பட்டது."
            elif lang.startswith("te"): msg = "ధన్యవాదాలు, మీ రిపోర్ట్ విజయవంతంగా ఫైల్ చేయబడింది."
            
            import asyncio
            import json
            import livekit.rtc as rtc
            await self.agent.say(msg, allow_interruptions=False)
            await asyncio.sleep(4)
            # Send distinct success signal to frontend
            await self.room.local_participant.publish_data(
                payload=json.dumps({"type": "finalized"}).encode("utf-8"),
                reliable=True
            )
            await self.room.disconnect()
            
        import asyncio
        asyncio.create_task(close_session())
        return "Confirmed."

async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Get Draft ID and Language from participant metadata
    draft_id = None
    language_code = "en-IN"
    for p in ctx.room.remote_participants.values():
        if p.metadata:
            try:
                meta = json.loads(p.metadata)
                draft_id = meta.get("draftId")
                language_code = meta.get("language", "en-IN")
            except Exception:
                pass

    if not draft_id:
        logger.warning("No draft ID found in metadata!")

    initial_ctx = llm.ChatContext().append(
        role="system",
        text=(
            "You are a Voice Assistant for FIR360, a police FIR generation tool. "
            "You interview the officer or complainant to build a complete First Information Report. "
            "\n\nYOUR INTERVIEW WORKFLOW (follow this strictly):\n"
            "1. GREETING: Greet the user and ask them to narrate the incident in their own words.\n"
            "2. LISTEN PATIENTLY: Let the user speak their full account WITHOUT interrupting. "
            "Wait for them to finish completely (they will pause for several seconds). "
            "Do NOT call save_initial_statement after hearing just one or two words.\n"
            "3. SAVE STATEMENT: Only after the user has given a substantial account (at least 2-3 sentences), call save_initial_statement.\n"
            "4. GAP ANALYSIS: After saving, ask follow-up questions ONE AT A TIME to fill missing details like: "
            "location, date/time, suspect description, victim details, property involved, witnesses.\n"
            "5. LEGAL SECTIONS: Once you have enough facts, suggest relevant IPC/BNS sections.\n"
            "6. CONFIRMATION: Only after ALL gaps are filled AND you have explicitly read back a summary of the report, "
            "ask 'Do you confirm this report?' and wait for an explicit 'Yes' or 'Confirmed' or 'Okay' response.\n"
            "7. FINALIZE: Only then call confirm_and_finalize with officer_confirmed=True.\n"
            "\nCRITICAL RULES:\n"
            "- NEVER finalize after hearing just 'sir', 'okay', 'hmm', or any filler word during the interview. "
            "These are NOT confirmations — they are conversational fillers.\n"
            "- A confirmation ONLY counts if you have explicitly asked 'Do you confirm this report?' and the user said yes.\n"
            "- If you have flagged missing fields, you MUST ask about ALL of them before finalizing.\n"
            "- Be patient. Police officers and complainants take time to narrate incidents.\n"
            "- STT CORRECTION: STT systems often mishear Indic words (e.g., 'దంగల్ పడ్డారు' instead of 'దొంగలు పడ్డారు'). "
            "If a transcribed phrase sounds contextually or phonetically wrong, YOU MUST NOT assume it is correct. "
            "Instead, politely ask the user to clarify: 'క్షమించండి, ఆ మాట స్పష్టంగా వినిపించలేదు. దయచేసి మరోసారి చెప్పగలరా?' (Sorry, that word wasn't clear. Can you say it again?).\n"
            "\nFUNCTION CALLING RULES:\n"
            "- When you want to call a function (save_initial_statement, update_incident_field, etc.), "
            "use the TOOL/FUNCTION CALLING mechanism provided by the system. "
            "NEVER write function names, XML tags, JSON, or code in your spoken response.\n"
            "- Your spoken response must contain ONLY natural human speech — no tags, no brackets, no code.\n"
            "- ECHO DETECTION: Sometimes your own previous spoken words get picked up by the microphone "
            "and sent back to you as if the user said them. If the 'user' message looks identical or very similar "
            "to what you JUST said, IGNORE it completely — do not respond, do not call any functions. "
            "Just wait for the real user to speak.\n"
            f"\nLANGUAGE: The user selected '{language_code}'. "
            "You MUST speak and respond ONLY in this language. "
            "For 'hi-IN' use Hindi (Devanagari), 'te-IN' use Telugu, 'ta-IN' use Tamil, etc. "
            "Never reply in English unless the code is en-IN."
        ),
    )

    fnc_ctx = FIRAssistantInterface(draft_id=draft_id)
    fnc_ctx.language_code = language_code
    
    # Filter function-call artifacts from being spoken by TTS
    def _clean_tts_text(text: str) -> str:
        # Strip XML-style function call tags and their contents
        cleaned = re.sub(r'<[^>]+>.*?</[^>]+>', '', text, flags=re.DOTALL)
        # Strip any remaining standalone XML tags
        cleaned = re.sub(r'</?[a-zA-Z_][^>]*>', '', cleaned)
        # Strip JSON-like objects
        cleaned = re.sub(r'\{[^}]+\}', '', cleaned)
        # Clean up extra whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned

    def before_tts_cb(agent: VoicePipelineAgent, text):
        if isinstance(text, str):
            cleaned = _clean_tts_text(text)
            return cleaned if cleaned else ""
        else:
            # It's an async generator of LLM tokens — wrap it to filter each chunk
            async def _filter_stream():
                buffer = ""
                async for chunk in text:
                    buffer += chunk
                    # Only yield once we have a complete sentence or enough text
                    # Check if buffer contains any XML/JSON to strip
                    if '<' in buffer and '>' not in buffer:
                        continue  # wait for closing bracket
                    if '{' in buffer and '}' not in buffer:
                        continue  # wait for closing brace
                    cleaned = _clean_tts_text(buffer)
                    if cleaned:
                        yield cleaned
                    buffer = ""
                # Flush remaining buffer
                if buffer:
                    cleaned = _clean_tts_text(buffer)
                    if cleaned:
                        yield cleaned
            return _filter_stream()

    def before_llm_cb(agent: VoicePipelineAgent, chat_ctx: llm.ChatContext):
        # 1. Stop LLM synthesis if finalized
        if getattr(fnc_ctx, "finalized", False):
            return False
            
        # 2. Filter filler words to save TPM limit
        if len(chat_ctx.messages) > 0:
            last_msg = chat_ctx.messages[-1]
            if last_msg.role == "user" and type(last_msg.content) is str:
                text = last_msg.content.strip().lower()
                fillers = ["అ", "ఆ", "ఉం", "సార్", "హలో", "అ అ", "ah", "hmm", "sir", "hello", "ok", "okay"]
                if text in fillers:
                    logger.info(f"Skipping LLM call for filler word: {text}")
                    return False

        # 3. Truncate context for Groq TPM Limit (keep system + tools + last 6 conversational turns)
        if len(chat_ctx.messages) > 8:
            retained = []
            recent = chat_ctx.messages[-6:]
            for i, msg in enumerate(chat_ctx.messages):
                if i == 0 or msg.role == "tool" or getattr(msg, "tool_calls", None):
                    if msg not in recent:
                        retained.append(msg)
            chat_ctx.messages = retained + recent

        # 3. Create stream and attach error monitor for mid-session failure
        stream = agent.llm.chat(chat_ctx=chat_ctx, fnc_ctx=agent.fnc_ctx)
        
        def on_stream_done(t):
            import asyncio
            try:
                t.result()
            except asyncio.CancelledError:
                # Normal behavior when interrupted by user speaking
                pass
            except Exception as e:
                logger.error(f"LLM failed mid-session: {e}")
                asyncio.create_task(ctx.room.disconnect())
                
        stream._task.add_done_callback(on_stream_done)
        return stream

    # Setup LLMs (Groq as Primary — fast for real-time voice, NVIDIA as Fallback — larger model)
    primary_llm = groq.LLM(
        api_key=os.environ.get("GROQ_API_KEY"),
        model="llama-3.1-8b-instant"
    )
    import openai as oai_client
    fallback_llm = openai.LLM(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=os.environ.get("NVIDIA_API_KEY"),
        model="meta/llama-3.3-70b-instruct",
        client=oai_client.AsyncClient(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=os.environ.get("NVIDIA_API_KEY"),
            timeout=10.0
        )
    )
    
    # Groq FIRST (fast, reliable), NVIDIA as fallback (larger but slower)
    llm_instance = FallbackAdapter(
        llm=[primary_llm, fallback_llm],
        attempt_timeout=10.0,
        max_retry_per_llm=1
    )

    # Setup STT — Sarvam AI STT
    stt_instance = SarvamRealtimeSTT(language=language_code)
    logger.info(f"Using Sarvam Realtime STT for language: {language_code}")

    agent = VoicePipelineAgent(
        vad=silero.VAD.load(),
        stt=stt_instance,
        llm=llm_instance,
        tts=SarvamTTS(language=language_code),
        chat_ctx=initial_ctx,
        fnc_ctx=fnc_ctx,
        min_endpointing_delay=1.5,
        max_endpointing_delay=4.0,
        max_nested_fnc_calls=5,
        before_llm_cb=before_llm_cb,
        before_tts_cb=before_tts_cb,
    )
    
    fnc_ctx.agent = agent
    fnc_ctx.room = ctx.room

    agent.start(ctx.room, participant=None)

    # Give an initial greeting based on language
    greeting = "Hello. I am the FIR360 voice assistant. Please state the details of the incident."
    if language_code.startswith("hi"):
        greeting = "नमस्ते। मैं FIR360 वॉयस असिस्टेंट हूँ। कृपया घटना का विवरण बताएं।"
    elif language_code.startswith("bn"):
        greeting = "নমস্কার। আমি FIR360 ভয়েস অ্যাসিস্ট্যান্ট। অনুগ্রহ করে ঘটনার বিবরণ দিন।"
    elif language_code.startswith("gu"):
        greeting = "નમસ્તે. હું FIR360 વોઇસ આસિસ્ટન્ટ છું. કૃપા કરીને ઘટનાની વિગતો જણાવો."
    elif language_code.startswith("ta"):
        greeting = "வணக்கம். நான் FIR360 குரல் உதவியாளர். சம்பவத்தின் விவரங்களைக் கூறவும்."
    elif language_code.startswith("te"):
        greeting = "నమస్కారం. నేను FIR360 వాయిస్ అసిస్టెంట్. దయచేసి సంఘటన వివరాలను చెప్పండి."
    
    await agent.say(greeting, allow_interruptions=True)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
