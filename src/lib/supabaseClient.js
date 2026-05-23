import { createClient } from '@supabase/supabase-js'

/**
 * Browser Supabase client. Returns null when env vars are not configured
 * (app falls back to bundled sample CSVs).
 */
export function getSupabaseClient() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return null
  }

  return createClient(url, anonKey)
}
