# Ledger

A minimal, offline-first weight log for your phone. Log morning weight and calories, see trends and week-over-week change, and get an adaptive TDEE (real maintenance calories) from how your weight moves against what you eat. Data never leaves the device (IndexedDB).

## Run

```
npm install
npm run dev      # development
npm test         # unit tests
npm run build && npm run preview   # production build
```

## Install on a phone

Open https://karimamin0318-prog.github.io/ledger/ and choose "Install" / "Add to home screen". Every push to `main` redeploys it via GitHub Actions; the installed app updates the next time it is opened online.

## Settings (gear, top right)

Design (Dark / Light / Midnight / Sakura / Sakura Night, the last two with an ink cherry branch and a few slowly falling petals that stop when the app is in the background or reduced motion is on), all past phases with a detail view, backup export/restore (weights, calories, phases and settings in one JSON file; restoring only fills in; a reminder pops up after 14 days without a backup), and bulk weight import.

## Maintenance calculation

- **Measured TDEE** (needs 14+ days): average calories minus the weight trend (least-squares slope) x 7700 kcal/kg. It already includes your real activity.
- **Formula estimate** (used until then): Mifflin-St Jeor BMR x 1.2, plus about 0.5 kcal per kg per 1000 steps above 3000/day. Set your average steps, height, age and sex on the TDEE tab.
