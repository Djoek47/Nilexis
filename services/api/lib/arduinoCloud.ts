/**
 * Arduino IoT Cloud REST API (server-side).
 * Create an API client in Arduino Cloud and set ARDUINO_CLIENT_ID / ARDUINO_CLIENT_SECRET on Vercel.
 * @see https://docs.arduino.cc/arduino-cloud/api-reference/
 */

export async function getArduinoAccessToken(): Promise<string | null> {
  const clientId = process.env.ARDUINO_CLIENT_ID;
  const clientSecret = process.env.ARDUINO_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://api2.arduino.cc/iot/v1/clients/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Arduino token failed", res.status, t);
    return null;
  }

  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

/**
 * Update a Thing property value by property UUID (from IoT Cloud property metadata).
 */
export async function patchThingProperty(
  accessToken: string,
  thingId: string,
  propertyId: string,
  value: unknown
): Promise<{ ok: boolean; status: number; body: string }> {
  const url = `https://api2.arduino.cc/iot/v2/things/${thingId}/properties/${propertyId}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ value }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}
