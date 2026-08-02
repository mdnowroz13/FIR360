import { createFirDraft } from '@/app/actions/fir'

export default async function NewFirPage() {
  // Execute the action immediately when this page loads
  await createFirDraft()
  
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p className="mt-4 text-sm text-gray-600">Creating new FIR draft...</p>
      </div>
    </div>
  )
}
