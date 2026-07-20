import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup'

export function Auth() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)

    const { error } =
      mode === 'signup'
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password })

    // On success we do nothing: onAuthStateChange fires and useSession
    // swaps this form out for the app.
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-200 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-semibold text-white">commit-life</h1>
        <p className="text-sm text-neutral-400">
          {mode === 'signup' ? 'Create your account.' : 'Sign in to continue.'}
        </p>

        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 outline-none focus:border-green-600"
        />

        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 6 characters)"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 outline-none focus:border-green-600"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-green-600 px-3 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
        >
          {busy ? 'Working…' : mode === 'signup' ? 'Sign up' : 'Sign in'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signup' ? 'signin' : 'signup')
            setError(null)
          }}
          className="w-full text-sm text-neutral-400 hover:text-neutral-200"
        >
          {mode === 'signup'
            ? 'Already have an account? Sign in'
            : 'Need an account? Sign up'}
        </button>
      </form>
    </main>
  )
}
