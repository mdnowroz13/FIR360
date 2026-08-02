import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '')

export async function POST(request: Request) {
  try {
    const { draftId } = await request.json()
    const supabase = await createClient()

    // 1. Verify user & get draft
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

    // 2. Fetch answered questions
    const { data: questions } = await supabase
      .from('fir_interview_questions')
      .select('*')
      .eq('fir_draft_id', draftId)
      .eq('answered', true)

    if (!questions || questions.length === 0) {
      return NextResponse.json({ success: true }) // Nothing new to extract
    }

    const qaPairs = questions.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n\n')

    // 3. Call Gemini to merge new facts
    const prompt = `You are updating a structured incident record with newly gathered facts.
    
Current Record:
${JSON.stringify({
  complainant_name: draft.complainant_name,
  complainant_contact: draft.complainant_contact,
  complainant_address: draft.complainant_address,
  incident_narrative: draft.incident_narrative,
  incident_date: draft.incident_date,
  incident_time: draft.incident_time,
  incident_location: draft.incident_location,
  involved_parties: draft.involved_parties,
  additional_details: draft.additional_details || {}
}, null, 2)}

New Interview Q&A:
${qaPairs}

Task: Update the JSON structure by integrating the new facts from the Q&A into the appropriate fields. If a fact doesn't neatly fit into a specific column (like date/time/location), integrate it smoothly into the "incident_narrative" or put it in the "additional_details" JSON object.
Maintain chronological order in the narrative if you update it.
Do not invent anything not stated.

Output ONLY valid JSON matching this schema exactly:
{
  "complainant_name": "string | null",
  "complainant_contact": "string | null",
  "complainant_address": "string | null",
  "incident_narrative": "string | null",
  "incident_date": "YYYY-MM-DD | null",
  "incident_time": "HH:MM:SS | null",
  "incident_location": "string | null",
  "involved_parties": [{"name": "string", "role": "string", "address": "string"}],
  "additional_details": {"key": "value"}
}`

    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' })
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json'
      }
    })

    const responseText = result.response.text()
    const updatedData = JSON.parse(responseText)

    // 4. Save updated facts
    const { error } = await supabase
      .from('fir_drafts')
      .update({
        complainant_name: updatedData.complainant_name,
        complainant_contact: updatedData.complainant_contact,
        complainant_address: updatedData.complainant_address,
        incident_narrative: updatedData.incident_narrative,
        incident_date: updatedData.incident_date,
        incident_time: updatedData.incident_time,
        incident_location: updatedData.incident_location,
        involved_parties: updatedData.involved_parties,
        additional_details: updatedData.additional_details
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
