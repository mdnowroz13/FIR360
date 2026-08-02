import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, LogOut, User as UserIcon } from 'lucide-react'
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              <Link href="/dashboard" className="text-xl font-bold text-gray-900 tracking-tight">
                FIR Assistant
              </Link>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <UserIcon className="h-4 w-4" />
                <span>{user.user_metadata?.full_name || user.email}</span>
              </div>
              <form action={signOut}>
                <button 
                  type="submit"
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
