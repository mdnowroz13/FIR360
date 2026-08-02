import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { PlusCircle, Clock, CheckCircle } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: drafts } = await supabase
    .from('fir_drafts')
    .select('*')
    .order('created_at', { ascending: false })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Your FIR Drafts</h1>
        <Link 
          href="/dashboard/new"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <PlusCircle className="h-4 w-4" />
          Create New FIR
        </Link>
      </div>

      {!drafts || drafts.length === 0 ? (
        <div className="text-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No FIR drafts</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new FIR.</p>
        </div>
      ) : (
        <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-200 sm:rounded-xl">
          <ul role="list" className="divide-y divide-gray-200">
            {drafts.map((draft) => (
              <li key={draft.id} className="relative flex justify-between gap-x-6 px-4 py-5 hover:bg-gray-50 sm:px-6">
                <div className="flex min-w-0 gap-x-4">
                  <div className="min-w-0 flex-auto">
                    <p className="text-sm font-semibold leading-6 text-gray-900">
                      <Link href={`/dashboard/draft/${draft.id}`}>
                        <span className="absolute inset-x-0 -top-px bottom-0" />
                        {draft.incident_type 
                          ? `${draft.incident_type.replace('_', ' ').toUpperCase()} Incident`
                          : 'Unclassified Draft'}
                      </Link>
                    </p>
                    <p className="mt-1 flex text-xs leading-5 text-gray-500">
                      {draft.complainant_name ? `Complainant: ${draft.complainant_name}` : 'Unknown Complainant'}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-x-4">
                  <div className="hidden sm:flex sm:flex-col sm:items-end">
                    <p className="text-sm leading-6 text-gray-900">
                      {formatDate(draft.created_at)}
                    </p>
                    {draft.status === 'finalized' ? (
                      <div className="mt-1 flex items-center gap-x-1.5 text-xs leading-5 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Finalized</span>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-center gap-x-1.5 text-xs leading-5 text-amber-500">
                        <Clock className="h-4 w-4" />
                        <span>Draft</span>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

import { FileText } from 'lucide-react'
