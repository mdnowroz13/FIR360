'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

export default function NarrativeCapture({ draftId, initialTranscript }: { draftId: string, initialTranscript?: string | null }) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState(initialTranscript || '')
  const [isProcessing, setIsProcessing] = useState(false)
  const recognitionRef = useRef<any>(null)
  const router = useRouter()

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
          setIsRecording(false)
        }
      }
    }
  }, [])

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type the narrative instead.')
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }

  const handleProcess = async () => {
    if (!transcript.trim()) return
    setIsProcessing(true)

    try {
      const response = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, transcript })
      })

      if (!response.ok) {
        throw new Error('Failed to process narrative')
      }
      
      // Navigate to the interview step
      router.push(`/dashboard/draft/${draftId}/interview`)
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Error processing narrative. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto flex flex-col flex-1 w-full min-h-0">
      <div className="border-b-2 border-[var(--ink)] pb-3 mb-2 shrink-0">
        <h2 className="text-xl md:text-2xl font-serif tracking-tight text-[var(--ink)]">Initial Statement Capture</h2>
        <p className="font-mono text-[10px] md:text-xs tracking-widest text-[var(--muted)] mt-1 md:mt-2 uppercase">
          Enter the complainant's account. Verbatim transcription preferred.
        </p>
      </div>

      <div className="relative group bg-[var(--surface)] border border-[var(--rule)] focus-within:border-[var(--ink)] transition-colors p-1 rounded-sm flex-1 flex flex-col min-h-0">
        <div className={`absolute inset-0 bg-[var(--stamp)]/5 rounded-sm opacity-0 transition-opacity duration-500 pointer-events-none ${isRecording ? 'opacity-100 animate-pulse' : ''}`} />
        
        <div className="relative bg-[var(--surface)] overflow-hidden flex flex-col flex-1 min-h-[200px]">
          {/* Lined paper effect background */}
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, var(--rule) 32px)', backgroundPositionY: '32px' }}></div>
          
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="flex-1 w-full resize-none border-0 py-8 px-4 md:px-8 text-[var(--ink)] font-serif text-base md:text-lg placeholder:font-sans placeholder:text-sm placeholder:text-[var(--muted)] bg-transparent focus:ring-0 leading-[32px] relative z-10"
            placeholder="E.g., Yesterday at around 8 PM, I was walking near the main market when two men on a bike..."
          />
          
          <div className="absolute bottom-4 right-4 flex items-center space-x-4 z-20">
            <AnimatePresence>
              {isRecording && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-2 text-[var(--stamp)] text-xs font-mono font-bold tracking-widest uppercase bg-[var(--paper)] px-3 py-1.5 border border-[var(--stamp)] rounded-sm shadow-sm"
                >
                  <div className="h-2 w-2 rounded-full bg-[var(--stamp)] animate-pulse" />
                  Recording...
                </motion.div>
              )}
            </AnimatePresence>
            
            <button
              type="button"
              onClick={toggleRecording}
              className={`flex items-center justify-center h-10 w-10 transition-colors duration-200 border rounded-sm ${
                isRecording 
                  ? 'bg-[var(--stamp)] text-white border-[var(--stamp)] hover:bg-[#73252E]' 
                  : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--rule)] hover:bg-[var(--rule)]/20'
              }`}
            >
              {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
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
    </div>
  )
}
