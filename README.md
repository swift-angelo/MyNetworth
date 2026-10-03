# WealthRadar

A mobile-first web app for tracking how much money you put into each bank, e-wallet and other account, with Philippine banks and international wallets (Wise, PayPal and others) built in.

- Log deposits and withdrawals per bank or wallet, with a date, an amount, a currency and an optional note.
- See totals, a deposits-versus-withdrawals chart by day, month or year, and a breakdown by bank or by type.
- Foreign-currency entries are converted to PHP using live exchange rates, fetched each time the app opens (rates by ExchangeRate-API).
- A Finance news section on Home (Philippines and Global). Tap a headline to read the article full screen in the app (when the publisher allows it), with a button to open the original. A Refresh button reloads the headlines. Headlines come from public RSS feeds through a small Netlify Function (`netlify/functions/news.mts`).
- Light and dark themes. Installable as a home-screen app, and works offline.
- All data stays in your browser (IndexedDB). Use **Settings → Export backup** to keep a copy.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173, also reachable from a phone on the same Wi-Fi
npm test         # unit tests
npm run build    # production build in dist/
```

Stack: React, TypeScript, Vite, Tailwind CSS, Dexie (IndexedDB), Recharts, Lucide icons.

## Deploy

Netlify builds from this repo using `netlify.toml` (`npm run build`, publish `dist`, functions in `netlify/functions`). The news feature needs the site to be publicly reachable, because the app calls `/.netlify/functions/news` on its own address.

## Notes

Bank and wallet logos in `public/logos/` are the property of their respective owners and are used only to identify accounts.

## Google sign-in (Supabase)

The app opens only after signing in with Google. Data still stays in this browser (IndexedDB); sign-in is a gate, not sync.

One-time setup:

1. **Supabase**: create a project. Authentication -> Providers -> Google: enable, paste the Google client ID and secret.
2. **Google Cloud Console**: create an OAuth client (type: Web application). Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. **Supabase** -> Authentication -> URL Configuration: Site URL `https://wealthradar.netlify.app`; add `http://localhost:5173/*` and `http://localhost:4173/*` to Redirect URLs.
4. **Netlify** -> Site configuration -> Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Supabase -> Project Settings -> API). For local runs, put the same two in `.env.local` (see `.env.example`). Then redeploy.

Until both variables are set, the login screen shows "Sign-in isn't configured" and the app stays closed.
