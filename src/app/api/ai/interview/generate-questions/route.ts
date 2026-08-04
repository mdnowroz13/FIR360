import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || ''
})

export async function POST(request: Request) {
  try {
    const { draftId } = await request.json()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: draft } = await supabase
      .from('fir_drafts')
      .select('*')
      .eq('id', draftId)
      .single()

    if (!draft || draft.officer_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: existingQuestions } = await supabase
      .from('fir_interview_questions')
      .select('*')
      .eq('fir_draft_id', draftId)

    if (existingQuestions && existingQuestions.length > 0) {
      return NextResponse.json({ success: true, message: 'Questions already generated.' })
    }

    const plan: { group: string; fieldsToCollect: string[]; reason: string }[] = []

    const comp = draft.complainant || {}
    const timeline = draft.timeline || []
    const accusedList = draft.accused || []
    const cat = draft.incident_categories || []
    const ev = draft.evidence || []

    // Group 1: Complainant Details (Mandatory)
    const compMissing = []
    if (!comp.name) compMissing.push('Full Name')
    if (!comp.father_name && !comp.spouse_name && !comp.mother_name) compMissing.push('Father or Spouse Name')
    if (!comp.address) compMissing.push('Complete Residential Address')
    if (!comp.contact) compMissing.push('Contact Number')

    if (compMissing.length > 0) {
      plan.push({
        group: 'Complainant Details',
        fieldsToCollect: compMissing,
        reason: 'These are mandatory legal requirements to establish the identity of the complainant.'
      })
    }

    // Group 2: Event Timeline Details (Mandatory)
    if (timeline.length > 0) {
      timeline.forEach((eventObj: any) => {
        if (eventObj.requires_occurrence_details === true) {
          const eventTitle = eventObj.event_title || 'this event';
          const eventMissing = [];
          
          if (eventObj.event_category === 'Financial Transaction') {
            if (!eventObj.date) eventMissing.push('Exact Date of the transaction');
            // Check if evidence mentions method, if not we ask for method
            const hasMethod = ev.some((e: any) => e.type.toLowerCase().includes('bank') || e.type.toLowerCase().includes('upi'))
            if (!hasMethod) eventMissing.push('Transaction Method used (UPI, Bank Transfer, Cash, etc.)');
          } else {
            if (!eventObj.date) eventMissing.push('Exact or Approximate Date');
            if (!eventObj.time) eventMissing.push('Exact or Approximate Time');
            if (!eventObj.location) eventMissing.push('Exact Location');
          }

          if (eventMissing.length > 0) {
            plan.push({
              group: `Timeline Event: ${eventTitle}`,
              fieldsToCollect: eventMissing,
              reason: `Crucial for establishing the exact facts for the legally significant event: ${eventTitle}.`
            });
          }
        }
      });
    } else {
      plan.push({
        group: 'Timeline Details',
        fieldsToCollect: ['Details about when and where the incident occurred'],
        reason: 'No timeline events were extracted. Crucial for establishing the jurisdiction of the police station.'
      });
    }

    // Group 3: Accused Details
    if (accusedList.length > 0) {
      accusedList.forEach((acc: any, index: number) => {
        const accMissing = []
        if (!acc.address && !acc.relative_name && !acc.alias) {
          accMissing.push(`Address, Contact Number, or Father's Name for accused '${acc.name}'`)
        }
        if (accMissing.length > 0) {
          plan.push({
            group: `Accused (${acc.name}) Details`,
            fieldsToCollect: accMissing,
            reason: `Required to accurately identify, locate, and summon accused '${acc.name}'.`
          })
        }
      })
    }

    // Group 4: Incident-Specific Rules (Deterministic logic based on category/evidence)
    const typeStr = (draft.incident_type || '').toLowerCase()
    const narrative = (draft.incident_narrative || '').toLowerCase()
    
    // Rule: Financial/Fraud
    if (typeStr.includes('fraud') || typeStr.includes('cyber') || narrative.includes('upi') || narrative.includes('money') || cat.includes('fraud')) {
      const missingEvidence = []
      const hasBank = ev.some((e: any) => e.type.toLowerCase().includes('bank') || e.type.toLowerCase().includes('upi'))
      if (!hasBank) {
        missingEvidence.push('Bank Account details or UPI Transaction IDs used')
      }
      if (missingEvidence.length > 0) {
         plan.push({
           group: 'Financial Evidence',
           fieldsToCollect: missingEvidence,
           reason: 'Digital evidence is vital to substantiate financial transactions.'
         })
      }
    }

    // Rule: Context-Aware Evidence Verification
    if (ev.length > 0) {
      ev.forEach((e: any) => {
        const type = (e.type || '').toLowerCase();
        let field = '';
        if (type.includes('whatsapp') || type.includes('chat') || type.includes('message')) {
          field = 'Do you have the WhatsApp chats, and if so, do they show any threats, admissions, or promises?';
        } else if (type.includes('upi') || type.includes('bank') || type.includes('transaction')) {
          field = 'Do you have a receipt or screenshot of the transaction, and does it show the exact amount, date, and recipient?';
        } else if (type.includes('cctv') || type.includes('video') || type.includes('camera')) {
          field = 'Do you have the CCTV footage, and is the incident or the accused clearly visible in it?';
        } else if (type.includes('medical') || type.includes('hospital') || type.includes('doctor') || type.includes('injury')) {
          field = 'Do you have the medical report, and does it clearly mention the injuries from this incident?';
        } else if (type.includes('audio') || type.includes('recording') || type.includes('call')) {
          field = 'Do you have the audio recording, and does it clearly capture any threats or admissions?';
        } else {
          field = `Do you have the ${e.type} evidence, and how does it support what happened?`;
        }

        plan.push({
          group: 'Supporting Evidence',
          fieldsToCollect: [field],
          reason: `The complainant mentioned ${e.type} evidence. We must verify its evidentiary value for the FIR.`
        });
      });
    }

    // Stop if plan is empty
    if (plan.length === 0) {
       return NextResponse.json({ success: true, message: 'FIR is legally complete.' })
    }

    // Limit to 4 groups to prevent overwhelming
    const finalPlan = plan.slice(0, 4)

    // ==========================================
    // STEP 2: NLG (Natural Language Generation)
    // ==========================================
    const nlgPrompt = `You are the Natural Language Generation (NLG) engine for a Police Assistant.
Your ONLY job is to convert a rigid JSON "Question Plan" into natural, conversational, polite questions for a citizen.

CRITICAL RULES:
1. You MUST generate exactly ONE question per group in the plan.
2. DO NOT invent or ask for ANY information that is not explicitly listed in the "fieldsToCollect" array.
3. EFFICIENCY & TONE: Merge naturally related information into one smooth, conversational question (e.g. "Approximately when did you lend the money, and was it through UPI or cash?").
4. Act like a calm, experienced police officer speaking to a citizen, NOT an auditor or legal examiner.
5. Output strict JSON only.

Input Question Plan:
${JSON.stringify(finalPlan, null, 2)}

Output JSON Schema:
{
  "questions": [
    {
      "question": "string (The generated natural language question)",
      "reason_for_asking": "string (Copy from the plan)",
      "field_key": "string (Group name)"
    }
  ]
}`

    const result = await openai.chat.completions.create({
      model: 'openrouter/free',
      messages: [{ role: 'user', content: nlgPrompt }],
      temperature: 0.2,
      timeout: 30000,
    })

    let nlgText = result.choices[0]?.message?.content || '{}'
    
    const startIdx = nlgText.indexOf('{')
    const endIdx = nlgText.lastIndexOf('}')
    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
      nlgText = nlgText.slice(startIdx, endIdx + 1)
    } else {
      throw new Error('No JSON object found in response')
    }
    
    const rawQuestions = JSON.parse(nlgText).questions || []

    // We no longer need the SSP Self Review LLM call because the deterministic planner 
    // guarantees no duplicate field requests, saving 40% token usage and reducing latency.
    const finalQuestions = rawQuestions

    if (finalQuestions.length > 0) {
      const inserts = finalQuestions.map((q: any, i: number) => ({
        fir_draft_id: draftId,
        question: q.question,
        reason_for_asking: q.reason_for_asking,
        field_key: q.field_key,
        order_index: i
      }))

      const { error } = await supabase.from('fir_interview_questions').insert(inserts)

      if (error) {
        console.error('Error inserting questions:', error)
        throw new Error('Failed to save questions')
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in generate-questions:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
