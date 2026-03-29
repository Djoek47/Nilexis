import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cronAuth";
import { sendExpoPush } from "@/lib/expoPush";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * Daily: notify users of open care_tasks due in the next 24h.
 */
export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const admin = getSupabaseAdmin();
  const now = new Date();
  const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: tasks, error } = await admin
    .from("care_tasks")
    .select("id, user_id, title, body, due_at, plant_id")
    .is("completed_at", null)
    .is("dismissed_at", null)
    .gte("due_at", now.toISOString())
    .lte("due_at", until.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byUser = new Map<string, typeof tasks>();
  for (const t of tasks ?? []) {
    const list = byUser.get(t.user_id) ?? [];
    list.push(t);
    byUser.set(t.user_id, list);
  }

  let pushes = 0;
  for (const [userId, list] of byUser) {
    const { data: tokens } = await admin
      .from("user_push_tokens")
      .select("expo_push_token")
      .eq("user_id", userId);

    if (!tokens?.length) continue;

    const title = `Nelexis: ${list.length} care task(s) due`;
    const body = list
      .slice(0, 3)
      .map((x) => x.title)
      .join(" · ");

    const messages = tokens.map((row) => ({
      to: row.expo_push_token,
      title,
      body: body.slice(0, 120),
      sound: "default" as const,
      data: {
        kind: "care_digest",
        task_id: list[0]?.id ?? "",
        plant_id: list[0]?.plant_id ?? "",
      },
    }));

    try {
      await sendExpoPush(messages);
      pushes += messages.length;
    } catch {
      /* logged in sendExpoPush */
    }
  }

  return NextResponse.json({ ok: true, tasks_considered: tasks?.length ?? 0, push_messages: pushes });
}
