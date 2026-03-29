import { NextRequest, NextResponse } from "next/server";
import { applySensorRules, applySunlightReminders } from "@/lib/careRules";
import { requireCronSecret } from "@/lib/cronAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * Hourly: rule-based care_tasks from telemetry + sunlight schedule for low-light plants.
 */
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  try {
    const admin = getSupabaseAdmin();
    const a = await applySensorRules(admin);
    const b = await applySunlightReminders(admin);
    return NextResponse.json({
      ok: true,
      sensor_tasks_created: a.created,
      sunlight_tasks_created: b.created,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 }
    );
  }
}
