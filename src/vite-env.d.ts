/// <reference types="vite/client" />

/** ISO timestamp of when this bundle was built (injected by vite.config.ts). */
declare const __BUILD_TIME__: string

interface ImportMetaEnv {
  /** Supabase project URL, e.g. https://abcd.supabase.co */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon (public) key */
  readonly VITE_SUPABASE_ANON_KEY?: string
}
