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
export async function deleteFirDraft(draftId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  // Fetch the draft to potentially delete the PDF from storage if finalized
  const { data: draft } = await supabase
    .from('fir_drafts')
    .select('pdf_url')
    .eq('id', draftId)
    .single()

  if (draft?.pdf_url) {
    // Extract filename from URL and delete from storage
    const fileName = draft.pdf_url.split('/').pop()
    if (fileName) {
      await supabase.storage.from('firs').remove([fileName])
    }
  }

  // Delete child records first to avoid foreign key constraint errors
  await supabase
    .from('fir_interview_questions')
    .delete()
    .eq('fir_draft_id', draftId)

  // Delete the DB record
  const { error } = await supabase
    .from('fir_drafts')
    .delete()
    .eq('id', draftId)
    .eq('officer_id', user.id)

  if (error) {
    console.error('Error deleting draft:', error)
    throw new Error('Failed to delete FIR draft')
  }
}
