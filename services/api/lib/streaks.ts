import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Streak rule: one qualifying activity per calendar day (UTC) per plant.
 * Qualifying: completing a care task (any type) via API, or calling recordDailyPhotoActivity.
 * Consecutive days increment current_count; gap resets to 1.
 */
export async function bumpStreakForActivity(
  admin: SupabaseClient,
  userId: string,
  plantId: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: row } = await admin
    .from("care_streaks")
    .select("id, current_count, best_count, last_activity_date")
    .eq("user_id", userId)
    .eq("plant_id", plantId)
    .maybeSingle();

  if (!row) {
    await admin.from("care_streaks").insert({
      user_id: userId,
      plant_id: plantId,
      current_count: 1,
      best_count: 1,
      last_activity_date: today,
    });
    return;
  }

  if (row.last_activity_date === today) {
    return;
  }

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);

  let next = 1;
  if (row.last_activity_date === yStr) {
    next = (row.current_count ?? 0) + 1;
  }

  const best = Math.max(row.best_count ?? 0, next);
  await admin
    .from("care_streaks")
    .update({
      current_count: next,
      best_count: best,
      last_activity_date: today,
    })
    .eq("id", row.id);
}
