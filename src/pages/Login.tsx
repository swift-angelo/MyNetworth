import { useState } from 'react'
import { Spinner } from '../components/ui'
import { useAuth } from '../lib/auth'
import { isAuthConfigured } from '../lib/supabase'

/** Google's multicolour "G" (brand artwork, must keep its own colours). */
function GoogleG() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

/** Error text Supabase puts in the URL when a sign-in is cancelled or rejected (`?error_description=...`). */
function urlError(): string {
  const p = new URLSearchParams(window.location.search)
  return p.get('error_description') ?? ''
}

export default function Login() {
  const { signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(urlError)

  async function onGoogle() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await signInWithGoogle() // navigates away to Google; the spinner stays until the page unloads
    } catch (e) {
      setError((e as Error).message || 'Could not start Google sign-in')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col px-6 pb-10 pt-[env(safe-area-inset-top)]">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <img src="/icon-192.png" alt="WealthRadar" className="h-24 w-24 rounded-[28px] shadow-[0_16px_36px_rgba(7,97,5,0.3)]" />
        <h1 className="mt-6 text-[32px] font-bold tracking-tight">WealthRadar</h1>
        <p className="mt-2 max-w-[280px] text-base leading-snug text-text-950/70">Track every peso across your banks and wallets, in one place.</p>
      </div>

      <div className="glass rounded-[30px] px-5 pb-5 pt-6">
        <h2 className="text-center text-xl font-bold tracking-tight">Sign in or create an account</h2>
        <p className="mt-1.5 text-center text-sm text-text-950/70">New here? Continuing with Google creates your account.</p>

        {isAuthConfigured ? (
          <button
            type="button"
            onClick={onGoogle}
            disabled={busy}
            className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-[18px] border border-text-950/15 bg-white text-[17px] font-semibold text-[#041801] shadow-[0_8px_24px_rgba(4,24,1,0.12)] transition active:scale-[0.98] disabled:opacity-100"
          >
            {busy ? <Spinner /> : <GoogleG />}
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </button>
        ) : (
          <p className="mt-5 rounded-[12px] border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            Sign-in isn't configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 text-center text-sm text-danger">
            {error}
          </p>
        )}
        <p className="mt-4 text-center text-xs leading-relaxed text-text-950/65">Your entries stay on this device. Google only confirms who you are.</p>
      </div>
    </div>
  )
}
