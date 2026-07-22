import { useState } from 'react'
import { supabase } from './lib/supabase'
import { useSession } from './lib/useSession'
import { Auth } from './components/Auth'
import { Objects } from './components/Objects'
import { Today } from './components/Today'
import { Grid } from './components/Grid'

type Tab = 'grid' | 'today' | 'objects'

function App() {
  const { session, loading } = useSession()
  const [tab, setTab] = useState<Tab>('grid')

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-500 flex items-center justify-center">
        Loading…
      </main>
    )
  }

  if (!session) return <Auth />

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

        <p className="text-sm text-neutral-500">
          Signed in as {session.user.email ?? ''}
        </p>

        <nav className="flex gap-2">
          <TabButton active={tab === 'grid'} onClick={() => setTab('grid')}>
            Grid
          </TabButton>
          <TabButton active={tab === 'today'} onClick={() => setTab('today')}>
            Today
          </TabButton>
          <TabButton
            active={tab === 'objects'}
            onClick={() => setTab('objects')}
          >
            Objects
          </TabButton>
        </nav>

        {tab === 'grid' && <Grid />}
        {tab === 'today' && <Today />}
        {tab === 'objects' && <Objects />}
      </div>
    </main>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={
        'rounded-md px-3 py-1.5 text-sm font-medium ' +
        (active
          ? 'bg-neutral-800 text-white'
          : 'text-neutral-400 hover:text-neutral-200')
      }
    >
      {children}
    </button>
  )
}

export default App
