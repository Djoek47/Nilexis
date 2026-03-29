# Supabase (Nelexis backend)

## Apply migrations

From the [Supabase CLI](https://supabase.com/docs/guides/cli) linked project:

```bash
supabase db push
```

Or paste SQL from `migrations/` into the SQL editor in the dashboard (in order).

## Environment

- **Auth:** Enable Email provider (magic link or password) for pilot users.
- **Storage:** Migrations create private bucket `plant-photos`. Object paths must start with `{auth.uid()}/` (see mobile upload helper).

## Tables overview

| Table | Purpose |
|-------|---------|
| `crop_templates` | Species targets and cycle length for calendar hints |
| `stations` | Grow stations + optional `arduino_thing_id` |
| `plants` | Profiles, growth stage, market dates, batch tags |
| `plant_events` | Timeline (transplant, nutrient change, notes) |
| `daily_photos` | Metadata for images in Storage |
| `sensor_snapshots` | Telemetry ingested via [`services/api`](../services/api) webhook |
| `plant_health_suggestions` | AI outputs + operator confirmation |
| `firmware_reports` | Reported firmware version per station |
| `care_tasks` | AI + rule-based reminders (refill, sun, nutrients, check-ups) |
| `care_streaks` | Per-plant maintenance streak (UTC day granularity) |
| `user_push_tokens` | Expo push tokens for digests |
| `station_automation_policy` | Opt-in Arduino Cloud property writes (whitelist + bounds) |

## Opt-in Arduino automation (SQL example)

After reviewing safety caps in firmware, insert a policy row (replace UUIDs):

```sql
insert into public.station_automation_policy (
  user_id, station_id, allow_ai_cloud_writes,
  arduino_cloud_device_id, allowed_properties, max_pump_seconds, min_interval_seconds
) values (
  'YOUR_USER_UUID',
  'YOUR_STATION_UUID',
  true,
  null, -- optional override; else `stations.arduino_thing_id` is used
  '["YOUR_IOT_CLOUD_PROPERTY_UUID"]'::jsonb,
  120,
  600
);
```

## RPC

- `suggested_start_date(target_market, crop_template_id, buffer_days)` — planning helper for “start by” dates.
