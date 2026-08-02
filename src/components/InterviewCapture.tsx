'use client'

import { useState, useEffect } from 'react'
import { Loader2, ArrowRight, Save, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function InterviewCapture({ draftId }: { draftId: string }) {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      // Trigger generation if not exists
      await fetch('/api/ai/interview/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId })
      })

      // Fetch generated questions
      const { data } = await supabase
        .from('fir_interview_questions')
        .select('*')
        .eq('fir_draft_id', draftId)
        .order('order_index', { ascending: true })

      if (data) {
        setQuestions(data)
        const initialAnswers: Record<string, string> = {}
        data.forEach(q => {
          if (q.answer) initialAnswers[q.id] = q.answer
        })
        setAnswers(initialAnswers)
      }
      setLoading(false)
    }
    init()
  }, [draftId])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save all answers directly via supabase
      for (const q of questions) {
        if (answers[q.id]) {
          await supabase
            .from('fir_interview_questions')
            .update({ answer: answers[q.id], answered: true })
            .eq('id', q.id)
        }
      }

      // Call API to re-extract facts based on new answers
      await fetch('/api/ai/interview/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId })
      })

      router.push(`/dashboard/draft/${draftId}/sections`)
    } catch (err) {
      console.error(err)
      alert('Failed to save answers')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {questions.map((q, index) => (
        <div key={q.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
              {index + 1}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h4 className="text-lg font-medium text-gray-900">{q.question}</h4>
                <div className="mt-1 flex items-start gap-1 text-xs text-gray-500">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>Reason: {q.reason_for_asking}</span>
                </div>
              </div>
              <textarea
                rows={3}
                className="block w-full rounded-md border-0 p-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Enter the answer..."
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-x-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {saving ? 'Updating Records...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  )
}
