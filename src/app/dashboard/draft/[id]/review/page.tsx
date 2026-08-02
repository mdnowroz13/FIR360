import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import FIRReview from '@/components/FIRReview'

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: officer } = await supabase
    .from('officers')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: draft } = await supabase
    .from('fir_drafts')
    .select('*')
    .eq('id', id)
    .single()

  if (!draft) {
    redirect('/dashboard')
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20">
      <div className="border-b border-gray-200 pb-5">
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Final Review & Generation
        </h2>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">
          Step 4: Review all extracted details, confirm accuracy, and generate the official FIR document.
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <FIRReview draft={draft} officer={officer} />
        </div>
      </div>
    </div>
  )
}
