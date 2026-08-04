import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Search } from 'lucide-react'
import DeleteFirButton from '@/components/DeleteFirButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: drafts } = await supabase
    .from('fir_drafts')
    .select('*')
    .order('created_at', { ascending: false })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).toUpperCase()
  }
  
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: false
    })
  }

  const safeDrafts = drafts || []
  const completedCount = safeDrafts.filter(d => d.status === 'finalized').length
  const pendingCount = safeDrafts.length - completedCount
  const todayCount = safeDrafts.filter(d => new Date(d.created_at).toDateString() === new Date().toDateString()).length

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b-2 border-[var(--ink)] pb-4">
        <div>
          <h1 className="text-3xl font-serif tracking-tight text-[var(--ink)]">Case Registry</h1>
          <p className="font-mono text-xs tracking-widest text-[var(--muted)] mt-2 uppercase">Official Investigation Records</p>
        </div>
        <div>
          <Link 
            href="/dashboard/new"
            className="inline-flex items-center gap-2 bg-[var(--ink)] px-6 py-2.5 text-xs font-mono font-bold uppercase tracking-widest text-[var(--paper)] hover:bg-[#0f172a] transition-colors rounded-sm"
          >
            [+] Initiate File
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[var(--rule)] bg-[var(--surface)]">
        {[
          { label: "TODAY'S INTAKE", value: todayCount },
          { label: "PENDING REVIEW", value: pendingCount },
          { label: "FINALIZED", value: completedCount },
          { label: "TOTAL RECORDS", value: safeDrafts.length }
        ].map((stat, idx) => (
          <div key={idx} className="p-4 border-r border-[var(--rule)] last:border-r-0 flex flex-col justify-between">
            <dt className="text-[10px] font-mono tracking-widest text-[var(--muted)] uppercase mb-2">{stat.label}</dt>
            <dd className="text-2xl font-serif text-[var(--ink)]">{stat.value.toString().padStart(2, '0')}</dd>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <div className="flex flex-col sm:flex-row items-end justify-between mb-6 gap-4">
          <div className="relative w-full max-w-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-[var(--muted)]" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full border-0 py-2 pl-9 text-[var(--ink)] bg-[var(--surface)] ring-1 ring-inset ring-[var(--rule)] placeholder:text-[var(--muted)] placeholder:font-mono placeholder:text-xs focus:ring-2 focus:ring-inset focus:ring-[var(--ink)] sm:text-sm rounded-sm"
              placeholder="SEARCH REGISTRY..."
            />
          </div>
          <div className="text-[10px] font-mono tracking-widest text-[var(--muted)] uppercase border-b border-[var(--rule)] border-dashed pb-1">
            Displaying {safeDrafts.length} Records
          </div>
        </div>

        {!drafts || drafts.length === 0 ? (
          <div className="text-center border border-[var(--rule)] bg-[var(--surface)] px-6 py-24 rounded-sm">
            <p className="font-mono text-sm text-[var(--muted)] uppercase tracking-widest mb-4">NO RECORDS FOUND IN REGISTRY</p>
            <Link 
              href="/dashboard/new"
              className="inline-flex items-center gap-2 border border-[var(--rule)] bg-[var(--paper)] px-6 py-2 text-xs font-mono font-bold uppercase tracking-widest text-[var(--ink)] hover:bg-[var(--rule)]/20 transition-colors rounded-sm"
            >
              Initiate First File
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((draft, idx) => (
              <div key={draft.id} className="group relative bg-[var(--surface)] border border-[var(--rule)] hover:border-[var(--ink)] transition-colors rounded-sm p-5 flex flex-col md:flex-row gap-4 md:items-center justify-between">
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Status Indicator */}
                  <div className="md:col-span-1 flex items-center justify-center">
                    {draft.status === 'finalized' ? (
                       <div className="h-6 w-6 rounded-full border-2 border-[var(--stamp)] flex items-center justify-center opacity-80" title="Finalized">
                         <div className="h-3 w-3 bg-[var(--stamp)] rounded-full"></div>
                       </div>
                    ) : (
                       <div className="h-6 w-6 rounded-full border-2 border-[var(--warning)] flex items-center justify-center opacity-80" title="Pending">
                         <div className="h-3 w-3 border-2 border-[var(--warning)] rounded-full"></div>
                       </div>
                    )}
                  </div>

                  {/* ID and Date */}
                  <div className="md:col-span-3 flex flex-col">
                    <span className="font-mono text-sm font-bold text-[var(--ink)]">
                      {draft.id.split('-')[0].toUpperCase()}
                    </span>
                    <span className="font-mono text-[10px] tracking-widest text-[var(--muted)]">
                      {formatDate(draft.created_at)} {formatTime(draft.created_at)}
                    </span>
                  </div>

                  {/* Type and Subject */}
                  <div className="md:col-span-5 flex flex-col border-l-2 border-[var(--rule)] pl-4">
                    <h3 className="font-serif text-base text-[var(--ink)]">
                      {draft.incident_type ? draft.incident_type.replace(/_/g, ' ').toUpperCase() : 'UNCLASSIFIED'}
                    </h3>
                    <p className="font-mono text-xs text-[var(--muted)] uppercase truncate">
                      REF: {draft.complainant?.name || draft.complainant_name || 'UNKNOWN COMPLAINANT'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="md:col-span-3 flex items-center justify-end gap-4 mt-4 md:mt-0 border-t md:border-t-0 border-[var(--rule)] border-dashed pt-4 md:pt-0">
                    <Link 
                      href={`/dashboard/draft/${draft.id}`}
                      className="font-mono text-xs font-bold text-[var(--ink)] border-b border-[var(--ink)] pb-0.5 hover:text-[var(--stamp)] hover:border-[var(--stamp)] transition-colors uppercase tracking-wider"
                    >
                      OPEN FILE
                    </Link>
                    <DeleteFirButton draftId={draft.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
