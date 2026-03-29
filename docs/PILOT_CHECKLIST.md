# Pilot checklist (before scaling past 5 stations)

Use this before calling the pilot **complete** and moving to multi-site hardening.

## Hardware and safety

- [ ] Pump **max on-time** and **inter-cycle gap** reviewed for your reservoir and emitters.
- [ ] **Physical** pump disconnect tested (E-stop path documented in [RUNBOOK.md](./RUNBOOK.md)).
- [ ] pH and EC probes **calibrated**; light sensor mounting matches canopy height.
- [ ] **24–48h** unattended run on one station without alarm latch (or alarms understood).

## Cloud and data

- [ ] Arduino IoT Cloud **Thing** variables match [`firmware/r4-station/thingProperties.h`](../firmware/r4-station/thingProperties.h).
- [ ] Supabase **migrations** applied; Storage bucket **`plant-photos`** exists.
- [ ] At least one **station** row has `arduino_thing_id` matching the Cloud Thing.
- [ ] Optional: [TELEMETRY_BRIDGE.md](./TELEMETRY_BRIDGE.md) tested so `sensor_snapshots` populate.
- [ ] Migration **`20250329120000_ai_care_calendar`** applied (`care_tasks`, streaks, push tokens, automation policy).
- [ ] `stations.water_level_alert_below` tuned for reservoir alerts (normalized 0–1).

## Applications

- [ ] Mobile: sign-in, plant create, **photo upload**, timeline event, **AI check** (stub or OpenAI).
- [ ] **Calendar** tab: care tasks + market rows; **push** permission granted on a physical device (simulator may not receive push).
- [ ] API: `TELEMETRY_SECRET` rotated if exposed; **not** embedded in firmware.
- [ ] `firmware_version` visible in Cloud and recorded in **`firmware_reports`** after telemetry POST.
- [ ] **Vercel:** API deployed from `services/api`; `CRON_SECRET`, `EXPO_ACCESS_TOKEN`, and `OPENAI_API_KEY` set; [SMOKE_API.md](./SMOKE_API.md) exercised.
- [ ] **Arduino Cloud apply** (if used): `station_automation_policy` row with `allow_ai_cloud_writes` and `allowed_properties` only after policy review.

## Release discipline

- [ ] Git tag on firmware + API + mobile versions used in pilot.
- [ ] [CI](../.github/workflows/ci.yml) green on `main` (or your default branch).

## Product and compliance

- [ ] AI outputs presented as **decision support**; operators **confirm** suggestions in-app.
- [ ] Food-safety / labeling obligations for your jurisdiction identified (out of scope for this repo, but tracked by the team).
