import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** False when the two env vars are missing; the login screen then explains instead of showing a dead button. */
export const isAuthConfigured = Boolean(url && key)

// PKCE, not the implicit flow: implicit puts tokens in the URL hash, which collides with HashRouter.
// PKCE returns to `/?code=...`; the client swaps the code for a session and removes it from the URL.
export const supabase = createClient(url || 'https://not-configured.invalid', key || 'not-configured', {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
