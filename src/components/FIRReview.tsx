'use client'

import { useState } from 'react'
import { Loader2, Download, CheckSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { pdf } from '@react-pdf/renderer'
import { FIRPdfDocument } from './FIRPdfDocument'

export default function FIRReview({ draft, officer }: { draft: any, officer: any }) {
  const [confirmed, setConfirmed] = useState(false)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // For a real app we'd allow editing fields here, but for MVP we display them
  // as read-only and require explicit confirmation.
  
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
    <div className="space-y-8">
      {/* Read-only view of the data */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-sm font-medium text-gray-500">Confirmed Legal Sections</dt>
          <dd className="mt-1 text-sm text-gray-900">
            <ul className="list-disc pl-5">
              {draft.officer_confirmed_sections?.map((s: any) => (
                <li key={s.code}><span className="font-semibold">{s.code}</span>: {s.title}</li>
              ))}
            </ul>
          </dd>
        </div>

        <div>
          <dt className="text-sm font-medium text-gray-500">Complainant Name</dt>
          <dd className="mt-1 text-sm text-gray-900">{draft.complainant_name || 'N/A'}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500">Contact</dt>
          <dd className="mt-1 text-sm text-gray-900">{draft.complainant_contact || 'N/A'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-sm font-medium text-gray-500">Incident Narrative</dt>
          <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap rounded-md bg-gray-50 p-4 border border-gray-200">
            {draft.incident_narrative}
          </dd>
        </div>
      </div>

      {/* Human in the loop confirmation */}
      <div className="rounded-md bg-blue-50 p-4 border border-blue-200">
        <div className="flex items-start">
          <div className="flex h-6 items-center">
            <input
              id="confirm"
              name="confirm"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
            />
          </div>
          <div className="ml-3 text-sm leading-6">
            <label htmlFor="confirm" className="font-medium text-blue-900">
              I have reviewed and confirm the above
            </label>
            <p className="text-blue-700">By checking this box, you certify that the extracted details and legal sections are accurate based on your investigative judgment.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleGenerate}
          disabled={!confirmed || generating}
          className="inline-flex items-center gap-x-2 rounded-md bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          {generating ? 'Generating PDF...' : 'Finalize & Download FIR PDF'}
        </button>
      </div>
    </div>
  )
}
