import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import InterviewCapture from '@/components/InterviewCapture'
import { AlertTriangle } from 'lucide-react'

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: draft } = await supabase
    .from('fir_drafts')
    .select('*')
    .eq('id', id)
    .single()

  if (!draft) {
    redirect('/dashboard')
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="border-b border-gray-200 pb-5">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          AI Investigative Interview
        </h2>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">
          Step 2: Collect specific details based on the initial narrative.
        </p>
      </div>

      {draft.sensitivity_flag && draft.recommended_protocol && (
        <div className="rounded-md bg-red-50 p-4 shadow-sm border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Sensitive Case Protocol Recommended</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{draft.recommended_protocol}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <InterviewCapture draftId={draft.id} />
        </div>
      </div>
    </div>
  )
}
