import type { Session, User } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { startGoogleSignIn, watchUser } from './authCore'

const user = { id: 'u1', email: 'me@gmail.com' } as User

function fakeClient(opts: { session?: Session | null; getSessionFails?: boolean } = {}) {
  let listener: (event: string, session: Session | null) => void = () => {}
  const unsubscribe = vi.fn()
  const client = {
    auth: {
      getSession: vi.fn(async () => {
        if (opts.getSessionFails) throw new Error('offline')
        return { data: { session: opts.session ?? null } }
      }),
      onAuthStateChange: vi.fn((cb: typeof listener) => {
        listener = cb
        return { data: { subscription: { unsubscribe } } }
      }),
      signInWithOAuth: vi.fn(async () => ({ error: null as Error | null })),
    },
  }
  return { client: client as never, auth: client.auth, emit: (e: string, s: Session | null) => listener(e, s), unsubscribe }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('watchUser', () => {
  it('reports null when there is no stored session', async () => {
    const { client } = fakeClient()
    const seen: (User | null)[] = []
    watchUser(client, (u) => seen.push(u))
    await flush()
    expect(seen).toEqual([null])
  })

  it('reports the user from a stored session', async () => {
    const { client } = fakeClient({ session: { user } as Session })
    const seen: (User | null)[] = []
    watchUser(client, (u) => seen.push(u))
    await flush()
    expect(seen).toEqual([user])
  })

  it('follows sign-in and an explicit sign-out', async () => {
    const f = fakeClient()
    const seen: (User | null)[] = []
    watchUser(f.client, (u) => seen.push(u))
    await flush()
    f.emit('SIGNED_IN', { user } as Session)
    f.emit('SIGNED_OUT', null)
    expect(seen).toEqual([null, user, null])
  })

  it('stays signed in when a token refresh fails offline (no session, event is not SIGNED_OUT)', async () => {
    const f = fakeClient({ session: { user } as Session })
    const seen: (User | null)[] = []
    watchUser(f.client, (u) => seen.push(u))
    await flush()
    f.emit('TOKEN_REFRESHED', null)
    expect(seen).toEqual([user])
  })

  it('treats an unreadable session as signed out, and stops reporting after unsubscribe', async () => {
    const f = fakeClient({ getSessionFails: true })
    const seen: (User | null)[] = []
    const stop = watchUser(f.client, (u) => seen.push(u))
    await flush()
    expect(seen).toEqual([null])
    stop()
    f.emit('SIGNED_IN', { user } as Session)
    expect(seen).toEqual([null])
    expect(f.unsubscribe).toHaveBeenCalled()
  })
})

describe('startGoogleSignIn', () => {
  it('asks Supabase for a Google redirect back to the site root', async () => {
    const f = fakeClient()
    await startGoogleSignIn(f.client, 'https://site.example')
    expect(f.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'https://site.example/' } })
  })

  it('throws when Supabase reports an error', async () => {
    const f = fakeClient()
    f.auth.signInWithOAuth.mockResolvedValueOnce({ error: new Error('provider disabled') })
    await expect(startGoogleSignIn(f.client, 'https://site.example')).rejects.toThrow('provider disabled')
  })
})
