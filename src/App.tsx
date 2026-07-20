import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useSession } from './lib/useSession'
import { Auth } from './components/Auth'

type Status =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ok'; rows: number }

function App() {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-500 flex items-center justify-center">
        Loading…
      </main>
    )
  }

  if (!session) return <Auth />

  return <Home email={session.user.email ?? ''} />
}

function Home({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>({ state: 'loading' })

  useEffect(() => {
    supabase
      .from('tracker_object')
      .select('id', { count: 'exact', head: true })
      .then(({ error, count }) => {
        if (error) setStatus({ state: 'error', message: error.message })
        else setStatus({ state: 'ok', rows: count ?? 0 })
      })
  }, [])

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-200 p-6">
      <div className="mx-auto max-w-md space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-white">commit-life</h1>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-neutral-400 hover:text-neutral-200"
          >
            Sign out
          </button>
        </header>

        <p className="text-sm text-neutral-500">Signed in as {email}</p>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 space-y-2">
          <p className="text-sm text-neutral-400">Supabase connection</p>

          {status.state === 'loading' && <p>Checking…</p>}

          {status.state === 'error' && (
            <p className="text-red-400 font-mono text-sm">{status.message}</p>
          )}

          {status.state === 'ok' && (
            <p className="text-green-400">
              Read {status.rows} row{status.rows === 1 ? '' : 's'} from
              tracker_object
            </p>
          )}
        </div>
      </div>
    </main>
  )
}

export default App
