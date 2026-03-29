#pragma once
/**
 * Arduino Cloud Thing properties — create matching variables in the Cloud Thing editor.
 * BOARD_ID and SECRET_DEVICE_KEY: from Arduino Cloud (Sketch secret tab) → arduino_secrets.h
 */

#include <ArduinoIoTCloud.h>
#include <WiFiConnectionHandler.h>
#include "arduino_secrets.h"

/** Required for ArduinoCloud.begin(ArduinoIoTPreferredConnection) on UNO R4 WiFi. */
WiFiConnectionHandler ArduinoIoTPreferredConnection(SECRET_WIFI_SSID, SECRET_WIFI_PASS);

float ph_sensor;
float ec_ms;
float temp_air_c;
float humidity_pct;
float light_lux;
float water_level_norm;
bool pump_running;
int irrigation_state;
String last_error;
String firmware_version;

void initProperties() {
  ArduinoCloud.setBoardId(BOARD_ID);
  ArduinoCloud.setSecretDeviceKey(SECRET_DEVICE_KEY);

  ArduinoCloud.addProperty(ph_sensor, Permission::Read).publishEvery(30UL);
  ArduinoCloud.addProperty(ec_ms, Permission::Read).publishEvery(30UL);
  ArduinoCloud.addProperty(temp_air_c, Permission::Read).publishEvery(30UL);
  ArduinoCloud.addProperty(humidity_pct, Permission::Read).publishEvery(30UL);
  ArduinoCloud.addProperty(light_lux, Permission::Read).publishEvery(30UL);
  ArduinoCloud.addProperty(water_level_norm, Permission::Read).publishEvery(30UL);
  ArduinoCloud.addProperty(pump_running, Permission::Read).publishEvery(15UL);
  ArduinoCloud.addProperty(irrigation_state, Permission::Read).publishEvery(15UL);
  ArduinoCloud.addProperty(last_error, Permission::Read).publishEvery(60UL);
  ArduinoCloud.addProperty(firmware_version, Permission::Read).publishEvery(600UL);
}
