# Nelexis mobile (Expo)

Expo Router app for **plant profiles**, **daily photos**, **timeline**, **stations** (Thing ID), **market calendar**, and **AI health checks** (via Nelexis API).

**SDK:** Expo **54** (matches current **Expo Go** from the App Store). Run commands from **`apps/mobile`**.

## Setup

```bash
cd apps/mobile
cp .env.example .env
# EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_API_URL (e.g. http://localhost:3001)
npm install
npx expo start
```

Enable **Email** (password) auth in Supabase for pilot users.

### `Network request failed` (AI, care API, etc.)

- **API must be running** on your PC: `cd services/api && npm run dev` (listens on `0.0.0.0:3001`).
- **iOS + Expo Go:** Expo Go’s own app settings often **block plain `http://` to a LAN IP**. `app.json` ATS tweaks apply to **your** dev/production builds, not Expo Go. **Fix:** set `EXPO_PUBLIC_API_URL` to your **HTTPS** Nelexis API on Vercel, or expose local API with HTTPS (e.g. Cloudflare Tunnel / ngrok) and point the env var there.
- **Android + HTTP:** LAN `http://` often works on Android; for release builds that need cleartext, add [`expo-build-properties`](https://docs.expo.dev/versions/latest/sdk/build-properties/) if required.

## Flows

- **Sign in / register** — Supabase Auth.
- **Push** — After login, tabs layout registers **Expo push** (physical device) and POSTs to [`/api/push/register`](../../services/api/README.md). You need an **EAS project ID** or push is skipped (warning only):
  1. **Env (good for local):** In [expo.dev](https://expo.dev) open your project → **Project settings** → copy **Project ID** → add `EXPO_PUBLIC_EAS_PROJECT_ID=<uuid>` to `.env` → restart `npx expo start`. `app.config.js` injects it into the manifest.
  2. **CLI:** `npx eas-cli@latest login` then `npx eas-cli@latest init` in `apps/mobile` (writes `app.json` / `eas.json`).
  Server needs `EXPO_ACCESS_TOKEN` for cron digests.
- **Stations** — Name + optional `arduino_thing_id` for [`/api/telemetry`](../../services/api/README.md). `water_level_alert_below` is used for refill tasks (set in Supabase if needed).
- **Plants** — Optional link to `crop_templates` for calendar math.
- **Plant detail** — Light exposure (drives sun reminders), substrate / nutrient notes for AI, **streak** (photo upload or task complete), **Generate AI care plan**, stage, market date, photos, health AI, timeline.
- **Calendar tab** — Open + completed **care tasks** (mark done) and market “start-by” summary.

## Lint

Uses ESLint 8 + `eslint-config-expo`. Rule `react-hooks/set-state-in-effect` is off for pragmatic data loads in tab screens.
