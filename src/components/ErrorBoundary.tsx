import { Component, type ReactNode } from 'react'

/** Clears the service worker and its caches (never the saved entries), then reloads. */
export async function resetAppCache() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? []
    await Promise.all(regs.map((r) => r.unregister()))
    const keys = (await caches?.keys()) ?? []
    await Promise.all(keys.map((k) => caches.delete(k)))
  } finally {
    location.reload()
  }
}

/** Without this, any render error unmounts the whole app and leaves a blank screen. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 text-text-950">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-text-950/65">Your saved entries are safe. Send this message so it can be fixed:</p>
        <pre className="whitespace-pre-wrap break-words rounded-xl bg-text-950/10 p-3 text-xs text-withdraw">
          {error.name}: {error.message}
          {'\n'}
          {(error.stack ?? '').split('\n').slice(1, 4).join('\n')}
        </pre>
        <div className="flex gap-3">
          <button className="min-h-11 flex-1 rounded-xl bg-primary-500 font-semibold text-on-primary" onClick={() => location.reload()}>
            Reload
          </button>
          <button className="min-h-11 flex-1 rounded-xl border border-text-950/20 bg-text-950/10" onClick={resetAppCache}>
            Clear app cache
          </button>
        </div>
      </div>
    )
  }
}
