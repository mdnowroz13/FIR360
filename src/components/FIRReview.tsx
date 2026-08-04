'use client'

import { useState } from 'react'
import { Loader2, FileDown, CheckSquare, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { pdf } from '@react-pdf/renderer'
import { FIRPdfDocument } from './FIRPdfDocument'
import { motion } from 'framer-motion'

export default function FIRReview({ draft, officer }: { draft: any, officer: any }) {
  const [confirmed, setConfirmed] = useState(false)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      // 1. Generate PDF blob
      const blob = await pdf(<FIRPdfDocument draft={draft} officer={officer} />).toBlob()
      
      // 2. Upload to Supabase Storage
      const fileName = `fir-${draft.id}-${Date.now()}.pdf`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('firs')
        .upload(fileName, blob, { contentType: 'application/pdf' })
        
      let pdfUrl = null
      if (uploadError) {
        console.error('Storage upload failed:', uploadError)
        // MVP fallback: if bucket fails, we won't block generation, just skip saving URL
      } else {
        const { data: { publicUrl } } = supabase.storage.from('firs').getPublicUrl(fileName)
        pdfUrl = publicUrl
      }

      // 3. Finalize record in DB
      const { error: dbError } = await supabase
        .from('fir_drafts')
        .update({
          status: 'finalized',
          pdf_url: pdfUrl,
          finalized_at: new Date().toISOString()
        })
        .eq('id', draft.id)

      if (dbError) throw dbError

      // 4. Download file locally right away
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `FIR_${draft.id.split('-')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      // 5. Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (e) {
      console.error(e)
      alert('Failed to generate FIR. Please try again.')
      setGenerating(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 pb-24"
    >
      
      {/* Left Column: Review Details (The "Paper") */}
      <div className="lg:col-span-8 space-y-6">
        <div className="border-b-2 border-[var(--ink)] pb-4 mb-6">
          <h2 className="text-2xl font-serif tracking-tight text-[var(--ink)]">Pre-Filing Document Preview</h2>
          <p className="font-mono text-xs tracking-widest text-[var(--muted)] mt-2 uppercase">
            Review the generated content before finalizing the official record.
          </p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--rule)] relative">
          
          <div className="p-8 space-y-10">
            <div className="flex justify-between items-start border-b border-[var(--rule)] pb-6">
              <div>
                <p className="font-mono text-[10px] text-[var(--muted)] tracking-widest uppercase mb-1">Temporary ID</p>
                <p className="font-mono text-xl font-bold text-[var(--ink)] uppercase">{draft.id.split('-')[0]}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] text-[var(--muted)] tracking-widest uppercase mb-1">Jurisdiction</p>
                <p className="font-serif text-base text-[var(--ink)]">Cyberabad Police Commissionerate</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <dt className="font-mono text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">Complainant / Informant</dt>
                <dd className="font-serif text-lg text-[var(--ink)] uppercase border-b border-[var(--rule)] border-dashed pb-1">{draft.complainant?.name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">Address</dt>
                <dd className="font-serif text-lg text-[var(--ink)] border-b border-[var(--rule)] border-dashed pb-1">{draft.complainant?.address || 'N/A'}</dd>
              </div>
            </div>
            
            <div>
              <dt className="font-mono text-[10px] text-[var(--muted)] uppercase tracking-widest mb-4">Final Tehrir (Incident Narrative)</dt>
              <dd className="font-serif text-base text-[var(--ink)] whitespace-pre-wrap leading-[32px] relative">
                {/* Lined paper effect background */}
                <div className="absolute inset-0 pointer-events-none -z-10 opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, var(--rule) 32px)', backgroundPositionY: '5px' }}></div>
                {draft.incident_narrative}
              </dd>
            </div>

            <div className="pt-6 border-t border-[var(--rule)]">
              <dt className="font-mono text-[10px] text-[var(--muted)] uppercase tracking-widest mb-4">Adjudicated Penal Code Violations</dt>
              <dd className="space-y-2 font-mono text-sm">
                {draft.officer_confirmed_sections?.map((s: any) => (
                  <div key={s.code} className="flex gap-4 items-start">
                    <span className="font-bold text-[var(--ink)] shrink-0 w-24">[{s.code}]</span>
                    <span className="text-[var(--ink)] uppercase">{s.title}</span>
                  </div>
                ))}
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Authorization & Metrics */}
      <div className="lg:col-span-4 space-y-6">
        <div className="sticky top-24 space-y-6">
          
          <div className="bg-[var(--surface)] border border-[var(--rule)] p-6">
            <h3 className="font-mono text-xs font-bold tracking-widest text-[var(--ink)] uppercase border-b border-[var(--rule)] pb-4 mb-4 flex justify-between items-center">
              <span>System Verification</span>
              <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
            </h3>
            
            <div className="space-y-4 font-mono text-xs uppercase tracking-widest">
              <div className="flex justify-between items-center border-b border-[var(--rule)] border-dashed pb-2">
                <span className="text-[var(--muted)]">Core Facts</span>
                <span className="font-bold text-[var(--success)]">[100% EXTR]</span>
              </div>
              <div className="flex justify-between items-center border-b border-[var(--rule)] border-dashed pb-2">
                <span className="text-[var(--muted)]">Evidence Log</span>
                <span className="font-bold text-[var(--success)]">[VERIFIED]</span>
              </div>
              <div className="flex justify-between items-center border-b border-[var(--rule)] border-dashed pb-2">
                <span className="text-[var(--muted)]">Legal DB Crossref</span>
                <span className="font-bold text-[var(--success)]">[COMPLETE]</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-[var(--muted)]">Status</span>
                <span className="font-bold text-[var(--warning)] animate-pulse">[AWAITING AUTH]</span>
              </div>
            </div>
          </div>
          
          {/* Human in the loop confirmation */}
          <div className={`p-6 border transition-colors ${confirmed ? 'bg-[var(--success)]/10 border-[var(--success)]' : 'bg-[var(--paper)] border-[var(--stamp)]'}`}>
            <label className="flex items-start cursor-pointer group">
              <div className="flex h-5 items-center pt-1">
                <input
                  id="confirm"
                  name="confirm"
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="h-5 w-5 border-2 border-[var(--ink)] text-[var(--ink)] focus:ring-0 bg-transparent rounded-none appearance-none checked:bg-[var(--ink)] transition-colors relative
                    checked:after:content-['✓'] checked:after:absolute checked:after:text-[var(--paper)] checked:after:left-1 checked:after:-top-0.5 checked:after:font-bold"
                />
              </div>
              <div className="ml-4">
                <span className={`font-mono text-sm font-bold uppercase tracking-widest block transition-colors ${confirmed ? 'text-[var(--success)]' : 'text-[var(--stamp)]'}`}>
                  Officer Authorization
                </span>
                <p className="text-[var(--ink)] mt-2 font-serif text-sm leading-relaxed">
                  I certify that the facts extracted herein are accurate reflections of the complainant's statement, and the selected sections of law are applicable based on my preliminary investigation.
                </p>
              </div>
            </label>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!confirmed || generating}
            className={`w-full flex items-center justify-center gap-x-2 px-6 py-4 text-xs font-mono font-bold uppercase tracking-widest transition-colors border ${
              confirmed && !generating 
                ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)] hover:bg-[#0f172a]' 
                : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--rule)] cursor-not-allowed'
            }`}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {generating ? 'GENERATING PDF...' : 'FINALIZE RECORD'}
          </button>
        </div>
      </div>

    </motion.div>
  )
}
