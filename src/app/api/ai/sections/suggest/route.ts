import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { BNS_REFERENCE } from '@/data/bns_reference'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '')

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

    if (draft.ai_suggested_sections && draft.ai_suggested_sections.length > 0) {
      return NextResponse.json({ success: true, sections: draft.ai_suggested_sections })
    }

    const prompt = `Given the finalized incident narrative and details:
${JSON.stringify({
  narrative: draft.incident_narrative,
  type: draft.incident_type,
  additional_details: draft.additional_details
})}

And this reference context of legal section summaries:
${JSON.stringify(BNS_REFERENCE, null, 2)}

Suggest applicable section(s) for this FIR.
For EACH suggestion output:
{ "code": "string", "title": "string", "reason": "string (plain language, tied specifically to details in this narrative — not generic)", "confidence": "high|medium|low" }

Do not merge multiple sections into one blob — each must be independently reviewable.

Output ONLY a JSON array of these objects:
[
  { "code": "...", "title": "...", "reason": "...", "confidence": "..." }
]
`
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' })
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    })

    const responseText = result.response.text()
    const sections = JSON.parse(responseText)

    const { error } = await supabase
      .from('fir_drafts')
      .update({ ai_suggested_sections: sections })
      .eq('id', draftId)

    if (error) throw new Error('Failed to save suggested sections')

    return NextResponse.json({ success: true, sections })

  } catch (error) {
    console.error('Error suggesting sections:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { draftId, confirmedSections } = await request.json()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('fir_drafts')
      .update({ officer_confirmed_sections: confirmedSections })
      .eq('id', draftId)

    if (error) throw new Error('Failed to save confirmed sections')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error confirming sections:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
