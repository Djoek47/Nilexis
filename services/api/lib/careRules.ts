import type { SupabaseClient } from "@supabase/supabase-js";

const SUN_HOUR_UTC = 12;

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUtc(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** Avoid duplicate open tasks of same type for same plant/station on same UTC day. */
async function hasOpenTaskToday(
  admin: SupabaseClient,
  userId: string,
  taskType: string,
  opts: { plantId?: string | null; stationId?: string | null }
): Promise<boolean> {
  const dayStart = startOfUtcDay().toISOString();
  const dayEnd = addDaysUtc(startOfUtcDay(), 1).toISOString();

  let q = admin
    .from("care_tasks")
    .select("id")
    .eq("user_id", userId)
    .eq("task_type", taskType)
    .is("completed_at", null)
    .is("dismissed_at", null)
    .gte("created_at", dayStart)
    .lt("created_at", dayEnd);

  if (opts.plantId != null && opts.plantId !== "") q = q.eq("plant_id", opts.plantId);
  if (opts.stationId != null && opts.stationId !== "") q = q.eq("station_id", opts.stationId);

  const { data } = await q.limit(1).maybeSingle();
  return !!data;
}

/**
 * Create rule-based tasks from latest sensor snapshots (reservoir, EC/pH vs template).
 */
export async function applySensorRules(admin: SupabaseClient): Promise<{ created: number }> {
  let created = 0;

  const { data: stations, error } = await admin.from("stations").select(
    "id, user_id, water_level_alert_below, arduino_thing_id"
  );
  if (error || !stations?.length) return { created: 0 };

  for (const s of stations) {
    const threshold = Number(s.water_level_alert_below ?? 0.35);
    const { data: snap } = await admin
      .from("sensor_snapshots")
      .select("water_level_norm, ph, ec, recorded_at")
      .eq("station_id", s.id)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snap?.water_level_norm != null && snap.water_level_norm < threshold) {
      const dup = await hasOpenTaskToday(admin, s.user_id, "tank_refill", {
        stationId: s.id,
      });
      if (!dup) {
        const { data: plants } = await admin
          .from("plants")
          .select("id")
          .eq("station_id", s.id)
          .eq("user_id", s.user_id)
          .limit(1);

        const plantId = plants?.[0]?.id ?? null;
        await admin.from("care_tasks").insert({
          user_id: s.user_id,
          plant_id: plantId,
          station_id: s.id,
          task_type: "tank_refill",
          title: "Refill reservoir",
          body: `Water level read ${(Number(snap.water_level_norm) * 100).toFixed(0)}% (below ${(threshold * 100).toFixed(0)}%). Top up and verify sensors.`,
          due_at: new Date().toISOString(),
          source: "rule",
          payload_json: { water_level_norm: snap.water_level_norm, threshold },
        });
        created += 1;
      }
    }

    const { data: plants } = await admin
      .from("plants")
      .select("id, crop_template_id, user_id")
      .eq("station_id", s.id)
      .eq("user_id", s.user_id);

    for (const p of plants ?? []) {
      if (!p.crop_template_id || !snap) continue;
      const { data: tpl } = await admin
        .from("crop_templates")
        .select("target_ph_min, target_ph_max, target_ec_min, target_ec_max, species")
        .eq("id", p.crop_template_id)
        .maybeSingle();
      if (!tpl) continue;

      let outOfBand = false;
      let detail = "";
      if (snap.ph != null && tpl.target_ph_min != null && tpl.target_ph_max != null) {
        const ph = Number(snap.ph);
        if (ph < Number(tpl.target_ph_min) || ph > Number(tpl.target_ph_max)) {
          outOfBand = true;
          detail = `pH ${ph} outside template ${tpl.target_ph_min}-${tpl.target_ph_max}.`;
        }
      }
      if (snap.ec != null && tpl.target_ec_min != null && tpl.target_ec_max != null) {
        const ec = Number(snap.ec);
        if (ec < Number(tpl.target_ec_min) || ec > Number(tpl.target_ec_max)) {
          outOfBand = true;
          detail += ` EC ${ec} outside ${tpl.target_ec_min}-${tpl.target_ec_max}.`;
        }
      }
      if (outOfBand) {
        const dup = await hasOpenTaskToday(admin, p.user_id, "nutrient_adjust", {
          plantId: p.id,
        });
        if (!dup) {
          await admin.from("care_tasks").insert({
            user_id: p.user_id,
            plant_id: p.id,
            station_id: s.id,
            task_type: "nutrient_adjust",
            title: `Check nutrients — ${tpl.species ?? "crop"}`,
            body: `${detail.trim()} Confirm with agronomy SOP; AI/automation suggestions are advisory only.`,
            due_at: new Date().toISOString(),
            source: "rule",
            payload_json: { ph: snap.ph, ec: snap.ec, template_id: p.crop_template_id },
          });
          created += 1;
        }
      }
    }
  }

  return { created };
}

/**
 * Daily sunlight reminders for low/corner plants (user-managed sun, not Arduino).
 */
export async function applySunlightReminders(admin: SupabaseClient): Promise<{ created: number }> {
  let created = 0;
  const { data: plants, error } = await admin
    .from("plants")
    .select("id, user_id, nickname, light_exposure");

  if (error || !plants?.length) return { created: 0 };

  const due = new Date();
  due.setUTCHours(SUN_HOUR_UTC, 0, 0, 0);
  if (due.getTime() < Date.now()) {
    due.setUTCDate(due.getUTCDate() + 1);
  }

  for (const p of plants) {
    if (p.light_exposure !== "low" && p.light_exposure !== "corner_dark") continue;
    const dup = await hasOpenTaskToday(admin, p.user_id, "sunlight_reminder", {
      plantId: p.id,
    });
    if (dup) continue;

    await admin.from("care_tasks").insert({
      user_id: p.user_id,
      plant_id: p.id,
      task_type: "sunlight_reminder",
      title: `Sun check — ${p.nickname}`,
      body:
        "This plant is marked low/corner light. Rotate toward brighter exposure or supplement per your setup (Nelexis does not control sun via Arduino).",
      due_at: due.toISOString(),
      source: "rule",
      payload_json: { light_exposure: p.light_exposure },
    });
    created += 1;
  }

  return { created };
}
