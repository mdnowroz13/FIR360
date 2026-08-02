'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function createFirDraft() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: draft, error } = await supabase
    .from('fir_drafts')
    .insert({
      officer_id: user.id,
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating draft:', error)
    throw new Error('Failed to create FIR draft')
  }

  redirect(`/dashboard/draft/${draft.id}`)
}
