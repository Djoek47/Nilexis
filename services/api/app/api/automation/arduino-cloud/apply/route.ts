import { NextRequest, NextResponse } from "next/server";
import { getArduinoAccessToken, patchThingProperty } from "@/lib/arduinoCloud";
import { getSupabaseAdmin, getSupabaseUserClient } from "@/lib/supabaseAdmin";

type Body = {
  station_id: string;
  property_id: string;
  value: number | boolean | string;
};

/**
 * Opt-in: apply a single property write to Arduino IoT Cloud when policy + allowlist + bounds pass.
 * Sun-related automation is intentionally out of scope here.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const jwt = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!jwt) {
    return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.station_id || !body.property_id || body.value === undefined) {
    return NextResponse.json(
      { error: "station_id, property_id, and value required" },
      { status: 400 }
    );
  }

  const userSb = getSupabaseUserClient(jwt);
  const { data: userData, error: userErr } = await userSb.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const { data: station, error: stErr } = await admin
    .from("stations")
    .select("id, user_id, arduino_thing_id")
    .eq("id", body.station_id)
    .single();

  if (stErr || !station || station.user_id !== userData.user.id) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  const { data: policy, error: polErr } = await admin
    .from("station_automation_policy")
    .select("*")
    .eq("station_id", station.id)
    .maybeSingle();

  if (polErr || !policy?.allow_ai_cloud_writes) {
    return NextResponse.json(
      { error: "Automation not enabled for this station (station_automation_policy)" },
      { status: 403 }
    );
  }

  const raw = policy.allowed_properties as unknown;
  const allowList: string[] = Array.isArray(raw)
    ? raw.map((x) => String(x))
    : [];

  if (!allowList.includes(body.property_id)) {
    return NextResponse.json({ error: "property_id not in allowed_properties" }, { status: 403 });
  }

  const thingId =
    policy.arduino_cloud_device_id?.trim() || station.arduino_thing_id?.trim();
  if (!thingId) {
    return NextResponse.json(
      { error: "Missing arduino_thing_id on station or arduino_cloud_device_id on policy" },
      { status: 400 }
    );
  }

  if (typeof body.value === "number") {
    const maxPump = Number(policy.max_pump_seconds ?? 120);
    if (body.value > maxPump || body.value < 0) {
      return NextResponse.json(
        { error: `Numeric value out of allowed range (0..${maxPump})` },
        { status: 400 }
      );
    }
  }

  const token = await getArduinoAccessToken();
  if (!token) {
    return NextResponse.json(
      { error: "Arduino API credentials not configured on server" },
      { status: 503 }
    );
  }

  const result = await patchThingProperty(token, thingId, body.property_id, body.value);

  await admin.from("care_tasks").insert({
    user_id: userData.user.id,
    plant_id: null,
    station_id: station.id,
    task_type: "custom",
    title: "Arduino Cloud property write",
    body: `property ${body.property_id} set via API (status ${result.status}). Verify on device.`,
    due_at: new Date().toISOString(),
    source: "rule",
    completed_at: new Date().toISOString(),
    arduino_cloud_sync_status: result.ok ? "applied" : "failed",
    payload_json: { property_id: body.property_id, value: body.value, response: result.body },
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Arduino API rejected write", detail: result.body },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, status: result.status });
}
