'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2, FileText, Keyboard } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDialog } from '@/components/DialogProvider'
import { motion, AnimatePresence } from 'framer-motion'
import VoiceInterview from './VoiceInterview'
import { createClient } from '@/utils/supabase/client'

export default function NarrativeCapture({ draftId, initialTranscript }: { draftId: string, initialTranscript?: string | null }) {
  const [mode, setMode] = useState<'unselected' | 'text' | 'voice'>('unselected')
  const [language, setLanguage] = useState('en-IN')
  const [transcript, setTranscript] = useState(initialTranscript || '')
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()
  const { showAlert } = useDialog()
  const supabase = createClient()

  // For Text Mode internal voice dictation (legacy)
  const [isDictating, setIsDictating] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
              setTranscript((prev) => prev + result[0].transcript + ' ')
            } else {
              currentTranscript += result[0].transcript
            }
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error)
          setIsDictating(false)
        }
      }
    }
  }, [])

  const toggleDictation = () => {
    if (!recognitionRef.current) {
      showAlert('Unsupported Browser', 'Speech recognition is not supported in this browser. Please type the narrative instead.')
      return
    }

    if (isDictating) {
      recognitionRef.current.stop()
      setIsDictating(false)
    } else {
      recognitionRef.current.start()
      setIsDictating(true)
    }
  }

  const handleProcess = async () => {
    if (!transcript.trim()) return
    setIsProcessing(true)

    try {
      // First update the raw_transcript in supabase
      await supabase
        .from('fir_drafts')
        .update({ raw_transcript: transcript })
        .eq('id', draftId)

      const response = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, transcript })
      })

      if (!response.ok) {
        throw new Error('Failed to process narrative')
      }
      
      router.push(`/dashboard/draft/${draftId}/interview`)
      router.refresh()
    } catch (error) {
      console.error(error)
      showAlert('Processing Error', 'Error processing narrative. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleToggleMode = async (targetMode: 'text' | 'voice') => {
    if (targetMode === 'voice') {
      // Switching to Voice: Save current transcript so the Voice Agent has it
      if (transcript.trim()) {
        await supabase
          .from('fir_drafts')
          .update({ raw_transcript: transcript })
          .eq('id', draftId)
      }
      setMode('voice')
    } else {
      // Switching to Text: Fetch whatever the Voice Agent might have saved
      const { data } = await supabase
        .from('fir_drafts')
        .select('raw_transcript')
        .eq('id', draftId)
        .single()
      
      if (data && data.raw_transcript) {
        setTranscript(data.raw_transcript)
      }
      setMode('text')
    }
  }

  if (mode === 'unselected') {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto space-y-8 mt-12 border border-[var(--rule)] bg-[var(--surface)] p-12 rounded-sm">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-serif text-[var(--ink)]">Select Input Method</h2>
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--muted)]">
            How would you like to capture this FIR?
          </p>
        </div>

        <div className="w-full flex flex-col items-center space-y-2 mb-4">
          <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted)]">Primary Language</label>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-[var(--surface)] border border-[var(--rule)] rounded-sm px-4 py-2 text-sm font-mono text-[var(--ink)] uppercase tracking-widest outline-none"
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <button
            onClick={() => handleToggleMode('voice')}
            className="flex flex-col items-center justify-center p-8 border-2 border-[var(--rule)] hover:border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--surface)] transition-all rounded-sm group gap-4"
          >
            <div className="h-16 w-16 rounded-full bg-[var(--surface)] group-hover:bg-[var(--ink)] flex items-center justify-center transition-colors">
              <Mic className="h-8 w-8 text-[var(--ink)] group-hover:text-[var(--paper)]" />
            </div>
            <div className="text-center">
              <h3 className="font-mono font-bold text-lg text-[var(--ink)] uppercase tracking-wider mb-2">Voice Mode</h3>
              <p className="text-xs text-[var(--muted)] font-mono">Speak directly to the FIR Assistant.</p>
            </div>
          </button>

          <button
            onClick={() => handleToggleMode('text')}
            className="flex flex-col items-center justify-center p-8 border-2 border-[var(--rule)] hover:border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--surface)] transition-all rounded-sm group gap-4"
          >
            <div className="h-16 w-16 rounded-full bg-[var(--surface)] group-hover:bg-[var(--ink)] flex items-center justify-center transition-colors">
              <Keyboard className="h-8 w-8 text-[var(--ink)] group-hover:text-[var(--paper)]" />
            </div>
            <div className="text-center">
              <h3 className="font-mono font-bold text-lg text-[var(--ink)] uppercase tracking-wider mb-2">Text Mode</h3>
              <p className="text-xs text-[var(--muted)] font-mono">Type the initial statement manually.</p>
            </div>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto flex flex-col flex-1 w-full min-h-0">
      <div className="border-b-2 border-[var(--ink)] pb-3 mb-2 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-serif tracking-tight text-[var(--ink)]">Initial Statement Capture</h2>
          <p className="font-mono text-[10px] md:text-xs tracking-widest text-[var(--muted)] mt-1 md:mt-2 uppercase">
            Enter the complainant's account. Verbatim transcription preferred.
          </p>
        </div>

        {/* Language Selector & Mode Toggle */}
        <div className="flex flex-col items-end gap-2">
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={mode === 'voice'}
            title={mode === 'voice' ? "Switch to Text Mode to change language" : "Select Language"}
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
              onClick={() => mode === 'voice' && handleToggleMode('text')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest transition-colors ${mode === 'text' ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
            >
              <Keyboard className="w-4 h-4" /> Text Mode
            </button>
            <button
              onClick={() => mode === 'text' && handleToggleMode('voice')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest transition-colors ${mode === 'voice' ? 'bg-[var(--ink)] text-[var(--paper)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
            >
              <Mic className="w-4 h-4" /> Voice Mode
            </button>
          </div>
        </div>
      </div>

      {mode === 'voice' ? (
        <VoiceInterview draftId={draftId} language={language} onSwitchToText={() => handleToggleMode('text')} />
      ) : (
        <>
          <div className="relative group bg-[var(--surface)] border border-[var(--rule)] focus-within:border-[var(--ink)] transition-colors p-1 rounded-sm flex-1 flex flex-col min-h-0">
            <div className={`absolute inset-0 bg-[var(--stamp)]/5 rounded-sm opacity-0 transition-opacity duration-500 pointer-events-none ${isDictating ? 'opacity-100 animate-pulse' : ''}`} />
            
            <div className="relative bg-[var(--surface)] overflow-hidden flex flex-col flex-1 min-h-[200px]">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                style={{ 
                  backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, var(--rule) 32px)',
                  backgroundAttachment: 'local',
                  paddingTop: '32px',
                  paddingBottom: '32px',
                  lineHeight: '32px',
                }}
                className="flex-1 w-full resize-none border-0 px-4 md:px-8 text-[var(--ink)] font-serif text-base md:text-lg placeholder:text-[var(--muted)] bg-transparent focus:ring-0 relative z-10"
                placeholder="E.g., Yesterday at around 8 PM, I was walking near the main market when two men on a bike..."
              />
              
              <div className="absolute bottom-4 right-4 flex items-center space-x-4 z-20">
                <AnimatePresence>
                  {isDictating && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2 text-[var(--stamp)] text-xs font-mono font-bold tracking-widest uppercase bg-[var(--paper)] px-3 py-1.5 border border-[var(--stamp)] rounded-sm shadow-sm"
                    >
                      <div className="h-2 w-2 rounded-full bg-[var(--stamp)] animate-pulse" />
                      Dictating...
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <button
                  type="button"
                  onClick={toggleDictation}
                  className={`flex items-center justify-center h-10 w-10 transition-colors duration-200 border rounded-sm ${
                    isDictating 
                      ? 'bg-[var(--stamp)] text-white border-[var(--stamp)] hover:bg-[#73252E]' 
                      : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--rule)] hover:bg-[var(--rule)]/20'
                  }`}
                  title="Legacy Browser Dictation"
                >
                  {isDictating ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[var(--rule)] border-dashed mt-4 shrink-0">
            <button
              onClick={handleProcess}
              disabled={isProcessing || !transcript.trim()}
              className="inline-flex items-center justify-center gap-x-2 bg-[var(--ink)] text-[var(--paper)] px-8 py-3 text-xs font-mono font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0f172a] transition-colors rounded-sm border border-[var(--ink)]"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {isProcessing ? 'PROCESSING RECORD...' : 'COMMIT STATEMENT'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
