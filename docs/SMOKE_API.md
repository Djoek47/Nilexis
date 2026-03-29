# Nelexis API smoke checks (`curl`)

Replace host, secrets, and JWTs with your values. API defaults to port **3001** locally.

## Telemetry (service / bridge)

```bash
curl -sS -X POST "https://YOUR_VERCEL_APP.vercel.app/api/telemetry" \
  -H "Authorization: Bearer YOUR_TELEMETRY_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "arduino_thing_id": "YOUR_THING_UUID",
    "water_level_norm": 0.2,
    "ph_sensor": 6.0,
    "ec_ms": 1.4,
    "firmware_version": "1.0.0"
  }'
```

## Cron (Vercel)

After setting `CRON_SECRET` in Vercel (same value as in `Authorization`):

```bash
curl -sS "https://YOUR_VERCEL_APP.vercel.app/api/cron/sensor-eval" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

```bash
curl -sS "https://YOUR_VERCEL_APP.vercel.app/api/cron/care-digest" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## User JWT routes

Obtain `ACCESS_TOKEN` from Supabase Auth (mobile session or dashboard). Examples:

```bash
curl -sS "https://YOUR_VERCEL_APP.vercel.app/api/care/upcoming?include_completed=1&days=14" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

```bash
curl -sS -X POST "https://YOUR_VERCEL_APP.vercel.app/api/care/generate" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plant_id":"PLANT_UUID","horizon_days":7}'
```

```bash
curl -sS -X POST "https://YOUR_VERCEL_APP.vercel.app/api/push/register" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expo_push_token":"ExponentPushToken[xxx]","platform":"ios"}'
```

## Arduino Cloud apply (opt-in)

Requires `station_automation_policy.allow_ai_cloud_writes`, `allowed_properties` JSON array of property UUIDs, and `ARDUINO_CLIENT_ID` / `ARDUINO_CLIENT_SECRET` on the server.

```bash
curl -sS -X POST "https://YOUR_VERCEL_APP.vercel.app/api/automation/arduino-cloud/apply" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"station_id":"STATION_UUID","property_id":"PROPERTY_UUID","value":30}'
```
