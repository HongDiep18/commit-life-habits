import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check .env, then restart the dev server.',
  )
}

// One client for the whole app. Everything imports this same instance so
// they share a connection and, more importantly, the same login session.
export const supabase = createClient(url, key)
