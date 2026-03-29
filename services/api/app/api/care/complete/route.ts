import { NextRequest, NextResponse } from "next/server";
import { bumpStreakForActivity } from "@/lib/streaks";
import { getSupabaseAdmin, getSupabaseUserClient } from "@/lib/supabaseAdmin";

type Body = { task_id: string; note?: string };

/**
 * Mark a care task complete and bump streak when plant_id is set.
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

  if (!body.task_id) {
    return NextResponse.json({ error: "task_id required" }, { status: 400 });
  }

  const userSb = getSupabaseUserClient(jwt);
  const { data: userData, error: userErr } = await userSb.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: task, error: fetchErr } = await admin
    .from("care_tasks")
    .select("id, user_id, plant_id")
    .eq("id", body.task_id)
    .single();

  if (fetchErr || !task || task.user_id !== userData.user.id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { error: upErr } = await admin
    .from("care_tasks")
    .update({ completed_at: now })
    .eq("id", task.id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  if (body.note?.trim() && task.plant_id) {
    await admin.from("plant_events").insert({
      plant_id: task.plant_id,
      user_id: userData.user.id,
      event_type: "care_task",
      body: body.note.trim(),
    });
  }

  if (task.plant_id) {
    await bumpStreakForActivity(admin, userData.user.id, task.plant_id);
  }

  return NextResponse.json({ ok: true });
}
