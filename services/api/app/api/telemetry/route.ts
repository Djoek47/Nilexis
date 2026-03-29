import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Ingest station telemetry (Arduino Cloud bridge or device HTTP).
 *
 * GET/HEAD: no auth — used by Arduino IoT Cloud (and others) to validate the webhook URL
 * before save; real ingestion is POST only.
 *
 * POST auth (any one): Authorization: Bearer <TELEMETRY_SECRET>, or header
 * x-telemetry-secret: <TELEMETRY_SECRET>, or query ?telemetry_secret=<TELEMETRY_SECRET>
 * (query is for webhook UIs that cannot set headers — prefer Bearer; rotate secret if URL leaks).
 */
export function GET() {
  return NextResponse.json(
    {
      ok: true,
      message:
        "Nelexis telemetry — POST JSON here. Auth: Bearer TELEMETRY_SECRET, or x-telemetry-secret header, or ?telemetry_secret= (POST only).",
    },
    { status: 200 }
  );
}

export function HEAD() {
  return new NextResponse(null, { status: 200 });
}

/** Some webhook UIs probe with OPTIONS; must not 405 or the URL is rejected. */
export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

function telemetryAuthOk(req: NextRequest, secret: string | undefined): boolean {
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (bearer === secret) return true;
  const headerSecret = req.headers.get("x-telemetry-secret");
  if (headerSecret === secret) return true;
  const querySecret = req.nextUrl.searchParams.get("telemetry_secret");
  if (querySecret === secret) return true;
  return false;
}

export async function POST(req: NextRequest) {
  const secret = process.env.TELEMETRY_SECRET;
  if (!telemetryAuthOk(req, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const thingId = typeof body.arduino_thing_id === "string" ? body.arduino_thing_id : null;
  if (!thingId) {
    return NextResponse.json({ error: "arduino_thing_id required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: station, error: stErr } = await admin
    .from("stations")
    .select("id")
    .eq("arduino_thing_id", thingId)
    .maybeSingle();

  if (stErr) {
    return NextResponse.json({ error: stErr.message }, { status: 500 });
  }
  if (!station) {
    return NextResponse.json(
      { error: "Unknown station — set arduino_thing_id on a station row" },
      { status: 404 }
    );
  }

  const row = {
    station_id: station.id,
    ph: num(body.ph_sensor),
    ec: num(body.ec_ms),
    temp_air_c: num(body.temp_air_c),
    humidity_pct: num(body.humidity_pct),
    light_lux: num(body.light_lux),
    water_level_norm: num(body.water_level_norm),
    pump_running: bool(body.pump_running),
    irrigation_state: int(body.irrigation_state),
    raw: body,
    recorded_at: new Date().toISOString(),
  };

  const { error: insErr } = await admin.from("sensor_snapshots").insert(row);
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const fw = typeof body.firmware_version === "string" ? body.firmware_version : null;
  if (fw) {
    await admin.from("firmware_reports").insert({
      station_id: station.id,
      arduino_thing_id: thingId,
      firmware_version: fw,
      meta: { source: "telemetry" },
    });
  }

  return NextResponse.json({ ok: true });
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function bool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  return null;
}

function int(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
