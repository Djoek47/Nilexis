# Nelexis R4 station firmware

Arduino **UNO R4 WiFi** sketch: environment reads, **irrigation state machine**, optional **SSD1306 OLED**, and **Arduino IoT Cloud** properties.

## Libraries (Arduino IDE / `arduino-cli`)

- **ArduinoIoTCloud** (built-in via Board Manager for R4)
- **WiFiS3** (R4 core)
- **U8g2** (if `NELEXIS_USE_SCREEN` is `1` in `config.h`)

## Arduino Cloud setup

1. In [Arduino IoT Cloud](https://cloud.arduino.cc/), create a **Thing** for this device.
2. Add **Cloud variables** with names and types matching `thingProperties.h`:

   | Variable            | Type   |
   |---------------------|--------|
   | `ph_sensor`         | float  |
   | `ec_ms`             | float  |
   | `temp_air_c`        | float  |
   | `humidity_pct`      | float  |
   | `light_lux`         | float  |
   | `water_level_norm`  | float  |
   | `pump_running`      | bool   |
   | `irrigation_state`  | int    |
   | `last_error`        | String |
   | `firmware_version`  | String |

3. Download the generated sketch **secret** file or copy **Device ID** and **Secret key** into `arduino_secrets.h`:

```cpp
#define BOARD_ID "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
#define SECRET_DEVICE_KEY "YOUR_SECRET_KEY"
```

4. Copy `arduino_secrets.h.example` to `arduino_secrets.h` and add WiFi credentials if your connection flow requires them in code (Cloud often provisions WiFi via `ArduinoIoTPreferredConnection`).

5. Open `r4-station.ino`, select board **Arduino UNO R4 WiFi**, compile and upload.

## Dashboards and alarms

In Arduino Cloud, build a **dashboard** from the variables above. Add **alarms** on:

- `irrigation_state` == 3 (alarm)
- `water_level_norm` below your operational minimum
- `ph_sensor` / `ec_ms` outside crop-specific bands (tune per system)

## Local safety

- `PUMP_MAX_ON_MS` and `IRRIGATION_CYCLE_GAP_MS` in `config.h` limit runaway pumping.
- **Emergency:** disconnect pump power at the supply; firmware cannot replace physical E-stop.

## Pin map

See comments in [`config.h`](config.h). Adjust pins to match your wiring and relay logic (active HIGH vs LOW).
