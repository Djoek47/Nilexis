# Arduino Cloud → Nelexis API bridge

The firmware publishes to **Arduino IoT Cloud**. To duplicate telemetry into **Supabase** (`sensor_snapshots`) for agronomy timelines, call the Nelexis API from a small bridge.

## Endpoint

`POST https://your-api-host/api/telemetry`

**Arduino IoT Cloud → Webhooks:** Arduino’s own rules may still reject some URLs (see [Arduino Cloud webhooks](https://docs.arduino.cc/arduino-cloud/features/webhooks/)). This API answers **GET**/**HEAD** with **200** so validators that probe the URL can succeed when Arduino accepts the host. If the Cloud UI never accepts your Nelexis URL, use a **bridge** below instead of fighting the form.

**POST authentication** (use one):

1. **`Authorization: Bearer <TELEMETRY_SECRET>`** (preferred)
2. **`x-telemetry-secret: <TELEMETRY_SECRET>`** (if your relay can set a custom header but not `Authorization`)
3. **Query string** (only when the webhook UI cannot set any header):  
   `POST https://your-api-host/api/telemetry?telemetry_secret=<TELEMETRY_SECRET>`  
   Treat this like a password in the URL: it can appear in logs and proxies; **rotate `TELEMETRY_SECRET`** if it leaks.

Headers (typical):

```http
Authorization: Bearer <TELEMETRY_SECRET>
Content-Type: application/json
```

Body (example — align field names with your Cloud variables):

```json
{
  "arduino_thing_id": "same-as-stations.arduino_thing_id",
  "ph_sensor": 6.0,
  "ec_ms": 1.5,
  "temp_air_c": 22,
  "humidity_pct": 55,
  "light_lux": 15000,
  "water_level_norm": 0.7,
  "pump_running": false,
  "irrigation_state": 0,
  "firmware_version": "1.0.0"
}
```

## Preconditions

1. Create a **station** in the mobile app (or SQL) with `arduino_thing_id` equal to the Cloud Thing ID.
2. Set `TELEMETRY_SECRET` and Supabase keys in [`services/api/.env.local`](../services/api/.env.example).

## Options for the bridge

- **Scheduled HTTPS** from a server (cron + `curl`) pulling Cloud REST if available for your plan.
- **Zapier / Make** webhook from Cloud automations (if supported).
- **Edge function** on a provider you already use.

Keep the secret **out of firmware**; run the bridge in trusted infrastructure.
