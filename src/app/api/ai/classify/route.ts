import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '')

export async function POST(request: Request) {
  try {
    const { draftId, transcript } = await request.json()
    const supabase = await createClient()

    // 1. Verify user & draft ownership
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2. Call Gemini for Classification & Extraction
    const prompt = `Given this account of an incident: "${transcript}"

1. Classify the incident type: theft / assault / domestic_violence / cybercrime / fraud / missing_person / other.
2. Set sensitivity_flag = true if this involves domestic violence, sexual assault, or similarly sensitive circumstances.
3. Extract everything you can into this schema, using null for anything not stated — never invent details:
   {
     "incident_type": "string",
     "sensitivity_flag": boolean,
     "complainant_name": "string | null",
     "complainant_contact": "string | null",
     "complainant_address": "string | null",
     "incident_narrative": "string | null (chronologically ordered)",
     "incident_date": "YYYY-MM-DD | null",
     "incident_time": "HH:MM:SS | null",
     "incident_location": "string | null",
     "involved_parties": [{"name": "string", "role": "string", "address": "string"}]
   }

Return ONLY valid JSON matching this schema exactly. Do not include markdown code blocks like \`\`\`json. Just the JSON object.`

    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' })
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json'
      }
    })

    const responseText = result.response.text()
    const extractedData = JSON.parse(responseText)

    // 3. Update DB
    const { error } = await supabase
      .from('fir_drafts')
      .update({
        raw_transcript: transcript,
        incident_type: extractedData.incident_type,
        sensitivity_flag: extractedData.sensitivity_flag,
        complainant_name: extractedData.complainant_name,
        complainant_contact: extractedData.complainant_contact,
        complainant_address: extractedData.complainant_address,
        incident_narrative: extractedData.incident_narrative,
        incident_date: extractedData.incident_date,
        incident_time: extractedData.incident_time,
        incident_location: extractedData.incident_location,
        involved_parties: extractedData.involved_parties,
      })
      .eq('id', draftId)

    if (error) {
      console.error('Supabase update error:', error)
      throw new Error('Failed to save to database')
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in classification:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
