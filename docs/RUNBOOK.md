# Nelexis pilot runbook (Phase 1)

Operational checklist for **1–5** Arduino UNO R4 WiFi grow stations.

## Before power-on

1. **Wiring review** — Verify pump relay rating, flyback diode if required, and **common ground** between R4 and peripherals (per module datasheet).
2. **Fail-safe** — Pump supply must be **reachable** (plug strip / breaker). No unattended first run without a **max on-time** test in `config.h` (`PUMP_MAX_ON_MS`).
3. **Water** — Confirm reservoir size, overflow path, and **leak tray** where applicable.

## Commissioning a station

1. Flash firmware from [`firmware/r4-station`](../firmware/r4-station/README.md).
2. Pair **Arduino IoT Cloud** Thing; confirm variables match `thingProperties.h`.
3. **Calibrate** pH and EC probes per manufacturer (two-point pH, EC standard solution).
4. **Map analog scaling** in `readSensors()` in `R4_Station.ino` to match your modules (replace placeholder mapping).
5. Set **EC/pH targets** for your crop in Cloud automations or adjust `TARGET_EC_*` in `config.h` for local FSM.

## Normal operation

- **Dashboard:** Monitor `ph_sensor`, `ec_ms`, `light_lux`, `water_level_norm`, `pump_running`, `irrigation_state`.
- **Local screen:** Shows phase (`IDLE` / `PUMP` / `WAIT` / `ALARM`) and truncated error text.
- **Alarms in Cloud:** Configure alerts when `irrigation_state == 3` or when readings leave safe bands.

## Emergency stop

1. **Cut pump power** at the supply (fastest).
2. Close manual valves if installed.
3. After fixing the cause, reconnect power and send **`r`** over Serial (115200 baud) to clear a latched **ALARM** after water level and hardware are verified.

## Weekly maintenance

- Calibrate pH/EC sensors.
- Inspect tubing for biofilm and clogging.
- Verify `firmware_version` in Cloud matches deployed build for support.

## Document mapping (multi-zone)

If one R4 controls **multiple** irrigation zones via relays, maintain a **wiring table** (pin → zone → crop batch) in this repo under `docs/wiring-station-N.md`.
