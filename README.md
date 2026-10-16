# Lunelle

A private period & cycle tracker built with Expo (React Native, TypeScript, Expo Router). Runs entirely in **Expo Go**, with no custom native build needed.

## Privacy
- All data stays on the device: no backend, accounts, analytics, ads or third-party network calls.
- SQLite (`expo-sqlite`) with every row encrypted using AES-256-GCM (`@noble/ciphers`). The 256-bit key lives in the iOS Keychain (`expo-secure-store`, this-device-only).
  *SQLCipher needs a custom build, so field-level encryption is used to stay Expo Go compatible.*
- Optional Face ID / passcode lock (`expo-local-authentication`).
- JSON + CSV export, JSON restore, period CSV import (template included), and delete-all (also destroys the key).

## Run
```bash
npm install
npx expo start --tunnel   # scan the QR code with the iPhone Camera → opens in Expo Go
npm test                  # prediction engine + CSV unit tests
npm run typecheck
```

## Structure
```
src/app/            Expo Router screens (tabs: today, calendar, insights, settings; modals: log/[date], cycles, pregnancy, privacy)
src/engine/         Pure prediction engine (+ __tests__)
src/db/             Encrypted SQLite repository + crypto
src/features/       CSV, export/import, local notifications, units
src/content/        Original phase + pregnancy week-by-week content
src/ui/             Theme tokens, components, cycle ring, month grid, SVG charts
src/state/          App-wide state provider
```

## Prediction engine
- Cycle length: exponentially weighted mean (decay 0.8) of the last 12 plausible cycles (15-90 d), blended with the user's typical length until 3 cycles exist.
- Confidence: ± max(1, ⌈SD⌉) days.
- Ovulation: next period − luteal length (default 14), refined by first positive LH test (+1 d) or a BBT "3-over-6" shift (≥0.2 °C).
- Fertile window: ovulation − 5 days through ovulation day.
- Irregularity: SD > 4 d, spread > 9 d, or any cycle < 21 / > 35 d. Flagged gently.

> Predictions are estimates and must never be used as contraception.
