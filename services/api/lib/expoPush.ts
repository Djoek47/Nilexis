/**
 * Expo Push API (server). Set EXPO_ACCESS_TOKEN in Vercel from Expo dashboard.
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
};

export async function sendExpoPush(messages: PushMessage[]): Promise<unknown> {
  const token = process.env.EXPO_ACCESS_TOKEN;
  if (!token) {
    console.warn("Nelexis: EXPO_ACCESS_TOKEN not set; skip push");
    return { skipped: true };
  }
  if (messages.length === 0) return { sent: 0 };

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(messages),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Expo push failed", res.status, json);
    throw new Error("Expo push failed");
  }
  return json;
}
