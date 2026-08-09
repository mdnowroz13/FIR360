import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'
import { z } from 'zod'

const ComplainantSchema = z.object({
  name: z.string().nullable().optional(),
  father_name: z.string().nullable().optional(),
  mother_name: z.string().nullable().optional(),
  spouse_name: z.string().nullable().optional(),
  age: z.union([z.number(), z.string()]).nullable().optional(),
  dob: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  occupation: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  id_details: z.string().nullable().optional()
}).passthrough()

const AccusedSchema = z.object({
  name: z.string().nullable().optional(),
  alias: z.string().nullable().optional(),
  relative_name: z.string().nullable().optional(),
  address: z.string().nullable().optional()
}).passthrough()

const PropertySchema = z.object({
  category: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  estimated_value: z.union([z.number(), z.string()]).nullable().optional()
}).passthrough()

const WitnessSchema = z.object({
  name: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  contact: z.string().nullable().optional()
}).passthrough()

const EvidenceSchema = z.object({
  type: z.string().nullable().optional(),
  description: z.string().nullable().optional()
}).passthrough()

const TimelineSchema = z.object({
  event_title: z.string().nullable().optional(),
  event_category: z.string().nullable().optional(),
  requires_occurrence_details: z.boolean().nullable().optional(),
  date: z.string().nullable().optional(),
  time: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  actors: z.array(z.string()).nullable().optional()
}).passthrough()

const ClassifyResponseSchema = z.object({
  incident_type: z.string().nullable().optional(),
  sensitivity_flag: z.boolean().nullable().optional(),
  complainant: ComplainantSchema.nullable().optional(),
  accused: z.array(AccusedSchema).nullable().optional(),
  property: z.array(PropertySchema).nullable().optional(),
  witnesses: z.array(WitnessSchema).nullable().optional(),
  evidence: z.array(EvidenceSchema).nullable().optional(),
  timeline: z.array(TimelineSchema).nullable().optional(),
  incident_categories: z.array(z.string()).nullable().optional()
}).passthrough()

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || ''
})

export async function POST(request: Request) {
  try {
    const { draftId, transcript } = await request.json()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const prompt = `Given this account of an incident: "${transcript}"

1. Classify the incident type: theft / assault / domestic_violence / cybercrime / fraud / missing_person / other.
2. Set sensitivity_flag = true if this involves domestic violence, sexual assault, or similarly sensitive circumstances.
3. For the timeline, classify each event into: 'Criminal Act', 'Financial Transaction', 'Behaviour', 'Observation', 'Communication', 'Administrative Event', or 'Supporting Fact'.
4. CRITICAL RULES FOR requires_occurrence_details:
   - Criminal Act: MUST be true (e.g., Threat, Assault, Theft).
   - Financial Transaction: MUST be true (needs date and transaction method).
   - Behaviour / Observation / Communication / Administrative Event / Supporting Fact: MUST be false unless it forms the core corpus delicti.
5. Extract everything you can into this exact schema, using null for anything not stated. NEVER invent details that were not explicitly stated:
{
  "incident_type": "string",
  "sensitivity_flag": boolean,
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

Return ONLY valid JSON matching this schema exactly. Do not include markdown code blocks.`

    const result = await openai.chat.completions.create({
      model: 'openrouter/free', 
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    }, { timeout: 30000 })

    let responseText = result.choices[0]?.message?.content || '{}'
    
    // Safely extract JSON block if the model included it despite prompt, or if there's prepended safety text
    const startIdx = responseText.indexOf('{')
    const endIdx = responseText.lastIndexOf('}')
    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
      responseText = responseText.slice(startIdx, endIdx + 1)
    } else {
      throw new Error('No JSON object found in response')
    }
    
    const extractedData = JSON.parse(responseText)
    
    const parsed = ClassifyResponseSchema.safeParse(extractedData)
    if (!parsed.success) {
      console.error('AI Response Validation Failed in classify:', parsed.error)
      return NextResponse.json({ error: 'AI returned invalid data format' }, { status: 422 })
    }
    const validatedData = parsed.data

    const { error } = await supabase
      .from('fir_drafts')
      .update({
        raw_transcript: transcript,
        incident_type: validatedData.incident_type,
        sensitivity_flag: validatedData.sensitivity_flag,
        complainant: validatedData.complainant,
        accused: validatedData.accused,
        property: validatedData.property,
        witnesses: validatedData.witnesses || [],
        evidence: validatedData.evidence || [],
        timeline: validatedData.timeline || [],
        incident_categories: validatedData.incident_categories || []
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
