# Nelexis mobile (Expo)

Expo Router app for **plant profiles**, **daily photos**, **timeline**, **stations** (Thing ID), **market calendar**, and **AI health checks** (via Nelexis API).

## Setup

```bash
cp .env.example .env
# EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_API_URL (e.g. http://localhost:3001)
npm install
npx expo start
```

Enable **Email** (password) auth in Supabase for pilot users.

## Flows

- **Sign in / register** — Supabase Auth.
- **Push** — After login, tabs layout registers **Expo push** (physical device) and POSTs to [`/api/push/register`](../../services/api/README.md). Requires `EXPO_ACCESS_TOKEN` on the server for cron digests.
- **Stations** — Name + optional `arduino_thing_id` for [`/api/telemetry`](../../services/api/README.md). `water_level_alert_below` is used for refill tasks (set in Supabase if needed).
- **Plants** — Optional link to `crop_templates` for calendar math.
- **Plant detail** — Light exposure (drives sun reminders), substrate / nutrient notes for AI, **streak** (photo upload or task complete), **Generate AI care plan**, stage, market date, photos, health AI, timeline.
- **Calendar tab** — Open + completed **care tasks** (mark done) and market “start-by” summary.

## Lint

Uses ESLint 8 + `eslint-config-expo`. Rule `react-hooks/set-state-in-effect` is off for pragmatic data loads in tab screens.
