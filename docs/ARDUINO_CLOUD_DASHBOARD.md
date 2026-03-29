# Arduino Cloud dashboard and alarms (reference)

Use this as a checklist when building the **Nelexis** Thing in Arduino IoT Cloud.

## Variables (read-only from device)

Align names and types with [`firmware/r4-station/thingProperties.h`](../firmware/r4-station/thingProperties.h).

## Suggested dashboard widgets

| Widget        | Variable           | Notes                          |
|---------------|--------------------|--------------------------------|
| Value         | `ph_sensor`        | Crop-specific bands            |
| Value         | `ec_ms`            | Nutrient strength              |
| Value         | `light_lux`        | “Sun cup” / light integrator   |
| Gauge         | `water_level_norm` | 0–1 normalized                 |
| LED / Status  | `pump_running`     | On/off                         |
| Value         | `irrigation_state` | 0 idle, 1 pump, 2 wait, 3 alarm|
| Message       | `last_error`       | Truncated on OLED              |
| Message       | `firmware_version` | Support traceability           |

## Suggested alarms

- **Critical:** `irrigation_state` equals **3** (alarm latched).
- **Warning:** `water_level_norm` below your minimum (set threshold in Cloud).
- **Warning:** `ph_sensor` or `ec_ms` outside ranges for the active crop (duplicate rules per crop if needed).

## OTA

Enable **Over-the-air updates** for the device in Cloud after the first successful USB upload, then use Cloud to push new builds during pilot.
