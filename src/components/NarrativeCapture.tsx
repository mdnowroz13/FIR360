'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold leading-6 text-gray-900">Step 1: Incident Narrative Capture</h3>
        <p className="mt-1 text-sm text-gray-500">
          Enter the complainant's account of the incident. You can type it out or use the microphone to dictate.
        </p>
      </div>

      <div className="relative">
        <textarea
          rows={10}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 p-4"
          placeholder="E.g., Yesterday at around 8 PM, I was walking near the main market when two men on a bike..."
        />
        
        <div className="absolute bottom-4 right-4 flex space-x-2">
          <button
            type="button"
            onClick={toggleRecording}
            className={`inline-flex items-center gap-x-2 rounded-full p-3 shadow-sm text-white transition-colors ${
              isRecording ? 'bg-red-600 hover:bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleProcess}
          disabled={isProcessing || !transcript.trim()}
          className="inline-flex items-center gap-x-2 rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          {isProcessing ? 'Analyzing with AI...' : 'Analyze & Proceed'}
        </button>
      </div>
    </div>
  )
}
