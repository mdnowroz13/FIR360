import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Shield } from 'lucide-react'
import { signOut } from '@/app/actions/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Ensure officer profile exists
  const { data: officer } = await supabase
    .from('officers')
    .select('*')
    .eq('id', user.id)
    .single()
    
  if (!officer) {
    // Create empty profile if it doesn't exist
    await supabase.from('officers').insert({
      id: user.id,
      name: user.user_metadata?.full_name || user.email,
    })
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] font-sans selection:bg-[var(--brass)]/30">
      <header className="sticky top-0 z-50 bg-[var(--surface)] border-b border-[var(--rule)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-[var(--ink)]" strokeWidth={1.5} />
                <Link href="/dashboard" className="text-xl font-serif font-bold tracking-tight text-[var(--ink)]">
                  FIR360 <span className="font-mono text-xs font-normal tracking-widest text-[var(--muted)] ml-2 uppercase hidden sm:inline-block">/ Official Registry</span>
                </Link>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col items-end text-right">
                  <p className="font-mono text-sm text-[var(--ink)] leading-none uppercase">{user.user_metadata?.full_name || user.email}</p>
                  <p className="font-mono text-xs text-[var(--muted)] mt-1 leading-none uppercase">Investigating Officer</p>
                </div>
                <form action={signOut}>
                  <button 
                    type="submit"
                    suppressHydrationWarning={true}
                    className="p-2 text-[var(--ink)] hover:text-[var(--stamp)] hover:bg-[var(--rule)]/20 transition-colors ml-2 border border-transparent hover:border-[var(--rule)] rounded-sm flex items-center justify-center"
                    title="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {children}
      </main>
    </div>
  )
}
