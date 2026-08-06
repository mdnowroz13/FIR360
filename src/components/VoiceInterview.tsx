'use client'

import { useState, useEffect, useRef } from 'react'
import {
  LiveKitRoom,
  useVoiceAssistant,
  useRoomContext,
  BarVisualizer,
  RoomAudioRenderer
} from '@livekit/components-react'
import { RoomEvent, TranscriptionSegment, RemoteParticipant } from 'livekit-client'
import { Loader2, Mic, BrainCircuit, Volume2, AlertCircle, RefreshCcw, CheckCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function VoiceInterview({ draftId, language, onSwitchToText }: { draftId: string, language: string, onSwitchToText: () => void }) {
  const [token, setToken] = useState<string | null>(null)
  const [roomName, setRoomName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFinalized, setIsFinalized] = useState(false)
  
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL

  useEffect(() => {
    let mounted = true;
    const fetchToken = async () => {
      try {
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draftId, language })
        })
        const data = await res.json()
        if (res.ok && mounted) {
          setToken(data.token)
          setRoomName(data.room)
        } else if (mounted) {
          setError('Failed to get voice session token')
        }
      } catch (err) {
        if (mounted) setError('Connection error')
      }
    }
    fetchToken()
    return () => { mounted = false }
  }, [draftId])

  if (isFinalized) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[#f0fdf4] border border-[#bbf7d0] rounded-sm">
        <CheckCircle className="h-8 w-8 text-[#16a34a] mb-4" />
        <h3 className="text-lg font-serif text-[#16a34a] mb-2">Report Filed Successfully</h3>
        <p className="font-mono text-xs text-[#15803d] mb-6 text-center max-w-md">
          The FIR draft has been successfully populated and finalized with the complainant's statement.
        </p>
        <button
          onClick={onSwitchToText}
          className="inline-flex items-center gap-2 bg-[#16a34a] text-white px-6 py-2 font-mono text-xs uppercase tracking-widest hover:bg-[#15803d]"
        >
          Review & Continue to PDF
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[var(--surface)] border border-[var(--rule)] rounded-sm">
        <AlertCircle className="h-8 w-8 text-[var(--error)] mb-4" />
        <h3 className="text-lg font-serif text-[var(--ink)] mb-2">Voice service temporarily unavailable</h3>
        <p className="font-mono text-xs text-[var(--muted)] mb-6">{error}</p>
        <button
          onClick={onSwitchToText}
          className="inline-flex items-center gap-2 bg-[var(--ink)] text-[var(--paper)] px-6 py-2 font-mono text-xs uppercase tracking-widest"
        >
          <RefreshCcw className="h-4 w-4" /> Switch to Text Mode
        </button>
      </div>
    )
  }

  if (!token || !serverUrl) {
    return (
      <div className="flex flex-col h-64 items-center justify-center gap-4">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
        <span className="font-mono text-xs uppercase tracking-widest text-[var(--muted)]">Initializing Secure Voice Channel...</span>
      </div>
    )
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={false}
      className="w-full"
      onDisconnected={() => {
        // Only set error if it wasn't a clean finalization disconnect
        if (!isFinalized) setError('Disconnected from room')
      }}
    >
      <RoomAudioRenderer />
      <AgentInterface onSwitchToText={onSwitchToText} onFinalized={() => setIsFinalized(true)} />
    </LiveKitRoom>
  )
}

