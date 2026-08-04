'use client'

import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'
import { Loader2, Shield } from 'lucide-react'

export default function LoginPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    
    if (error) {
      console.error('Error logging in:', error.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--paper)] px-4 sm:px-6 lg:px-8 selection:bg-[var(--brass)]/30">
      <div className="w-full max-w-sm border border-[var(--rule)] bg-[var(--surface)] p-10 relative">
        {/* Subtle decorative "official" corner marker */}
        <div className="absolute top-0 right-0 w-8 h-8 border-l border-b border-[var(--rule)] bg-[var(--paper)] flex items-center justify-center">
          <span className="text-[8px] font-mono text-[var(--muted)]">AUTH</span>
        </div>
        
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="flex flex-col items-center gap-2">
            <Shield className="h-10 w-10 text-[var(--ink)]" strokeWidth={1.5} />
            <span className="text-xl font-serif font-bold tracking-tight text-[var(--ink)]">FIR360</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-serif tracking-tight text-[var(--ink)]">Officer Login</h2>
            <p className="text-xs font-mono uppercase tracking-widest text-[var(--muted)] border-b border-[var(--rule)] border-dashed pb-2 inline-block">
              Authorized Personnel Only
            </p>
          </div>
        </div>
        
        <div className="pt-10">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--ink)] border border-[var(--rule)] hover:bg-[var(--rule)]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--stamp)] disabled:opacity-50 transition-colors rounded-sm"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
            ) : (
              <svg className="h-4 w-4 grayscale opacity-80" aria-hidden="true" viewBox="0 0 24 24">
                <path
                  d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                  fill="#EA4335"
                />
                <path
                  d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                  fill="#4285F4"
                />
                <path
                  d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                  fill="#FBBC05"
                />
                <path
                  d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                  fill="#34A853"
                />
              </svg>
            )}
            Sign in with Google
          </button>
          
          <div className="mt-8 text-center text-xs font-mono text-[var(--muted)] space-y-1">
            <p>PROTECTED BY GOVT-GRADE ENCRYPTION</p>
            <p>ALL ACCESS IS LOGGED AND MONITORED</p>
          </div>
        </div>
      </div>
    </div>
  )
}
