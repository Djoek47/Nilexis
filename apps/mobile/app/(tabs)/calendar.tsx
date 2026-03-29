import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  completeCareTask,
  fetchCareTasks,
  type CareTask,
} from "@/lib/api";

type MarketRow = {
  id: string;
  nickname: string;
  target_market_date: string | null;
  crop_template_id: string | null;
  suggested_start: string | null;
};

export default function CalendarScreen() {
  const { user, session } = useAuth();
  const [marketRows, setMarketRows] = useState<MarketRow[]>([]);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: plants, error } = await supabase
      .from("plants")
      .select("id, nickname, target_market_date, crop_template_id");
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const enriched: MarketRow[] = [];
    for (const p of plants ?? []) {
      let suggested: string | null = null;
      if (p.target_market_date) {
        const { data: rpc } = await supabase.rpc("suggested_start_date", {
          p_target_market: p.target_market_date,
          p_template_id: p.crop_template_id,
          p_buffer_days: 7,
        });
        if (typeof rpc === "string") suggested = rpc;
      }
      enriched.push({
        id: p.id,
        nickname: p.nickname,
        target_market_date: p.target_market_date,
        crop_template_id: p.crop_template_id,
        suggested_start: suggested,
      });
    }
    setMarketRows(enriched);

    if (session?.access_token) {
      try {
        const t = await fetchCareTasks(session.access_token, {
          includeCompleted: true,
          days: 21,
        });
        setTasks(t);
      } catch (e) {
        console.warn("Care tasks load failed", e);
        setTasks([]);
      }
    } else {
      setTasks([]);
    }

    setLoading(false);
  }, [user, session?.access_token]);

  useEffect(() => {
    load();
  }, [load]);

  async function markDone(task: CareTask) {
    if (!session?.access_token) return;
    setBusyId(task.id);
    try {
      await completeCareTask(session.access_token, task.id);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>AI &amp; rule-based care</Text>
      <Text style={styles.intro}>
        Tasks come from telemetry rules, sunlight profile, and{" "}
        <Text style={{ fontWeight: "700" }}>Generate care plan</Text> on a plant. Push
        digests run on Vercel cron when configured.
      </Text>
      <Button title="Refresh" onPress={() => void load()} />

      <Text style={styles.subheading}>Care tasks</Text>
      <FlatList
        data={tasks}
        keyExtractor={(t) => t.id}
        style={{ maxHeight: 320 }}
        ListEmptyComponent={<Text style={styles.empty}>No tasks in this window.</Text>}
        renderItem={({ item }) => (
          <View style={styles.taskCard}>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text style={styles.meta}>
              {item.task_type} · {item.source} · due {item.due_at.slice(0, 10)}
            </Text>
            {item.completed_at ? (
              <Text style={styles.done}>Done</Text>
            ) : (
              <Button
                title={busyId === item.id ? "…" : "Mark done"}
                onPress={() => void markDone(item)}
                disabled={busyId === item.id}
              />
            )}
          </View>
        )}
      />

      <Text style={styles.subheading}>Market calendar</Text>
      <FlatList
        data={marketRows}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={<Text style={styles.empty}>No plants.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.nickname}</Text>
            <Text style={styles.line}>
              Target market: {item.target_market_date ?? "— (edit plant)"}
            </Text>
            <Text style={styles.line}>
              Suggested start-by: {item.suggested_start ?? "—"}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  heading: { fontSize: 20, fontWeight: "700", color: "#0d2818" },
  subheading: { marginTop: 16, fontWeight: "700", fontSize: 16 },
  intro: { color: "#444", marginVertical: 8 },
  empty: { textAlign: "center", marginTop: 16, color: "#666" },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f6f3e9",
    marginBottom: 10,
  },
  taskCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#eef6ee",
    marginBottom: 8,
  },
  taskTitle: { fontWeight: "600", fontSize: 16 },
  meta: { color: "#555", marginTop: 4, fontSize: 12 },
  done: { color: "#1a5c2e", marginTop: 6, fontWeight: "600" },
  title: { fontSize: 17, fontWeight: "600" },
  line: { color: "#333", marginTop: 6 },
});
