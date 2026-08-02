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

    // 2. Determine if questions already exist
    const { data: existingQuestions } = await supabase
      .from('fir_interview_questions')
      .select('*')
      .eq('fir_draft_id', draftId)

    if (existingQuestions && existingQuestions.length > 0) {
      return NextResponse.json({ success: true })
    }

    // 3. Call Gemini for Questions
    const prompt = `Incident type: ${draft.incident_type}
Sensitivity flag: ${draft.sensitivity_flag}
Current known facts: 
${JSON.stringify({
  complainant_name: draft.complainant_name,
  complainant_contact: draft.complainant_contact,
  incident_narrative: draft.incident_narrative,
  incident_date: draft.incident_date,
  incident_time: draft.incident_time,
  incident_location: draft.incident_location,
  involved_parties: draft.involved_parties
}, null, 2)}

Act as a trained investigating officer. Generate 3-5 follow-up questions specific to THIS incident type — not generic questions. Prioritize the most legally and investigatively critical questions first.

If sensitivity_flag is true, prepend a recommended_protocol string to the overall output (e.g. "Consider assigning a woman officer; offer complainant a support service referral") and ensure question tone is calm and non-interrogative throughout.

Output ONLY a JSON object matching this schema exactly:
{
  "recommended_protocol": "string | null",
  "questions": [
    {
      "question": "string (the actual question to ask)",
      "reason_for_asking": "string (one-line reason)",
      "field_key": "string (a key representing the topic, e.g. 'cctv', 'stolen_items')"
    }
  ]
}`

    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' })
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    })

    const responseText = result.response.text()
    const parsedResult = JSON.parse(responseText)

    // 4. Save recommended protocol if present
    if (parsedResult.recommended_protocol) {
      await supabase
        .from('fir_drafts')
        .update({ recommended_protocol: parsedResult.recommended_protocol })
        .eq('id', draftId)
    }

    // 5. Insert questions into DB
    if (parsedResult.questions && parsedResult.questions.length > 0) {
      const inserts = parsedResult.questions.map((q: any, i: number) => ({
        fir_draft_id: draftId,
        question: q.question,
        reason_for_asking: q.reason_for_asking,
        field_key: q.field_key,
        order_index: i
      }))

      const { error } = await supabase
        .from('fir_interview_questions')
        .insert(inserts)

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
