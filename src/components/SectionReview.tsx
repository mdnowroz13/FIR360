'use client'

import { useState, useEffect } from 'react'
import { Loader2, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

interface Section {
  code: string
  title: string
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

export default function SectionReview({ draft }: { draft: any }) {
  const [sections, setSections] = useState<Section[]>([])
  const [analysis, setAnalysis] = useState<any[]>([])
  const [decisions, setDecisions] = useState<Record<string, 'accept' | 'reject'>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchSections = async () => {
      const res = await fetch('/api/ai/sections/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: draft.id })
      })
      const data = await res.json()
      
      if (!res.ok) {
        setLoading(false)
        alert(data.error || 'Failed to suggest sections.')
        return
      }

      if (data.sections) {
        setSections(data.sections)
      }
      if (data.incident_analysis) {
        setAnalysis(data.incident_analysis)
      }
      setLoading(false)
    }
    fetchSections()
  }, [draft.id])

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
        body: JSON.stringify({ draftId: draft.id, confirmedSections })
      })
      router.push(`/dashboard/draft/${draft.id}/review`)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const allReviewed = sections.length > 0 && sections.every(s => decisions[s.code] !== undefined)

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-6">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--muted)] animate-pulse">Running Penal Code Analysis...</p>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto space-y-12 pb-24"
    >
      <div className="border-b-2 border-[var(--ink)] pb-4">
        <h2 className="text-2xl font-serif tracking-tight text-[var(--ink)]">Charge Applicability Review</h2>
        <p className="font-mono text-xs tracking-widest text-[var(--muted)] mt-2 uppercase">
          System has evaluated the statement against the Bharatiya Nyaya Sanhita (BNS).
        </p>
      </div>

      {/* AI Case Analysis Dashboard (The WOW Screen) */}
      <div className="bg-[var(--surface)] border border-[var(--rule)] rounded-sm">
        <div className="border-b border-[var(--rule)] bg-[var(--paper)] px-6 py-3 flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold tracking-widest text-[var(--ink)] uppercase">System Factual Analysis</h3>
          <span className="font-mono text-[10px] text-[var(--muted)] uppercase">ID: {draft.id.split('-')[0]}</span>
        </div>
        
        <div className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2">
            
            {/* Left Column: People & Evidence */}
            <div className="p-6 md:border-r border-[var(--rule)] space-y-8">
              {/* Summary */}
              <div>
                <p className="font-mono text-[10px] tracking-widest text-[var(--muted)] uppercase mb-2">Primary Classification</p>
                <p className="text-xl font-serif text-[var(--ink)] capitalize">
                  {(() => {
                    const type = draft.incident_categories?.[0] || draft.incident_type || 'General Incident';
                    const formatted = type.replace(/_/g, ' ');
                    return formatted.toLowerCase().includes('complaint') ? formatted : `${formatted} Complaint`;
                  })()}
                </p>
              </div>

              {/* People */}
              <div>
                <p className="font-mono text-[10px] tracking-widest text-[var(--muted)] uppercase mb-2">Subject Entities</p>
                <div className="font-mono text-sm space-y-2 border-l-2 border-[var(--rule)] pl-3">
                  <div className="flex gap-2">
                    <span className="text-[var(--muted)] w-24">V(1):</span>
                    <span className="font-bold text-[var(--ink)] uppercase">{draft.complainant?.name || 'Unknown'}</span>
                  </div>
                  {(draft.accused || []).map((acc: any, i: number) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-[var(--stamp)] w-24">A({i+1}):</span>
                      <span className="font-bold text-[var(--stamp)] uppercase">{acc.name || 'Unknown'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidence */}
              <div>
                <p className="font-mono text-[10px] tracking-widest text-[var(--muted)] uppercase mb-2">Corroborating Items</p>
                <div className="font-mono text-xs space-y-2">
                  {draft.evidence?.length > 0 ? draft.evidence.map((ev: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 border-b border-[var(--rule)] border-dashed pb-2 last:border-0 last:pb-0">
                      <span className="text-[var(--success)] font-bold shrink-0">[X]</span>
                      <div className="flex flex-col">
                        <span className="font-bold text-[var(--ink)] uppercase">{ev.type || 'Not Provided'}</span>
                        <span className="text-[var(--muted)] uppercase mt-0.5 leading-relaxed">{ev.description || 'Not Available'}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-[var(--muted)] uppercase italic">No specific evidence recorded.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Timeline & Events */}
            <div className="p-6 space-y-8 bg-[var(--paper)]/30">
              
              {/* Possible Criminal Events (From AI Analysis) */}
              {analysis && analysis.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] tracking-widest text-[var(--stamp)] uppercase mb-3 font-bold border-b border-[var(--stamp)] pb-1 inline-block">
                    Detected Criminal Elements
                  </p>
                  <ul className="list-square pl-4 font-mono text-xs text-[var(--ink)] space-y-2 uppercase leading-relaxed marker:text-[var(--stamp)]">
                    {analysis.map((an: any, idx: number) => (
                      <li key={idx} className="pl-1">
                        {an.event || 'Not Available'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timeline */}
              <div>
                <p className="font-mono text-[10px] tracking-widest text-[var(--muted)] uppercase mb-4 mt-6">Sequence of Events</p>
                <div className="space-y-4 font-mono text-xs border-l border-[var(--rule)] pl-4 relative">
                  {(draft.timeline || []).filter((t: any) => t.event_title || t.event).map((t: any, i: number) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--ink)] ring-2 ring-[var(--surface)]"></div>
                      <time className="block font-bold text-[var(--ink)] mb-1 uppercase tracking-wider">{t.date || t.approximate_date || 'Date not provided'}</time>
                      <div className="text-[var(--muted)] uppercase leading-relaxed">{t.event_title || t.event || 'Not Available'}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-mono font-bold tracking-widest text-[var(--ink)] uppercase border-b border-[var(--rule)] pb-2">Penal Code Matches</h3>
        
        <div className="space-y-4">
          {sections.map((section, idx) => (
            <div 
              key={section.code} 
              className="bg-[var(--surface)] border border-[var(--rule)] flex flex-col md:flex-row relative group"
            >
              
              <div className="flex-1 p-6 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="text-2xl font-serif font-bold text-[var(--ink)]">{section.code}</h4>
                    <p className="text-sm font-serif text-[var(--ink)] mt-1">{section.title}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 border border-[var(--rule)] px-2 py-1 rounded-sm bg-[var(--paper)]">
                    <span className="text-[10px] font-mono font-bold text-[var(--muted)] uppercase tracking-widest">
                      CONFIDENCE:
                    </span>
                    <span className={`font-mono text-xs font-bold uppercase ${
                      section.confidence === 'high' ? 'text-[var(--success)]' :
                      section.confidence === 'medium' ? 'text-[var(--warning)]' :
                      'text-[var(--stamp)]'
                    }`}>
                      {section.confidence === 'high' ? 'HIGH' : section.confidence === 'medium' ? 'MED' : 'LOW'}
                    </span>
                  </div>
                </div>
                
                <div className="border-t border-[var(--rule)] border-dashed pt-4 font-mono text-xs text-[var(--muted)] leading-relaxed uppercase">
                  <span className="font-bold text-[var(--ink)] mr-2">APPLICATION RATIONALE:</span>
                  {section.reason}
                </div>
              </div>
              
              <div className="md:w-48 border-t md:border-t-0 md:border-l border-[var(--rule)] flex flex-row md:flex-col bg-[var(--paper)]/50">
                <button
                  onClick={() => handleDecision(section.code, 'accept')}
                  className={`flex-1 flex flex-col items-center justify-center p-4 transition-colors relative ${
                    decisions[section.code] === 'accept' 
                      ? 'bg-[var(--success)]/10' 
                      : 'hover:bg-[var(--surface)]'
                  }`}
                >
                  {decisions[section.code] === 'accept' && (
                    <motion.div 
                      initial={{ scale: 2, opacity: 0, rotate: -15 }}
                      animate={{ scale: 1, opacity: 1, rotate: -5 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <div className="border-4 border-[var(--success)] text-[var(--success)] font-bold text-xl uppercase tracking-widest px-2 py-1 rotate-[-10deg] opacity-60">APPROVED</div>
                    </motion.div>
                  )}
                  <span className={`font-mono text-xs font-bold uppercase tracking-widest z-10 ${decisions[section.code] === 'accept' ? 'text-[var(--success)]' : 'text-[var(--ink)]'}`}>
                    Accept
                  </span>
                </button>
                <div className="w-px h-full md:w-full md:h-px bg-[var(--rule)]"></div>
                <button
                  onClick={() => handleDecision(section.code, 'reject')}
                  className={`flex-1 flex flex-col items-center justify-center p-4 transition-colors relative ${
                    decisions[section.code] === 'reject' 
                      ? 'bg-[var(--stamp)]/10' 
                      : 'hover:bg-[var(--surface)]'
                  }`}
                >
                   {decisions[section.code] === 'reject' && (
                    <motion.div 
                      initial={{ scale: 2, opacity: 0, rotate: 15 }}
                      animate={{ scale: 1, opacity: 1, rotate: 5 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <div className="border-4 border-[var(--stamp)] text-[var(--stamp)] font-bold text-xl uppercase tracking-widest px-2 py-1 rotate-[10deg] opacity-60">REJECTED</div>
                    </motion.div>
                  )}
                  <span className={`font-mono text-xs font-bold uppercase tracking-widest z-10 ${decisions[section.code] === 'reject' ? 'text-[var(--stamp)]' : 'text-[var(--ink)]'}`}>
                    Reject
                  </span>
                </button>
              </div>
            </div>
          ))}
          {sections.length === 0 && (
            <div className="text-center bg-[var(--surface)] border border-[var(--rule)] py-12">
              <p className="font-mono text-sm tracking-widest text-[var(--muted)] uppercase">No sections identified.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end pt-8 border-t border-[var(--rule)] border-dashed">
        <button
          onClick={handleContinue}
          disabled={saving || !allReviewed}
          className={`inline-flex items-center justify-center gap-x-2 px-8 py-3 text-xs font-mono font-bold uppercase tracking-widest transition-colors rounded-sm border ${
            allReviewed && !saving 
              ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)] hover:bg-[#0f172a]' 
              : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--rule)] cursor-not-allowed'
          }`}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Proceed to Final Review'}
          {!saving && <ArrowRight className="h-4 w-4" />}
        </button>
        <AnimatePresence>
          {!allReviewed && sections.length > 0 && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-right text-[10px] font-mono font-bold text-[var(--stamp)] uppercase tracking-widest mt-3"
            >
              // ADJUDICATE ALL CHARGES TO CONTINUE
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
