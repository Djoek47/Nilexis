/**
 * Nelexis — Arduino UNO R4 WiFi station
 * Sensors → Arduino Cloud; local irrigation FSM with pump safety caps.
 */

#include <ArduinoIoTCloud.h>
#include <WiFiS3.h>

#include "config.h"
#include "thingProperties.h"

#if NELEXIS_USE_SCREEN
#include <Wire.h>
#include <U8g2lib.h>
U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);
#endif

static const char *FW_VERSION = "1.0.0";

enum IrrigPhase : int {
  IRR_IDLE = 0,
  IRR_PUMPING = 1,
  IRR_PAUSED = 2,
  IRR_ALARM = 3
};

unsigned long lastSensorMs = 0;
unsigned long pumpStartedAt = 0;
unsigned long lastIrrigationEndMs = 0;
bool alarm_latch = false;

static float analogTo01(int raw) {
  float v = static_cast<float>(raw) / 1023.0f;
  if (v < 0.0f) return 0.0f;
  if (v > 1.0f) return 1.0f;
  return v;
}

/** Calibrate these maps to your analog modules (datasheet / bench test). */
static void readSensors() {
  int rPh = analogRead(PIN_PH);
  int rEc = analogRead(PIN_EC);
  int rLt = analogRead(PIN_LIGHT);
  int rWl = analogRead(PIN_WATER_LEVEL);

  ph_sensor = 4.0f + analogTo01(rPh) * 4.0f;
  ec_ms = analogTo01(rEc) * 3.5f;
  light_lux = analogTo01(rLt) * 50000.0f;
  water_level_norm = analogTo01(rWl);

  temp_air_c = 22.0f;
  humidity_pct = 55.0f;
}

static void pumpSet(bool on) {
  digitalWrite(PIN_PUMP, on ? HIGH : LOW);
  pump_running = on;
  if (on) {
    pumpStartedAt = millis();
  }
}

static void enterAlarm(const char *msg) {
  alarm_latch = true;
  irrigation_state = IRR_ALARM;
  pumpSet(false);
  last_error = String(msg);
}

static void updateIrrigationFSM() {
  if (alarm_latch) {
    return;
  }

  if (water_level_norm < WATER_LEVEL_LOW) {
    enterAlarm("Water level low — pump disabled");
    return;
  }

  if (irrigation_state == IRR_ALARM) {
    return;
  }

  unsigned long now = millis();

  if (pump_running) {
    if (now - pumpStartedAt > PUMP_MAX_ON_MS) {
      enterAlarm("Pump timeout — exceeded PUMP_MAX_ON_MS");
      return;
    }
    if (ec_ms >= TARGET_EC_MIN) {
      pumpSet(false);
      irrigation_state = IRR_IDLE;
      lastIrrigationEndMs = now;
    }
    return;
  }

  if (ec_ms < TARGET_EC_MIN) {
    if (now - lastIrrigationEndMs < IRRIGATION_CYCLE_GAP_MS) {
      irrigation_state = IRR_PAUSED;
      return;
    }
    irrigation_state = IRR_PUMPING;
    last_error = "";
    pumpSet(true);
  } else {
    irrigation_state = IRR_IDLE;
  }
}

#if NELEXIS_USE_SCREEN
static void drawScreen() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_6x10_tf);
  u8g2.drawStr(0, 12, "Nelexis");
  char line[32];
  snprintf(line, sizeof(line), "pH:%.2f EC:%.2f", ph_sensor, ec_ms);
  u8g2.drawStr(0, 24, line);
  snprintf(line, sizeof(line), "Lx:%.0f Wtr:%.0f%%", light_lux, water_level_norm * 100.0f);
  u8g2.drawStr(0, 36, line);
  const char *st = "IDLE";
  if (irrigation_state == IRR_PUMPING) st = "PUMP";
  else if (irrigation_state == IRR_PAUSED) st = "WAIT";
  else if (irrigation_state == IRR_ALARM) st = "ALARM";
  snprintf(line, sizeof(line), "%s Pmp:%s", st, pump_running ? "ON" : "off");
  u8g2.drawStr(0, 48, line);
  if (last_error.length() > 0) {
    char err[22];
    last_error.toCharArray(err, sizeof(err));
    u8g2.drawStr(0, 62, err);
  }
  u8g2.sendBuffer();
}
#endif

void setup() {
  Serial.begin(115200);
  pinMode(PIN_PUMP, OUTPUT);
  pinMode(PIN_VALVE_DRAIN, OUTPUT);
  digitalWrite(PIN_PUMP, LOW);
  digitalWrite(PIN_VALVE_DRAIN, LOW);

  pump_running = false;
  irrigation_state = IRR_IDLE;
  last_error = "";
  firmware_version = FW_VERSION;

  initProperties();
  ArduinoCloud.begin(ArduinoIoTPreferredConnection);

#if NELEXIS_USE_SCREEN
  Wire.begin();
  u8g2.begin();
#endif

  setDebugMessageLevel(2);
  ArduinoCloud.printDebugInfo();
}

void loop() {
  ArduinoCloud.update();

  if (Serial.available()) {
    char c = static_cast<char>(Serial.read());
    if (c == 'r' || c == 'R') {
      alarm_latch = false;
      last_error = "";
      irrigation_state = IRR_IDLE;
      pumpSet(false);
    }
  }

  unsigned long now = millis();
  if (now - lastSensorMs >= SENSOR_INTERVAL_MS) {
    lastSensorMs = now;
    readSensors();
    updateIrrigationFSM();
#if NELEXIS_USE_SCREEN
    drawScreen();
#endif
  }
}
