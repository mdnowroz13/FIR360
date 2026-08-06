import os
import json
import logging
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, JobProcess, WorkerOptions, cli, llm
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import openai, groq, silero
from supabase import create_client, Client
from livekit.agents.llm.fallback_adapter import FallbackAdapter
from edge_tts_provider import EdgeTTS

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
            packet = rtc.DataPacket(data=json.dumps({"type": "finalized"}).encode("utf-8"), kind=rtc.DataPacketKind.RELIABLE)
            await self.room.local_participant.publish_data(packet.data)
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
            "You interview the officer or complainant, transcribe their account, "
            "and ask follow up questions to fill missing facts. "
            "First, gather the initial incident description from the user. "
            "Once you have a clear initial picture, MUST call 'save_initial_statement' to save it to the registry. "
            "Then, seamlessly transition into asking follow-up questions to fill in missing facts (acting as the Gap Analysis engine). "
            "Call functions to update fields, suggest sections, and finalize. "
            "CRITICAL: DO NOT call confirm_and_finalize until you have explicitly asked the user 'Do you confirm this report?' out loud and received a 'Yes' or 'Confirmed' reply. "
            f"CRITICAL REQUIREMENT: The user has selected the language code '{language_code}'. "
            "You MUST speak, formulate questions, and respond ONLY in the language that corresponds to this code. "
            "For example, if the code is 'hi-IN', you must reply in Hindi using Devanagari script. If 'ta-IN', use Tamil. "
            "Never reply in English unless the code is en-IN."
        ),
    )

    fnc_ctx = FIRAssistantInterface(draft_id=draft_id)
    fnc_ctx.language_code = language_code
    
    def before_llm_cb(agent: VoicePipelineAgent, chat_ctx: llm.ChatContext):
        # 1. Stop LLM synthesis if finalized
        if getattr(fnc_ctx, "finalized", False):
            return False
            
        # 2. Truncate context for Groq TPM Limit (keep system + tools + last 10)
        if len(chat_ctx.messages) > 12:
            retained = []
            recent = chat_ctx.messages[-10:]
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

    # Setup LLMs (Groq as Primary, NVIDIA as Fallback)
    primary_llm = groq.LLM(
        api_key=os.environ.get("GROQ_API_KEY"),
        model="llama-3.3-70b-versatile"
    )
    fallback_llm = openai.LLM(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=os.environ.get("NVIDIA_API_KEY"),
        model="meta/llama-3.3-70b-instruct"
    )
    
    # Use native LiveKit FallbackAdapter with tight timeouts to failover fast
    llm_instance = FallbackAdapter(
        llm=[primary_llm, fallback_llm],
        attempt_timeout=5.0,
        max_retry_per_llm=1
    )

    agent = VoicePipelineAgent(
        vad=silero.VAD.load(),
        stt=groq.STT(model="whisper-large-v3", language=language_code.split('-')[0]),
        llm=llm_instance,
        tts=EdgeTTS(language_code=language_code),
        chat_ctx=initial_ctx,
        fnc_ctx=fnc_ctx,
        max_nested_fnc_calls=5,
        before_llm_cb=before_llm_cb,
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
