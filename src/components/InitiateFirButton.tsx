'use client'

import { useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { createFirDraft } from '@/app/actions/fir'
import { useRouter } from 'next/navigation'
import { useDialog } from '@/components/DialogProvider'

interface InitiateFirButtonProps {
  className?: string
  children: React.ReactNode
}

export default function InitiateFirButton({ className, children }: InitiateFirButtonProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { showAlert } = useDialog()

  const handleClick = () => {
    startTransition(async () => {
      try {
        const newDraftId = await createFirDraft()
        router.push(`/dashboard/draft/${newDraftId}`)
      } catch (error) {
        console.error('Failed to initiate FIR:', error)
        showAlert('System Error', 'Failed to initiate a new FIR. Please try again.')
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  )
}
