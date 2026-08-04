import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import NarrativeCapture from '@/components/NarrativeCapture'

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
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
    <div className="mx-auto max-w-4xl h-[calc(100vh-90px)] flex flex-col pb-4">
      <div className="bg-white shadow sm:rounded-lg flex-1 flex flex-col">
        <div className="px-2 py-4 sm:p-6 flex-1 flex flex-col min-h-0">
          <NarrativeCapture draftId={draft.id} initialTranscript={draft.raw_transcript} />
        </div>
      </div>
    </div>
  )
}
