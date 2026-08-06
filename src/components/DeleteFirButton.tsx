'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteFirDraft } from '@/app/actions/fir'
import { useRouter } from 'next/navigation'
import { useDialog } from '@/components/DialogProvider'

export default function DeleteFirButton({ draftId }: { draftId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { showConfirm, showAlert } = useDialog()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const confirmed = await showConfirm('Delete File', 'Are you sure you want to permanently delete this FIR draft? This action cannot be undone.')
    
    if (confirmed) {
      setIsDeleting(true)
      try {
        await deleteFirDraft(draftId)
        router.refresh()
      } catch (error) {
        console.error(error)
        await showAlert('Error', 'Failed to delete FIR draft.')
        setIsDeleting(false)
      }
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 text-gray-400 hover:text-red-600 transition-colors z-10 relative"
      title="Delete FIR"
      suppressHydrationWarning
    >
      {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
    </button>
  )
}
