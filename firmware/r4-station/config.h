#pragma once

/**
 * Nelexis R4 station — pin map (adjust to your wiring).
 * Use analog-capable pins for pH/EC/light per your modules.
 */

// --- Analog inputs ---
static const int PIN_PH = A0;           // pH module analog out
static const int PIN_EC = A1;           // EC module analog out
static const int PIN_LIGHT = A2;        // LDR divider or light sensor IC
static const int PIN_WATER_LEVEL = A3;  // e.g. resistive strip / float voltage

// --- Digital ---
static const int PIN_PUMP = D7;         // Pump relay (HIGH = on) — verify relay module logic
static const int PIN_VALVE_DRAIN = D8;  // Optional drain valve
static const int PIN_DHT = D6;          // DHT22 data pin (if used)

// --- I2C OLED (optional) — SSD1306 128x64 ---
#define NELEXIS_USE_SCREEN 1
static const uint8_t OLED_ADDR = 0x3C;

// --- Timing (ms) ---
static const unsigned long SENSOR_INTERVAL_MS = 5000;
static const unsigned long CLOUD_MIN_PUBLISH_MS = 15000;
static const unsigned long PUMP_MAX_ON_MS = 120000;  // safety cap: 2 minutes continuous
static const unsigned long IRRIGATION_CYCLE_GAP_MS = 600000;  // min 10 min between auto cycles

// --- Irrigation targets (tune per system; Cloud can override via variables later) ---
static const float TARGET_EC_MIN = 1.0f;
static const float TARGET_EC_MAX = 2.2f;
static const float WATER_LEVEL_LOW = 0.35f;  // normalized 0..1
