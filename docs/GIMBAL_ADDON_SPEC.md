# Phase 5 — Gimbal camera add-on (specification)

This document defines how a **pan-tilt / gimbal-mounted camera** integrates with the existing Nelexis pipeline without changing the core role of the **Arduino UNO R4 WiFi** (sensors + irrigation + local display).

## Goals

- Capture **daily canopy images** per plant slot with **repeatable framing** (preset angles).
- **Later:** closed-loop framing using cloud vision to suggest PTZ offsets (optional).
- Reuse the same backend objects: Storage bucket **`plant-photos`**, table **`daily_photos`**, mobile timeline, and AI route **`/api/ai/plant-health`**.

## Hardware (recommended architecture)

| Role | Option A | Option B |
|------|----------|----------|
| Camera + PTZ | **Raspberry Pi** + USB cam + stepper/servo HAT | **ESP32-CAM** + 2-axis servo gimbal (lighter streams) |
| Trigger | R4 **GPIO / UART** “capture now” to camera controller | Scheduled only on camera side |
| Network | Wi-Fi to same LAN or site AP | Same |

The **R4 should not** encode JPEG streams or run vision models; it may send a **pulse or serial command** to the camera controller after irrigation events or on a Cloud schedule.

## Software components

1. **Camera service** (on Pi or ESP32):
   - Maintains **preset** pan/tilt positions per physical slot (JSON config: `slot_id → {pan, tilt, zoom}`).
   - On schedule or MQTT/HTTP command: move to preset → **capture** → **POST** image to Nelexis backend.
2. **Upload path** (choose one):
   - **Signed upload URL** from Nelexis API (new small endpoint using service role + plant/station auth), or
   - **Supabase service key** on device (acceptable only in locked firmware / vault; prefer signed URLs).
3. **Metadata:** Insert `daily_photos` with `plant_id`, `storage_path`, `taken_at` — same shape as mobile uploads.

## API sketch (future endpoint)

`POST /api/camera/upload-url` — authenticated with **device token** or **user JWT**, returns `{ path, signedUrl }` for `plant-photos/{user_or_org}/{plant_id}/{timestamp}.jpg`.

Implementation note: keep parity with mobile path layout `auth.uid()/plant_id/...` or introduce **`org_id`** for shared devices.

## AI-directed framing (later)

1. Capture low-res preview → cloud model returns **bounding box** for canopy center.
2. Map pixel offset to **delta pan/tilt** (calibrated per mount).
3. Apply delta, recapture, store high-res.

## Testing

- Repeatability: same preset over 7 days should yield **<5%** frame drift (mechanical backlash checklist).
- Latency: command to stored object &lt; 30s on typical Wi-Fi.

## References in repo

- Mobile upload: [`apps/mobile/app/plant/[id].tsx`](../apps/mobile/app/plant/[id].tsx)
- Storage policies: [`supabase/migrations/20250328181000_storage_plant_photos.sql`](../supabase/migrations/20250328181000_storage_plant_photos.sql)
- AI analysis: [`services/api/app/api/ai/plant-health/route.ts`](../services/api/app/api/ai/plant-health/route.ts)
