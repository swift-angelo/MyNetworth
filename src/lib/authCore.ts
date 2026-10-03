import type { SupabaseClient, User } from '@supabase/supabase-js'

type AuthClient = Pick<SupabaseClient, 'auth'>

/**
 * Reports the signed-in user (or null) now and on every change; returns an unsubscribe.
 * A stored session counts as signed in even offline: only an explicit SIGNED_OUT (never a failed token refresh) ends it.
 */
export function watchUser(client: AuthClient, onUser: (user: User | null) => void): () => void {
  let live = true
  const apply = (u: User | null) => {
    if (live) onUser(u)
  }
  client.auth
    .getSession()
    .then(({ data }) => apply(data.session?.user ?? null))
    .catch(() => apply(null))
  const { data } = client.auth.onAuthStateChange((event, session) => {
    if (session) apply(session.user)
    else if (event === 'SIGNED_OUT') apply(null)
  })
  return () => {
    live = false
    data.subscription.unsubscribe()
  }
}

/** Full-page redirect to Google (no popup: popups are unreliable in home-screen apps). Throws on failure. */
export async function startGoogleSignIn(client: AuthClient, origin: string): Promise<void> {
  const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/' } })
  if (error) throw error
}
