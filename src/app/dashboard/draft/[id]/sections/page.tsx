import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SectionReview from '@/components/SectionReview'

export default async function SectionsPage({ params }: { params: Promise<{ id: string }> }) {
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
          Legal Section Application
        </h2>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">
          Step 3: Review AI-suggested BNS sections based on the narrative and confirm applicable charges.
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <SectionReview draft={draft} />
        </div>
      </div>
    </div>
  )
}
