import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { retrieveRelevantLegalReferences } from '@/lib/retriever'
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

    if (draft.ai_suggested_sections && draft.ai_suggested_sections.length > 0) {
      return NextResponse.json({ success: true, sections: draft.ai_suggested_sections, incident_analysis: draft.incident_analysis || [] })
    }

    const facts = {
      complainant: draft.complainant || {},
      accused: draft.accused || [],
      witnesses: draft.witnesses || [],
      evidence: draft.evidence || [],
      timeline: draft.timeline || [],
      property: draft.property || [],
      incident_categories: draft.incident_categories || [],
      raw_transcript: draft.raw_transcript
    }

    const topLegalReferences = retrieveRelevantLegalReferences(facts)

    const prompt = `You are an expert Unified Narrative and Legal Agent for the Indian Police.
Your task is to draft the FIR Tehrir (Incident Narrative) AND perform an event-by-event legal analysis.

Facts (Structured JSON):
${JSON.stringify(facts, null, 2)}

Top Relevant Legal References:
${JSON.stringify(topLegalReferences, null, 2)}

CRITICAL INSTRUCTIONS:
1. "incident_narrative": Draft a highly professional, chronological, continuous prose Tehrir addressed to the SHO based strictly on the facts. Do not use bullets. Use standard police shorthand (S/o, D/o).
2. "incident_analysis": Break down the timeline into individual criminal events. For EACH event, classify the factual act (e.g., "Financial Transaction", "Criminal Intimidation").
3. "sections": Map the factual acts in the analysis to the provided Legal References. Output candidate sections with reasoning. Never assume legal conclusions without factual ingredients.

Output ONLY a valid JSON object exactly matching this schema:
{
  "incident_narrative": "string (The continuous prose Tehrir)",
  "incident_analysis": [
    {
      "event": "string",
      "classification": "string",
      "recommended_sections": ["string (section codes)"]
    }
  ],
  "sections": [
    { 
      "code": "string", 
      "title": "string", 
      "reason": "string (Event-specific reasoning)", 
      "confidence": "high|medium|low" 
    }
  ]
}

Return ONLY valid JSON matching this schema exactly. Do not include markdown code blocks.`

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
    
    const output = JSON.parse(responseText)

    // Atomic Database Update: Saving Narrative AND Sections in one call
    const { error } = await supabase
      .from('fir_drafts')
      .update({ 
        incident_narrative: output.incident_narrative,
        ai_suggested_sections: output.sections 
      })
      .eq('id', draftId)

    if (error) throw new Error('Failed to save suggested sections')

    return NextResponse.json({ success: true, sections: output.sections, incident_analysis: output.incident_analysis || [] })

  } catch (error: any) {
    console.error('Error suggesting sections:', error)
    
    // Handle Google Generative AI Rate Limit / Quota errors gracefully
    if (error?.message?.includes('429') || error?.message?.includes('quota')) {
      return NextResponse.json(
        { error: 'AI API Rate Limit Exceeded. Please check your Google API plan or try again in a few minutes.' }, 
        { status: 429 }
      )
    }

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
