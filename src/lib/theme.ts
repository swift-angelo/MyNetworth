export type ThemePref = 'light' | 'dark' | 'system'

const KEY = 'mn-theme'

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'dark' || v === 'light' || v === 'system') return v
  } catch {
    // storage can be unavailable (private mode); fall back to light
  }
  return 'light'
}

const resolve = (pref: ThemePref) =>
  pref === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : pref

/** Sets <html data-theme> (which switches the palette variables) and the browser bar colour. */
export function applyTheme(pref: ThemePref) {
  const theme = resolve(pref)
  document.documentElement.setAttribute('data-theme', theme)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#041801' : '#e9fee7')
}

export function setThemePref(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref)
  } catch {
    // ignore: the choice just won't persist
  }
  applyTheme(pref)
}

/** Re-apply when the OS theme flips and the user chose "system". */
export function watchSystemTheme() {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getThemePref() === 'system') applyTheme('system')
  })
}
