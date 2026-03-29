import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSupabaseAdmin, getSupabaseUserClient } from "@/lib/supabaseAdmin";

type Body = { plant_id: string; horizon_days?: number };

const DISCLAIMER =
  "Advisory only — not medical/legal advice. Confirm pesticides, nutrients, and substrates with labels and qualified agronomy.";

type AiTask = {
  task_type:
    | "tank_refill"
    | "photo_checkup"
    | "sunlight_reminder"
    | "nutrient_adjust"
    | "sensor_anomaly"
    | "custom";
  title: string;
  body: string;
  due_at_iso: string;
  treatment_hypotheses?: string[];
  nutrient_product_ideas?: string[];
  substrate_notes?: string[];
};

type AiPayload = { tasks: AiTask[] };

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

  if (!body.plant_id) {
    return NextResponse.json({ error: "plant_id required" }, { status: 400 });
  }

  const horizon = Math.min(21, Math.max(3, body.horizon_days ?? 7));

  const userSb = getSupabaseUserClient(jwt);
  const { data: userData, error: userErr } = await userSb.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { data: plant, error: plantErr } = await userSb
    .from("plants")
    .select(
      "id, nickname, species, stage, station_id, crop_template_id, light_exposure, substrate_type, nutrient_regimen_note"
    )
    .eq("id", body.plant_id)
    .single();

  if (plantErr || !plant) {
    return NextResponse.json({ error: "Plant not found" }, { status: 404 });
  }

  let template: Record<string, unknown> | null = null;
  if (plant.crop_template_id) {
    const { data: t } = await userSb
      .from("crop_templates")
      .select("*")
      .eq("id", plant.crop_template_id)
      .single();
    template = t;
  }

  let snap: Record<string, unknown> | null = null;
  if (plant.station_id) {
    const { data: s } = await userSb
      .from("sensor_snapshots")
      .select("ph, ec, temp_air_c, humidity_pct, light_lux, water_level_norm, pump_running, recorded_at")
      .eq("station_id", plant.station_id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    snap = s;
  }

  const admin = getSupabaseAdmin();
  const { data: lastPhoto } = await admin
    .from("daily_photos")
    .select("id, taken_at")
    .eq("plant_id", plant.id)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 503 });
  }

  const openai = new OpenAI({ apiKey });
  const system = `You are an agronomy assistant for hydroponic growers. Output ONLY valid JSON matching schema: {"tasks":[{"task_type":"photo_checkup"|"nutrient_adjust"|"sunlight_reminder"|"tank_refill"|"sensor_anomaly"|"custom","title":"string","body":"string","due_at_iso":"ISO-8601 datetime UTC","treatment_hypotheses":[]?,"nutrient_product_ideas":[]?,"substrate_notes":[]?}]}. Spread tasks across the next ${horizon} days. Include at least one photo_checkup. Never claim certainty on pests/disease; use "hypothesis". No markdown.`;

  const userMsg = JSON.stringify({
    plant,
    crop_template: template,
    latest_sensors: snap,
    last_photo_at: lastPhoto?.taken_at ?? null,
    horizon_days: horizon,
    disclaimer: DISCLAIMER,
  });

  let parsed: AiPayload = { tasks: [] };
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      max_tokens: 1200,
    });
    const text = completion.choices[0]?.message?.content ?? "{}";
    parsed = JSON.parse(text) as AiPayload;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "OpenAI failed" },
      { status: 500 }
    );
  }

  const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
  let inserted = 0;

  for (const t of tasks.slice(0, 20)) {
    const due = t.due_at_iso ? new Date(t.due_at_iso) : new Date();
    if (Number.isNaN(due.getTime())) continue;

    const payload = {
      treatment_hypotheses: t.treatment_hypotheses,
      nutrient_product_ideas: t.nutrient_product_ideas,
      substrate_notes: t.substrate_notes,
    };

    const { error } = await admin.from("care_tasks").insert({
      user_id: userData.user.id,
      plant_id: plant.id,
      station_id: plant.station_id,
      task_type: t.task_type ?? "custom",
      title: (t.title ?? "Care task").slice(0, 200),
      body: [t.body, "", DISCLAIMER].filter(Boolean).join("\n").slice(0, 8000),
      due_at: due.toISOString(),
      source: "openai",
      payload_json: payload,
    });

    if (!error) inserted += 1;
  }

  return NextResponse.json({ ok: true, inserted, disclaimer: DISCLAIMER });
}
