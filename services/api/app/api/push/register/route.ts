import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseUserClient } from "@/lib/supabaseAdmin";

type Body = { expo_push_token: string; platform?: string };

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

  if (!body.expo_push_token?.trim()) {
    return NextResponse.json({ error: "expo_push_token required" }, { status: 400 });
  }

  const userSb = getSupabaseUserClient(jwt);
  const { data: userData, error: userErr } = await userSb.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("user_push_tokens").upsert(
    {
      user_id: userData.user.id,
      expo_push_token: body.expo_push_token.trim(),
      platform: body.platform ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "expo_push_token" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
