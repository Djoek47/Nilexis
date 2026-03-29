import { NextRequest, NextResponse } from "next/server";
import { bumpStreakForActivity } from "@/lib/streaks";
import { getSupabaseAdmin, getSupabaseUserClient } from "@/lib/supabaseAdmin";

type Body = { plant_id: string };

/**
 * Call after uploading a daily photo: counts as maintenance for streak (once per UTC day).
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

  const { data: plant, error: pErr } = await userSb
    .from("plants")
    .select("id")
    .eq("id", body.plant_id)
    .single();

  if (pErr || !plant) {
    return NextResponse.json({ error: "Plant not found" }, { status: 404 });
  }

  const admin = getSupabaseAdmin();
  await bumpStreakForActivity(admin, userData.user.id, body.plant_id);

  return NextResponse.json({ ok: true });
}
