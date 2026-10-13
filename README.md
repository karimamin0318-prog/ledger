# Ledger

A minimal, offline-first weight log for your phone. Log morning weight and calories, see trends and week-over-week change, and get an adaptive TDEE (real maintenance calories) from how your weight moves against what you eat. Data never leaves the device (IndexedDB).

## Run

```
npm install
npm run dev      # development
npm test         # unit tests
npm run build && npm run preview   # production build with service worker
```

## Install on a phone

Browsers only offer a real install over HTTPS. For a local setup:

1. Create a trusted local certificate with [mkcert](https://github.com/FiloSottile/mkcert) and save it as `cert.pem` / `key.pem` in this folder (they are git-ignored; never commit them).
2. Run `install-on-phone.bat` (build + preview), open `https://<laptop-ip>:4173` on the phone, and choose Install.
3. After the first load the app is cached and works offline.

## Settings (gear, top right)

Design (Dark / Light / Midnight), all past phases with a detail view, backup export/restore (weights, calories, phases and settings in one JSON file; restoring only fills in), and bulk weight import.

## Maintenance calculation

- **Measured TDEE** (needs 14+ days): average calories minus the weight trend (least-squares slope) x 7700 kcal/kg. It already includes your real activity.
- **Formula estimate** (used until then): Mifflin-St Jeor BMR x 1.2, plus about 0.5 kcal per kg per 1000 steps above 3000/day. Set your average steps, height, age and sex on the TDEE tab.
