'use client'

import * as React from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: 'Login link expired or invalid. Please request a new one.',
  tenant_creation_failed: 'Account setup failed — the database migration may not have been run. See setup instructions.',
  tenant_link_failed: 'Account setup failed — could not link your user to a workspace.',
}

export default function LoginPage() {
  const [email, setEmail] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [error, setError] = React.useState('')
  const router = useRouter()

  // Show errors passed back from auth callback
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (err) setError(ERROR_MESSAGES[err] ?? `Login error: ${err}`)
  }, [])
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold mx-auto">
            V
          </div>
          <h1 className="text-2xl font-bold">v_tech</h1>
          <p className="text-muted-foreground text-sm">AI-native ERP for manufacturing</p>
        </div>

        {sent ? (
          <div className="text-center space-y-3 bg-muted/50 rounded-xl p-6">
            <Mail className="h-10 w-10 mx-auto text-primary" />
            <p className="font-medium">Check your email</p>
            <p className="text-sm text-muted-foreground">
              We sent a magic link to <span className="font-medium">{email}</span>
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-sm text-primary hover:underline"
            >
              Try a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email address</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending...</>
              ) : (
                <>Send magic link</>
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          No password needed · Secure magic link login
        </p>
      </div>
    </div>
  )
}
