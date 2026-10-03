# MyNetworth

A mobile-first web app for tracking how much money you put into each bank, e-wallet and other account, with Philippine banks and international wallets (Wise, PayPal and others) built in.

- Log deposits and withdrawals per bank or wallet, with a date, an amount, a currency and an optional note.
- See totals, a deposits-versus-withdrawals chart by day, month or year, and a breakdown by bank or by type.
- Foreign-currency entries are converted to PHP using exchange rates you set in Settings.
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

Netlify builds from this repo using `netlify.toml` (`npm run build`, publish `dist`).

## Notes

Bank and wallet logos in `public/logos/` are the property of their respective owners and are used only to identify accounts.
