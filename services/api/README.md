# Nelexis API (Next.js)

Webhook and AI endpoints backed by **Supabase** (service role for ingestion; user JWT for AI).

## Where environment variables live

| Environment | Where to put secrets |
|-------------|----------------------|
| **Production / Preview (hosted)** | [Vercel Project → Settings → Environment Variables](https://vercel.com/docs/projects/environment-variables). Next.js reads them at runtime as `process.env.*`. No `.env` file is committed. |
| **Local development** | Copy [`.env.example`](./.env.example) to **`.env.local`** in `services/api` (gitignored). Same variable **names** as in Vercel so behavior matches production. |

Never commit real keys. The Supabase **service role** key and `TELEMETRY_SECRET` / `CRON_SECRET` must only exist in Vercel (prod) or `.env.local` (your machine).

## Setup

```bash
cd services/api
cp .env.example .env.local
# Fill SUPABASE_*, TELEMETRY_SECRET, CRON_SECRET, optional OPENAI_API_KEY, EXPO_ACCESS_TOKEN, ARDUINO_*
npm install
npm run dev
```

Default dev port: **3001**.

## Deploy on Vercel (from GitHub)

This matches the usual flow: **push code to GitHub**, then let Vercel build from that repo.

1. **Push** this monorepo to GitHub (or your org’s GitHub) if it is not there yet.
2. In [Vercel](https://vercel.com/new): **Add New Project** → **Import** your Git repository.
3. Under **Configure Project**:
   - **Root Directory:** set to `services/api` (click “Edit” next to the root and choose the folder). Vercel will use [`vercel.json`](./vercel.json) inside that folder for **Cron** jobs.
   - **Framework Preset:** Next.js (auto-detected from `package.json`).
4. **Environment Variables:** add every key from [`.env.example`](./.env.example) for **Production** (and optionally **Preview** for PRs). At minimum: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `TELEMETRY_SECRET`, `CRON_SECRET`. Add `OPENAI_API_KEY`, `EXPO_ACCESS_TOKEN`, and `ARDUINO_*` when you use those features.
5. **Deploy.** Each push to the connected branch triggers a new deployment; pull requests get **Preview** URLs if enabled.
6. **Cron:** After the first production deploy, Vercel runs the schedules in `vercel.json`. With `CRON_SECRET` set in the project, invocations should include `Authorization: Bearer <CRON_SECRET>` (see [Vercel Cron](https://vercel.com/docs/cron-jobs)).
7. **Mobile:** set `EXPO_PUBLIC_API_URL` in the Expo app to your **production** URL (e.g. `https://your-project.vercel.app`), not `localhost`.

**GitHub ↔ Vercel:** You can install the Vercel GitHub app so status checks and preview comments appear on PRs. Your existing [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) still runs lint/build/test on pushes; it does not replace Vercel’s build.

## Routes

### `POST /api/telemetry`

Authenticates with **one of**: `Authorization: Bearer <TELEMETRY_SECRET>`, header `x-telemetry-secret: <TELEMETRY_SECRET>`, or query `?telemetry_secret=<TELEMETRY_SECRET>` (last resort for webhooks that cannot set headers).

JSON body (fields optional except `arduino_thing_id`):

```json
{
  "arduino_thing_id": "your-cloud-thing-uuid",
  "ph_sensor": 6.1,
  "ec_ms": 1.4,
  "temp_air_c": 22,
  "humidity_pct": 55,
  "light_lux": 12000,
  "water_level_norm": 0.8,
  "pump_running": false,
  "irrigation_state": 0,
  "firmware_version": "1.0.0"
}
```

Resolves `stations.arduino_thing_id` → inserts `sensor_snapshots` and optional `firmware_reports`.

Bridge from Arduino Cloud: use **Scheduled webhook** or external scheduler calling this endpoint (Cloud secret in headers).

### `POST /api/ai/plant-health`

`Authorization: Bearer <Supabase user access_token>`

```json
{ "plant_id": "uuid", "daily_photo_id": "uuid" }
```

Creates a `plant_health_suggestions` row. If `OPENAI_API_KEY` is set and a photo is provided, runs **gpt-4o-mini** vision; otherwise returns a stub checklist. **Not a substitute for agronomy or lab testing.**

### Care calendar & streaks

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/care/upcoming?days=14&include_completed=0` | User JWT |
| `POST` | `/api/care/generate` body `{ plant_id, horizon_days? }` | User JWT |
| `POST` | `/api/care/complete` body `{ task_id, note? }` | User JWT |
| `POST` | `/api/streaks/record-daily` body `{ plant_id }` | User JWT |
| `POST` | `/api/push/register` body `{ expo_push_token, platform? }` | User JWT |

### Cron (Vercel)

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/cron/sensor-eval` | `Bearer CRON_SECRET` |
| `GET` | `/api/cron/care-digest` | `Bearer CRON_SECRET` |

### Arduino Cloud (opt-in)

`POST /api/automation/arduino-cloud/apply` — User JWT; requires `station_automation_policy.allow_ai_cloud_writes` and property UUID in `allowed_properties`. Server env: `ARDUINO_CLIENT_ID`, `ARDUINO_CLIENT_SECRET`.

## Tests

```bash
npm run test
```