function AgentInterface({ onSwitchToText, onFinalized }: { onSwitchToText: () => void, onFinalized: () => void }) {
  const { state, agent } = useVoiceAssistant()
  const room = useRoomContext()
  const [transcripts, setTranscripts] = useState<{id: string, text: string, isAgent: boolean}[]>([])
  const [agentFound, setAgentFound] = useState(true)

  // Timeout logic: if agent doesn't join within 10s, show error
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!agent) {
        setAgentFound(false)
      }
    }, 10000)
    return () => clearTimeout(timeout)
  }, [agent])

  // Transcription listener
  useEffect(() => {
    if (!room) return
    const handleTranscription = (segments: TranscriptionSegment[], participant?: RemoteParticipant) => {
      setTranscripts(prev => {
        const next = [...prev]
        for (const segment of segments) {
          const isAgent = participant?.identity.startsWith('agent') || false
          const existingIdx = next.findIndex(t => t.id === segment.id)
          if (existingIdx >= 0) {
            next[existingIdx] = { ...next[existingIdx], text: segment.text }
          } else {
            next.push({ id: segment.id, text: segment.text, isAgent })
          }
        }
        return next
      })
    }
    
    const handleDataReceived = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload))
        if (data.type === 'finalized') {
          onFinalized()
        }
      } catch (e) {
        // ignore invalid JSON
      }
    }
    
    room.on(RoomEvent.TranscriptionReceived, handleTranscription)
    room.on(RoomEvent.DataReceived, handleDataReceived)
    
    return () => { 
      room.off(RoomEvent.TranscriptionReceived, handleTranscription) 
      room.off(RoomEvent.DataReceived, handleDataReceived)
    }
  }, [room])

  // Auto-scroll to bottom of transcript
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcripts])

  if (!agentFound) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-[var(--surface)] border border-[var(--rule)] rounded-sm">
        <AlertCircle className="h-8 w-8 text-[var(--error)] mb-4" />
        <h3 className="text-lg font-serif text-[var(--ink)] mb-2">Voice unavailable</h3>
        <p className="font-mono text-xs text-[var(--muted)] mb-6 text-center max-w-md">
          The AI Interviewer could not be reached. The service might be down or restarting.
        </p>
        <button
          onClick={onSwitchToText}
          className="inline-flex items-center gap-2 bg-[var(--ink)] text-[var(--paper)] px-6 py-2 font-mono text-xs uppercase tracking-widest"
        >
          <RefreshCcw className="h-4 w-4" /> Switch to Text Mode
        </button>
      </div>
    )
  }

  // Determine UI State
  let Icon = Loader2
  let statusText = 'CONNECTING...'
  let colorClass = 'text-[var(--muted)]'
  let isPulsing = false

  if (state === 'listening') {
    Icon = Mic
    statusText = 'LISTENING'
    colorClass = 'text-[var(--success)]'
    isPulsing = true
  } else if (state === 'thinking' || state === 'speaking' && agent?.isSpeaking === false) {
    Icon = BrainCircuit
    statusText = 'PROCESSING'
    colorClass = 'text-[var(--warning)]'
    isPulsing = true
  } else if (state === 'speaking') {
    Icon = Volume2
    statusText = 'SPEAKING'
    colorClass = 'text-[var(--info)]'
  }

  return (
    <div className="relative flex flex-col items-center justify-center py-12 px-4 bg-[var(--surface)] border border-[var(--rule)] rounded-sm min-h-[500px]">
      
      {/* Persistent Voice Mode Banner */}
      <div className="absolute top-4 left-4 inline-block bg-[var(--surface)] border border-[var(--rule)] px-3 py-1 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#b8860b] animate-pulse"></div>
          <h3 className="text-[10px] font-mono font-bold tracking-widest text-[#b8860b] uppercase">Voice Mode Active</h3>
        </div>
      </div>

      {/* End Session Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onSwitchToText}
          className="inline-flex items-center gap-2 bg-[var(--error)] text-white px-4 py-2 font-mono text-xs uppercase tracking-widest shadow-sm hover:opacity-90"
        >
          End Voice Session
        </button>
      </div>

      <div className="w-full max-w-2xl space-y-12">
        {/* Visualizer & Status */}
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className={`relative p-8 rounded-full border-2 transition-all duration-500 ${isPulsing ? 'border-[var(--success)] shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-[var(--rule)]'} bg-[var(--paper)]`}>
            {isPulsing && (
              <motion.div 
                className="absolute inset-0 rounded-full border border-[var(--success)]"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
            )}
            <Icon className={`w-12 h-12 ${colorClass} ${state === 'connecting' ? 'animate-spin' : ''}`} />
          </div>
          <div className="font-mono text-sm tracking-widest font-bold uppercase" style={{ color: 'var(--ink)' }}>
            <span className={colorClass}>[{statusText}]</span>
          </div>

          {state === 'speaking' && (
            <div className="h-8 w-32">
               <BarVisualizer state={state} barCount={5} options={{ minHeight: 4 }} trackRef={undefined as any} />
               {/* LiveKit BarVisualizer needs trackRef, but we can fake it or just use an animation */}
            </div>
          )}
        </div>

        {/* Live Captions Window */}
        <div className="border border-[var(--rule)] bg-[var(--paper)] p-4 h-48 overflow-y-auto rounded-sm relative">
          <div className="absolute top-0 left-0 bg-[var(--rule)] text-[var(--paper)] text-[10px] font-mono px-2 py-0.5 uppercase tracking-widest">
            Live Transcript
          </div>
          <div className="mt-4 space-y-3 font-mono text-sm">
            <AnimatePresence>
              {transcripts.map((t, i) => (
                <motion.div 
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${t.isAgent ? 'items-start' : 'items-end'}`}
                >
                  <span className={`text-[10px] uppercase tracking-widest mb-1 ${t.isAgent ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
                    {t.isAgent ? 'Interviewer' : 'Officer/Complainant'}
                  </span>
                  <p className={`p-2 rounded-sm max-w-[80%] ${t.isAgent ? 'bg-[var(--surface)] border border-[var(--rule)] text-[var(--ink)]' : 'bg-[#f1f5f9] text-[#0f172a]'}`}>
                    {t.text}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
            {transcripts.length === 0 && (
              <p className="text-[var(--muted)] text-center text-xs mt-12 uppercase tracking-widest">Waiting for speech...</p>
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
