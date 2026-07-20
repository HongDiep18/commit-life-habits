import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * Tracks the current login session.
 *
 * `loading` is true only while we check for an existing session on first
 * mount. Without it the app would flash the login form for a moment on
 * every refresh, even when already signed in.
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Was there a session left over from last time? It lives in localStorage.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    // Then keep listening: sign in, sign out, token refresh all land here.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return { session, loading }
}
