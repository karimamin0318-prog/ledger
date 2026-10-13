# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person, the owner. They use it on a Galaxy S24 as an installed PWA: they weigh in every morning, log the previous day's calories, and track diet phases (cut / bulk). Interface language is English and units are metric.

## Product Purpose

Ledger is a small, offline weight log. It turns daily weight and calories into a 7-day trend, a week-over-week view and an adaptive TDEE, which is your real maintenance worked out from how your weight moves against what you eat. Success means logging takes seconds and the trend can be trusted.

## Positioning

Ledger is a personal tool, not a platform: no account, no cloud, no social features. Maintenance is measured from your own data instead of estimated from a formula. A formula is only a temporary fallback until 14 days of data exist.

## Operating Context

- A quick daily ritual, mostly one-handed, in the morning.
- Phases bracket the data (for example "Cut Aug 2026").
- Every 14 days the backup goes to OneDrive as a file.

## Capabilities and Constraints

- Vite + React + Tailwind v4.
- Data is stored in IndexedDB (Dexie).
- PWA hosted on GitHub Pages (`/ledger/`), works fully offline, max width 480px.
- Three bottom tabs (Log, Trends, TDEE). Settings sit behind the gear icon.
- Themes switch via `data-theme`. The existing themes Dark, Light and Midnight must stay unchanged.
- Code stays small and simple.

## Brand Commitments

- The name is Ledger.
- The look is calm, dark-first and numbers-first. Numbers, inputs and charts must stay readable at all times.

## Evidence on Hand

The owner's own data: about 44 days since 24.08.2026. There are no testimonials or claims, and none should be invented.

## Product Principles

- Logging comes before looking: the most common task is the fastest one.
- Measured beats estimated.
- Small and simple: every feature has to earn its place.
- Calm, never gamified.
