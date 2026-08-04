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

    // 1. Fetch draft (baseline facts)
    const { data: draft } = await supabase
      .from('fir_drafts')
      .select('*')
      .eq('id', draftId)
      .single()

    if (!draft || draft.officer_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // 2. Fetch answered questions
    const { data: qas } = await supabase
      .from('fir_interview_questions')
      .select('*')
      .eq('fir_draft_id', draftId)
      .eq('answered', true)

    if (!qas || qas.length === 0) {
      return NextResponse.json({ success: true, message: 'No new answers to extract.' })
    }

    const qaText = qas.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n')

    const prompt = `You are a Fact Extraction Engine.
Your task is to merge newly provided answers into the existing structured FIR facts.

EXISTING FACTS:
${JSON.stringify({
  complainant: draft.complainant,
  accused: draft.accused,
  witnesses: draft.witnesses,
  property: draft.property,
  evidence: draft.evidence,
  timeline: draft.timeline,
  incident_categories: draft.incident_categories
}, null, 2)}

NEW ANSWERS PROVIDED BY COMPLAINANT:
${qaText}

INSTRUCTIONS:
1. Extract facts from the NEW ANSWERS.
2. Update or append these facts to the EXISTING FACTS.
3. If an answer provides a missing name, age, or address, update the respective object.
4. If an answer provides new evidence, append it to the evidence array.
5. If an answer clarifies the timeline, append or update the timeline array.
6. For any new timeline event, classify it into: 'Criminal Act', 'Financial Transaction', 'Behaviour', 'Observation', 'Communication', 'Administrative Event', or 'Supporting Fact'.
7. CRITICAL RULES FOR requires_occurrence_details:
   - Criminal Act: MUST be true.
   - Financial Transaction: MUST be true.
   - Behaviour / Observation / Communication / Administrative Event / Supporting Fact: MUST be false unless it forms the core corpus delicti.
8. Output ONLY the merged, complete JSON object exactly matching the existing schema.

SCHEMA:
{
  "complainant": {
    "name": "string | null",
    "father_name": "string | null",
    "mother_name": "string | null",
    "spouse_name": "string | null",
    "age": "number | null",
    "dob": "YYYY-MM-DD | null",
    "gender": "string | null",
    "occupation": "string | null",
    "address": "string | null",
    "id_details": "string | null"
  },
  "accused": [
    {
      "name": "string",
      "alias": "string | null",
      "relative_name": "string | null",
      "address": "string | null"
    }
  ],
  "property": [
    {
      "category": "string",
      "type": "string",
      "description": "string",
      "estimated_value": "number | null"
    }
  ],
  "witnesses": [
    {
      "name": "string",
      "address": "string | null",
      "contact": "string | null"
    }
  ],
  "evidence": [
    {
      "type": "string (e.g. UPI, WhatsApp, CCTV)",
      "description": "string"
    }
  ],
  "timeline": [
    {
      "event_title": "string",
      "event_category": "Criminal Act | Financial Transaction | Behaviour | Observation | Communication | Administrative Event | Supporting Fact",
      "requires_occurrence_details": true,
      "date": "string | null",
      "time": "string | null",
      "location": "string | null",
      "actors": ["string"]
    }
  ],
  "incident_categories": ["string"]
}

Return ONLY valid JSON. Do not include markdown blocks.`

    const result = await openai.chat.completions.create({
      model: 'openrouter/free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      timeout: 30000,
    })

    let responseText = result.choices[0]?.message?.content || '{}'
    
    const startIdx = responseText.indexOf('{')
    const endIdx = responseText.lastIndexOf('}')
    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
      responseText = responseText.slice(startIdx, endIdx + 1)
    } else {
      throw new Error('No JSON object found in response')
    }

    const updatedData = JSON.parse(responseText)

    const { error } = await supabase
      .from('fir_drafts')
      .update({
        complainant: updatedData.complainant,
        accused: updatedData.accused,
        witnesses: updatedData.witnesses || [],
        evidence: updatedData.evidence || [],
        timeline: updatedData.timeline || [],
        property: updatedData.property,
        incident_categories: updatedData.incident_categories || []
      })
      .eq('id', draftId)

    if (error) {
      console.error('Update error:', error)
      throw new Error('Failed to update draft')
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in extract:', error)
    return NextResponse.json({ error: 'Failed to extract' }, { status: 500 })
  }
}
