import Constants from "expo-constants";

const base =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:3001";

export async function requestPlantHealth(
  accessToken: string,
  plantId: string,
  dailyPhotoId?: string
) {
  const res = await fetch(`${base}/api/ai/plant-health`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      plant_id: plantId,
      daily_photo_id: dailyPhotoId,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? res.statusText);
  }
  return json as {
    suggestion_id: string;
    risk_score: number;
    summary: string;
    suggested_checks: string[];
    model: string;
  };
}

export async function registerPushToken(
  accessToken: string,
  expoPushToken: string,
  platform?: string
) {
  const res = await fetch(`${base}/api/push/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ expo_push_token: expoPushToken, platform }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? res.statusText);
  }
}

export type CareTask = {
  id: string;
  title: string;
  body: string | null;
  due_at: string;
  task_type: string;
  source: string;
  plant_id: string | null;
  completed_at: string | null;
};

export async function fetchCareTasks(
  accessToken: string,
  opts?: { plantId?: string; includeCompleted?: boolean; days?: number }
): Promise<CareTask[]> {
  const q = new URLSearchParams();
  if (opts?.plantId) q.set("plant_id", opts.plantId);
  if (opts?.includeCompleted) q.set("include_completed", "1");
  if (opts?.days) q.set("days", String(opts.days));
  const res = await fetch(`${base}/api/care/upcoming?${q.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? res.statusText);
  }
  return (json as { tasks: CareTask[] }).tasks ?? [];
}

export async function completeCareTask(
  accessToken: string,
  taskId: string,
  note?: string
) {
  const res = await fetch(`${base}/api/care/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ task_id: taskId, note }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? res.statusText);
  }
}

export async function generateCarePlan(
  accessToken: string,
  plantId: string,
  horizonDays?: number
) {
  const res = await fetch(`${base}/api/care/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ plant_id: plantId, horizon_days: horizonDays }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? res.statusText);
  }
  return json as { inserted: number; disclaimer?: string };
}

export async function recordDailyStreak(accessToken: string, plantId: string) {
  const res = await fetch(`${base}/api/streaks/record-daily`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ plant_id: plantId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error ?? res.statusText);
  }
}
