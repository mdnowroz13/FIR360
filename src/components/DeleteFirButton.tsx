'use client'

import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteFirDraft } from '@/app/actions/fir'
import { useRouter } from 'next/navigation'

export default function DeleteFirButton({ draftId }: { draftId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (confirm('Are you sure you want to delete this FIR draft? This action cannot be undone.')) {
      setIsDeleting(true)
      try {
        await deleteFirDraft(draftId)
        router.refresh()
      } catch (error) {
        console.error(error)
        alert('Failed to delete FIR draft')
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
