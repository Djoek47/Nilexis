import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getSupabaseAdmin, getSupabaseUserClient } from "@/lib/supabaseAdmin";

type Body = {
  plant_id: string;
  daily_photo_id?: string;
};

/**
 * Decision-support: analyzes a stored plant photo (signed URL) with optional OpenAI vision.
 * Requires Supabase user JWT. Inserts row into plant_health_suggestions (operator confirms in app).
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

  if (!body.plant_id) {
    return NextResponse.json({ error: "plant_id required" }, { status: 400 });
  }

  const userSb = getSupabaseUserClient(jwt);
  const { data: userData, error: userErr } = await userSb.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
  const userId = userData.user.id;

  const { data: plant, error: plantErr } = await userSb
    .from("plants")
    .select("id, nickname, species, stage")
    .eq("id", body.plant_id)
    .single();

  if (plantErr || !plant) {
    return NextResponse.json({ error: "Plant not found" }, { status: 404 });
  }

  let storagePath: string | null = null;
  if (body.daily_photo_id) {
    const { data: photo, error: phErr } = await userSb
      .from("daily_photos")
      .select("id, storage_path")
      .eq("id", body.daily_photo_id)
      .eq("plant_id", body.plant_id)
      .single();
    if (phErr || !photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }
    storagePath = photo.storage_path;
  }

  const admin = getSupabaseAdmin();
  let imageUrl: string | null = null;
  if (storagePath) {
    const { data: signed, error: signErr } = await admin.storage
      .from("plant-photos")
      .createSignedUrl(storagePath, 120);
    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: "Could not sign image URL" }, { status: 500 });
    }
    imageUrl = signed.signedUrl;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  let summary =
    "No image attached or AI disabled. Review plant manually and log observations in the timeline.";
  let suggested: string[] = ["Check leaves for spots", "Verify EC/pH vs crop template", "Note pest signs"];
  let risk = 0.2;
  let model = "stub";
  let raw: unknown = null;

  if (apiKey && imageUrl) {
    const openai = new OpenAI({ apiKey });
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You assist hydroponic growers. From the plant image, list possible issues (nutrient burn, deficiency, pests, mold) as hypotheses only — not a medical or legal diagnosis. Respond as compact JSON: {\"risk\":0-1,\"summary\":\"...\",\"checks\":[\"...\"]}",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Plant: ${plant.nickname} (${plant.species ?? "unknown"}), stage ${plant.stage}` },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 400,
      });
      const text = completion.choices[0]?.message?.content ?? "";
      raw = { id: completion.id, model: completion.model, created: completion.created };
      model = "gpt-4o-mini";
      try {
        const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim()) as {
          risk?: number;
          summary?: string;
          checks?: string[];
        };
        if (typeof parsed.risk === "number") risk = parsed.risk;
        if (typeof parsed.summary === "string") summary = parsed.summary;
        if (Array.isArray(parsed.checks)) suggested = parsed.checks.map(String);
      } catch {
        summary = text.slice(0, 500);
      }
    } catch (e) {
      summary = e instanceof Error ? e.message : "AI request failed";
      risk = 0.5;
    }
  }

  const { data: inserted, error: insErr } = await admin
    .from("plant_health_suggestions")
    .insert({
      plant_id: plant.id,
      user_id: userId,
      daily_photo_id: body.daily_photo_id ?? null,
      risk_score: risk,
      summary,
      suggested_checks: suggested,
      model,
      raw_response: raw as Record<string, unknown> | null,
      confirmed_ok: null,
    })
    .select("id")
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    suggestion_id: inserted?.id,
    risk_score: risk,
    summary,
    suggested_checks: suggested,
    model,
  });
}
