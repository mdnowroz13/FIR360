'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, XCircle, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Section {
  code: string
  title: string
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

export default function SectionReview({ draftId }: { draftId: string }) {
  const [sections, setSections] = useState<Section[]>([])
  const [decisions, setDecisions] = useState<Record<string, 'accept' | 'reject'>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchSections = async () => {
      const res = await fetch('/api/ai/sections/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId })
      })
      const data = await res.json()
      if (data.sections) {
        setSections(data.sections)
      }
      setLoading(false)
    }
    fetchSections()
  }, [draftId])

  const handleDecision = (code: string, decision: 'accept' | 'reject') => {
    setDecisions(prev => ({ ...prev, [code]: decision }))
  }

  const handleContinue = async () => {
    setSaving(true)
    const confirmedSections = sections
      .filter(s => decisions[s.code] === 'accept')
      .map(s => ({ code: s.code, title: s.title }))

    try {
      await fetch('/api/ai/sections/suggest', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, confirmedSections })
      })
      router.push(`/dashboard/draft/${draftId}/review`)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const allReviewed = sections.length > 0 && sections.every(s => decisions[s.code] !== undefined)

  if (loading) {
    return (
      <div className="flex h-40 flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500">Analyzing narrative against BNS reference...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.code} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
            <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4 flex justify-between items-center">
              <div>
                <h4 className="text-base font-semibold text-gray-900">{section.code}</h4>
                <p className="text-sm font-medium text-gray-600">{section.title}</p>
              </div>
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                section.confidence === 'high' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                section.confidence === 'medium' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' :
                'bg-red-50 text-red-700 ring-red-600/10'
              }`}>
                {section.confidence.toUpperCase()} CONFIDENCE
              </span>
            </div>
            <div className="px-5 py-4 text-sm text-gray-600">
              <strong className="font-semibold text-gray-900">AI Reasoning:</strong> {section.reason}
            </div>
            <div className="bg-gray-50 px-5 py-3 flex gap-3 border-t border-gray-100">
              <button
                onClick={() => handleDecision(section.code, 'accept')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  decisions[section.code] === 'accept' 
                    ? 'bg-green-600 text-white shadow-sm hover:bg-green-500' 
                    : 'bg-white text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                Accept
              </button>
              <button
                onClick={() => handleDecision(section.code, 'reject')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  decisions[section.code] === 'reject' 
                    ? 'bg-red-600 text-white shadow-sm hover:bg-red-500' 
                    : 'bg-white text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                }`}
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </div>
          </div>
        ))}
        {sections.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-8">No sections were suggested based on the current narrative.</p>
        )}
      </div>

      <div className="flex justify-end border-t border-gray-200 pt-5">
        <button
          onClick={handleContinue}
          disabled={saving || !allReviewed}
          className="inline-flex items-center gap-x-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Proceed to Final Review'}
          {!saving && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
      {!allReviewed && sections.length > 0 && (
        <p className="text-right text-xs text-red-500 mt-2">Please accept or reject all suggestions to continue.</p>
      )}
    </div>
  )
}
