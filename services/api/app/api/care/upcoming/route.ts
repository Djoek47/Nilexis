import { NextRequest, NextResponse } from "next/server";
import { getSupabaseUserClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const jwt = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!jwt) {
    return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
  }

  const userSb = getSupabaseUserClient(jwt);
  const { data: userData, error: userErr } = await userSb.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const plantId = searchParams.get("plant_id");
  const days = Math.min(30, Math.max(1, Number(searchParams.get("days") ?? "14")));
  const includeCompleted = searchParams.get("include_completed") === "1";

  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 7);
  const to = new Date();
  to.setUTCDate(to.getUTCDate() + days);

  let q = userSb
    .from("care_tasks")
    .select("*")
    .eq("user_id", userData.user.id)
    .is("dismissed_at", null)
    .gte("due_at", from.toISOString())
    .lte("due_at", to.toISOString())
    .order("due_at", { ascending: true });

  if (!includeCompleted) q = q.is("completed_at", null);

  if (plantId) q = q.eq("plant_id", plantId);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data ?? [] });
}
