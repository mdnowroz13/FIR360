'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, ArrowRight, Info, CheckCircle2, User, AlertCircle, FolderOpen, FileText, Mic, Keyboard } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDialog } from '@/components/DialogProvider'
import { createClient } from '@/utils/supabase/client'
import { motion } from 'framer-motion'
import VoiceInterview from './VoiceInterview'

export default function InterviewCapture({ draftId }: { draftId: string }) {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [language, setLanguage] = useState('en-IN')
  
  // Animation states
  const [saving, setSaving] = useState(false)
  const [thinkingStep, setThinkingStep] = useState(0)
  
  const router = useRouter()
  const { showAlert } = useDialog()
  const supabase = createClient()
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const init = async () => {
      await fetch('/api/ai/interview/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId })
      })

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

  const fetchStateFromDb = async () => {
    const { data } = await supabase
      .from('fir_interview_questions')
      .select('*')
      .eq('fir_draft_id', draftId)
      .order('order_index', { ascending: true })

    if (data) {
      setQuestions(data)
      const currentAnswers: Record<string, string> = {}
      data.forEach(q => {
        if (q.answer) currentAnswers[q.id] = q.answer
      })
      setAnswers(currentAnswers)
    }
  }

  const handleToggleMode = async () => {
    if (isVoiceMode) {
      // Voice -> Text: Re-fetch latest from DB
      setLoading(true)
      await fetchStateFromDb()
      setLoading(false)
      setIsVoiceMode(false)
    } else {
      // Text -> Voice: Save current inputs to DB
      setSaving(true)
      setThinkingStep(1) // Show a brief saving state
      try {
        const updatePromises = questions.map(q => {
          if (answers[q.id]) {
            return supabase
              .from('fir_interview_questions')
              .update({ answer: answers[q.id], answered: true })
              .eq('id', q.id)
          }
        }).filter(Boolean)
        await Promise.all(updatePromises)
      } catch (err) {
        console.error("Failed to sync state before voice mode", err)
      }
      setSaving(false)
      setThinkingStep(0)
      setIsVoiceMode(true)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setThinkingStep(1) // Step 1: Understanding complaint
    
    try {
      const updatePromises = questions.map(q => {
        if (answers[q.id]) {
          return supabase
            .from('fir_interview_questions')
            .update({ answer: answers[q.id], answered: true })
            .eq('id', q.id)
        }
      }).filter(Boolean)
      
      await Promise.all(updatePromises)

      await new Promise(r => setTimeout(r, 600))
      setThinkingStep(2) // Step 2: Timeline extracted

      await fetch('/api/ai/interview/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId })
      })

      setThinkingStep(3) // Step 3: Missing information verified
      await new Promise(r => setTimeout(r, 600))
      
      setThinkingStep(4) // Step 4: Narrative drafted
      await new Promise(r => setTimeout(r, 600))

      setThinkingStep(5) // Step 5: Legal references retrieved
      await new Promise(r => setTimeout(r, 800))

      router.push(`/dashboard/draft/${draftId}/sections`)
    } catch (err) {
      console.error(err)
      showAlert('Save Error', 'Failed to save answers')
      setSaving(false)
      setThinkingStep(0)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-64 items-center justify-center gap-4">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--muted)]">Generating Interrogation Protocol...</span>
      </div>
    )
  }

  // The AI Thinking Animation Overlay - Ledger Style
  if (saving) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 bg-[var(--surface)] border border-[var(--rule)] rounded-sm min-h-[400px]">
        
        <div className="w-full max-w-lg space-y-2 font-mono text-sm">
          <div className="border-b-2 border-[var(--ink)] pb-2 mb-6">
            <h3 className="uppercase tracking-widest text-[var(--ink)] font-bold">Processing System Ledger</h3>
            <p className="text-[10px] text-[var(--muted)] mt-1">ID: {draftId.split('-')[0].toUpperCase()} // VERIFYING FACTS</p>
          </div>

          {[
            { step: 1, label: "COMMITTING STATEMENT TO REGISTRY" },
            { step: 2, label: "EXTRACTING FACTUAL TIMELINE" },
            { step: 3, label: "VERIFYING CORROBORATING EVIDENCE" },
            { step: 4, label: "DRAFTING OFFICIAL TEHRIR" },
            { step: 5, label: "QUERYING PENAL CODE (BNS) DB" }
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: thinkingStep >= item.step ? 1 : 0.3 }}
              className="flex items-center justify-between py-2 border-b border-[var(--rule)] border-dashed"
            >
              <span className={`transition-colors duration-500 ${thinkingStep >= item.step ? 'text-[var(--ink)] font-bold' : 'text-[var(--muted)]'}`}>
                &gt; {item.label}
              </span>
              <div className="flex items-center gap-2">
                {thinkingStep > item.step ? (
                  <span className="text-[var(--success)] font-bold">[ OK ]</span>
                ) : thinkingStep === item.step ? (
                  <span className="text-[var(--warning)] animate-pulse">[ WAIT ]</span>
                ) : (
                  <span className="text-[var(--muted)]">[ -- ]</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  const groupedQuestions = {
    complainant: questions.filter(q => q.field_key === 'Complainant Details'),
    evidence: questions.filter(q => q.field_key === 'Supporting Evidence' || q.field_key === 'Evidence Verification'),
    incident: questions.filter(q => q.field_key !== 'Complainant Details' && q.field_key !== 'Supporting Evidence' && q.field_key !== 'Evidence Verification')
  }

  let globalIndex = 1;

  const renderGroup = (title: string, groupQuestions: any[], isOptionalGroup: boolean = false) => {
    if (groupQuestions.length === 0) return null;
    
    return (
      <div className="mb-12">
        {/* Physical folder tab aesthetic */}
        <div className="inline-block bg-[var(--surface)] border-t border-l border-r border-[var(--rule)] px-4 py-2 relative top-[1px] z-10">
          <h3 className="text-xs font-mono font-bold tracking-widest text-[var(--ink)] uppercase">{title}</h3>
        </div>
        <div className="border-t-2 border-[var(--rule)] pt-8">
          <div className="space-y-8">
            {groupQuestions.map((q) => {
              const currentIndex = globalIndex++;
              return (
                <div key={q.id} className="relative pl-8 md:pl-12">
                  {/* Number identifier */}
                  <div className="absolute left-0 top-0 font-mono text-sm font-bold text-[var(--muted)]">
                    {currentIndex.toString().padStart(2, '0')}.
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <h4 className="text-xl font-serif text-[var(--ink)] leading-snug max-w-2xl">{q.question}</h4>
                      {isOptionalGroup && (
                        <span className="shrink-0 border border-[var(--rule)] text-[var(--muted)] text-[10px] font-mono tracking-widest px-2 py-1 uppercase">
                          Optional
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-start gap-2 text-xs font-mono text-[var(--muted)] uppercase border-l-2 border-[var(--rule)] pl-3">
                      <span className="font-bold text-[var(--ink)] shrink-0">RATIONALE:</span>
                      <span>{q.reason_for_asking}</span>
                    </div>
                    
                    <textarea
                      rows={3}
                      className="block w-full border border-[var(--rule)] py-3 px-4 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] placeholder:font-mono placeholder:text-xs placeholder:uppercase focus:ring-1 focus:ring-[var(--ink)] focus:border-[var(--ink)] rounded-sm"
                      placeholder="ENTER WITNESS STATEMENT..."
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="border-b-2 border-[var(--ink)] pb-4 mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-serif tracking-tight text-[var(--ink)]">Gap Analysis Interview</h2>
          <p className="font-mono text-xs tracking-widest text-[var(--muted)] mt-2 uppercase">
            System has identified missing elements required for legal classification.
          </p>
        </div>
        
        {/* Language Selector & Mode Toggle */}
        <div className="flex flex-col items-end gap-2">
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isVoiceMode}
            title={isVoiceMode ? "Switch to Text Mode to change language" : "Select Language"}
            className="bg-[var(--surface)] border border-[var(--rule)] rounded-sm px-2 py-1 text-xs font-mono text-[var(--ink)] uppercase tracking-widest outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="en-IN">English (India)</option>
            <option value="hi-IN">Hindi (hi-IN)</option>
            <option value="bn-IN">Bengali (bn-IN)</option>
            <option value="gu-IN">Gujarati (gu-IN)</option>
            <option value="kn-IN">Kannada (kn-IN)</option>
            <option value="ml-IN">Malayalam (ml-IN)</option>
            <option value="mr-IN">Marathi (mr-IN)</option>
            <option value="ta-IN">Tamil (ta-IN)</option>
            <option value="te-IN">Telugu (te-IN)</option>
          </select>
          <div className="flex bg-[var(--surface)] border border-[var(--rule)] rounded-sm p-1">
            <button
              onClick={() => isVoiceMode && handleToggleMode()}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest transition-colors ${!isVoiceMode ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
            >
              <Keyboard className="w-4 h-4" /> Text Mode
            </button>
            <button
              onClick={() => !isVoiceMode && handleToggleMode()}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest transition-colors ${isVoiceMode ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
            >
              <Mic className="w-4 h-4" /> Voice Mode
            </button>
          </div>
        </div>
      </div>

      {isVoiceMode ? (
        <VoiceInterview draftId={draftId} language={language} onSwitchToText={handleToggleMode} />
      ) : (
        <>
          {renderGroup('Complainant Details', groupedQuestions.complainant)}
          {renderGroup('Incident Facts', groupedQuestions.incident)}
          {renderGroup('Supporting Evidence', groupedQuestions.evidence, true)}

      {questions.length === 0 && !isVoiceMode && (
        <div className="text-center py-16 border border-[var(--rule)] bg-[var(--surface)] rounded-sm">
          <p className="font-mono text-sm font-bold tracking-widest text-[var(--success)] uppercase mb-2">[ SYSTEM VERIFIED ]</p>
          <h3 className="text-xl font-serif text-[var(--ink)]">Initial statement legally complete.</h3>
          <p className="text-[var(--muted)] mt-2 font-mono text-xs uppercase tracking-widest">No follow-up interrogation required.</p>
        </div>
      )}

      {!isVoiceMode && (
        <div className="flex justify-end pt-8 border-t border-[var(--rule)] border-dashed">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-x-2 bg-[var(--ink)] text-[var(--paper)] px-8 py-3 text-xs font-mono font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0f172a] transition-colors rounded-sm border border-[var(--ink)]"
          >
            Finalize Fact Sheet <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
        </>
      )}
    </div>
  )
}
