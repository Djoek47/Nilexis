import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import {
  generateCarePlan,
  recordDailyStreak,
  requestPlantHealth,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useDeviceClass } from "@/hooks/useDeviceClass";

const stages = [
  "seedling",
  "vegetative",
  "flowering",
  "fruiting",
  "harvest",
  "completed",
] as const;

const lightLevels = ["full_sun", "partial", "low", "corner_dark"] as const;

export default function PlantDetailScreen() {
  const { id, camera } = useLocalSearchParams<{ id: string; camera?: string }>();
  const { user, session } = useAuth();
  const isTablet = useDeviceClass() === "tablet";
  const didAutoCamera = useRef(false);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [stage, setStage] = useState<string>("seedling");
  const [targetMarket, setTargetMarket] = useState("");
  const [eventNote, setEventNote] = useState("");
  const [photos, setPhotos] = useState<
    { id: string; storage_path: string; taken_at: string }[]
  >([]);
  const [events, setEvents] = useState<
    { id: string; event_type: string; body: string | null; created_at: string }[]
  >([]);
  const [health, setHealth] = useState<
    {
      id: string;
      summary: string | null;
      risk_score: number | null;
      confirmed_ok: boolean | null;
      created_at: string;
    }[]
  >([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [careBusy, setCareBusy] = useState(false);
  const [lightExposure, setLightExposure] = useState<string>("partial");
  const [substrate, setSubstrate] = useState("");
  const [regimenNote, setRegimenNote] = useState("");
  const [streak, setStreak] = useState<{
    current_count: number;
    best_count: number;
    last_activity_date: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    const [{ data: plant }, { data: ph }, { data: ev }, { data: hs }, { data: st }] =
      await Promise.all([
        supabase
          .from("plants")
          .select(
            "nickname, stage, target_market_date, light_exposure, substrate_type, nutrient_regimen_note"
          )
          .eq("id", id)
          .single(),
        supabase
          .from("daily_photos")
          .select("id, storage_path, taken_at")
          .eq("plant_id", id)
          .order("taken_at", { ascending: false }),
        supabase
          .from("plant_events")
          .select("id, event_type, body, created_at")
          .eq("plant_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("plant_health_suggestions")
          .select("id, summary, risk_score, confirmed_ok, created_at")
          .eq("plant_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("care_streaks")
          .select("current_count, best_count, last_activity_date")
          .eq("plant_id", id)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
    if (plant) {
      setNickname(plant.nickname);
      setStage(plant.stage);
      setTargetMarket(plant.target_market_date ?? "");
      setLightExposure(plant.light_exposure ?? "partial");
      setSubstrate(plant.substrate_type ?? "");
      setRegimenNote(plant.nutrient_regimen_note ?? "");
    }
    setPhotos(ph ?? []);
    setEvents(ev ?? []);
    setHealth(hs ?? []);
    setStreak(
      st
        ? {
            current_count: st.current_count ?? 0,
            best_count: st.best_count ?? 0,
            last_activity_date: st.last_activity_date ?? null,
          }
        : null
    );
    setLoading(false);
  }, [id, user]);

  const uploadPhoto = useCallback(async () => {
    if (!id || !user) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access.");
      return;
    }
    const pick = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.75,
    });
    if (pick.canceled || !pick.assets[0]) return;
    const uri = pick.assets[0].uri;
    const path = `${user.id}/${id}/${Date.now()}.jpg`;
    const res = await fetch(uri);
    const buf = await res.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from("plant-photos")
      .upload(path, buf, { contentType: "image/jpeg", upsert: false });
    if (upErr) {
      Alert.alert("Upload failed", upErr.message);
      return;
    }
    const { data: row, error: insErr } = await supabase
      .from("daily_photos")
      .insert({
        plant_id: id,
        user_id: user.id,
        storage_path: path,
      })
      .select("id")
      .single();
    if (insErr) {
      Alert.alert("Record failed", insErr.message);
      return;
    }
    if (session?.access_token) {
      try {
        await recordDailyStreak(session.access_token, id);
      } catch {
        /* streak optional */
      }
    }
    await load();
    return row?.id as string | undefined;
  }, [id, user, session?.access_token, load]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    didAutoCamera.current = false;
  }, [id]);

  useEffect(() => {
    if (camera !== "1" || !id || !user || didAutoCamera.current) return;
    didAutoCamera.current = true;
    router.replace(`/plant/${id}`);
    void uploadPhoto();
  }, [camera, id, user, uploadPhoto]);

  async function saveProfile() {
    if (!id) return;
    const { error } = await supabase
      .from("plants")
      .update({
        stage,
        target_market_date: targetMarket.trim() || null,
        light_exposure: lightExposure,
        substrate_type: substrate.trim() || null,
        nutrient_regimen_note: regimenNote.trim() || null,
      })
      .eq("id", id);
    if (error) Alert.alert("Save failed", error.message);
    else Alert.alert("Saved", "Profile updated.");
  }

  async function addEvent() {
    if (!id || !user || !eventNote.trim()) return;
    const { error } = await supabase.from("plant_events").insert({
      plant_id: id,
      user_id: user.id,
      event_type: "note",
      body: eventNote.trim(),
    });
    if (error) Alert.alert("Event failed", error.message);
    else {
      setEventNote("");
      load();
    }
  }

  async function runCareGenerate() {
    if (!session?.access_token || !id) return;
    setCareBusy(true);
    try {
      const r = await generateCarePlan(session.access_token, id, 7);
      Alert.alert("Care plan", `Added ${r.inserted} task(s). ${r.disclaimer ?? ""}`);
      load();
    } catch (e) {
      Alert.alert("Care plan failed", e instanceof Error ? e.message : "Error");
    } finally {
      setCareBusy(false);
    }
  }

  async function runAiOnLatest() {
    if (!session?.access_token || !id) return;
    const latest = photos[0];
    if (!latest) {
      Alert.alert("No photo", "Add a daily photo first.");
      return;
    }
    setAiBusy(true);
    try {
      await requestPlantHealth(session.access_token, id, latest.id);
      Alert.alert(
        "AI check queued",
        "Suggestion saved — review and confirm below. This is decision support only."
      );
      load();
    } catch (e) {
      Alert.alert("AI failed", e instanceof Error ? e.message : "Error");
    } finally {
      setAiBusy(false);
    }
  }

  async function confirmSuggestion(sid: string, ok: boolean) {
    const { error } = await supabase
      .from("plant_health_suggestions")
      .update({ confirmed_ok: ok, operator_note: ok ? "confirmed OK" : "rejected" })
      .eq("id", sid);
    if (error) Alert.alert("Update failed", error.message);
    else load();
  }

  if (loading || !id) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, isTablet && styles.scrollTablet]}
    >
      <Text style={styles.title}>{nickname}</Text>
      <Button title="Back to plants" onPress={() => router.back()} />

      <Text style={styles.section}>Growth stage</Text>
      <View style={styles.rowWrap}>
        {stages.map((s) => (
          <Pressable key={s} onPress={() => setStage(s)}>
            <Text style={stage === s ? styles.stageOn : styles.stageOff}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Target market date (YYYY-MM-DD)</Text>
      <TextInput
        style={styles.input}
        placeholder="2026-06-01"
        value={targetMarket}
        onChangeText={setTargetMarket}
      />

      <Text style={styles.section}>Light exposure (sun is manual; drives reminders)</Text>
      <View style={styles.rowWrap}>
        {lightLevels.map((L) => (
          <Pressable key={L} onPress={() => setLightExposure(L)}>
            <Text style={lightExposure === L ? styles.stageOn : styles.stageOff}>
              {L.replace(/_/g, " ")}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Substrate &amp; nutrient notes (for AI context)</Text>
      <TextInput
        style={styles.input}
        placeholder="Substrate / media"
        value={substrate}
        onChangeText={setSubstrate}
      />
      <TextInput
        style={[styles.input, { minHeight: 72 }]}
        placeholder="Nutrient regimen notes"
        multiline
        value={regimenNote}
        onChangeText={setRegimenNote}
      />
      <Button title="Save profile" onPress={saveProfile} />

      <Text style={styles.section}>Maintenance streak</Text>
      <Text style={styles.line}>
        Current: {streak?.current_count ?? 0} · Best: {streak?.best_count ?? 0}
        {streak?.last_activity_date
          ? ` · Last activity (UTC): ${streak.last_activity_date}`
          : ""}
      </Text>
      <Text style={styles.muted}>
        Streak +1 per UTC day when you complete a care task or upload a daily photo.
      </Text>

      <Button
        title={careBusy ? "Generating…" : "Generate AI care plan (7 days)"}
        onPress={() => void runCareGenerate()}
        disabled={careBusy}
      />

      <Text style={styles.section}>Daily photo</Text>
      <Button title="Upload photo" onPress={() => void uploadPhoto()} />
      <Button
        title={aiBusy ? "Running AI…" : "Run AI check (latest photo)"}
        onPress={() => void runAiOnLatest()}
        disabled={aiBusy}
      />

      <Text style={styles.section}>Photos</Text>
      <FlatList
        data={photos}
        keyExtractor={(p) => p.id}
        scrollEnabled={false}
        ListEmptyComponent={<Text style={styles.muted}>No photos yet.</Text>}
        renderItem={({ item }) => (
          <Text style={styles.line}>
            {item.taken_at.slice(0, 10)} · {item.storage_path.split("/").pop()}
          </Text>
        )}
      />

      <Text style={styles.section}>AI suggestions (confirm in field)</Text>
      <FlatList
        data={health}
        keyExtractor={(h) => h.id}
        scrollEnabled={false}
        ListEmptyComponent={<Text style={styles.muted}>None yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.healthCard}>
            <Text style={styles.line}>
              Risk: {item.risk_score ?? "—"} ·{" "}
              {item.confirmed_ok == null
                ? "pending"
                : item.confirmed_ok
                  ? "confirmed OK"
                  : "rejected"}
            </Text>
            <Text style={styles.body}>{item.summary}</Text>
            <View style={styles.row}>
              <Button title="Looks OK" onPress={() => void confirmSuggestion(item.id, true)} />
              <Button title="Not OK" onPress={() => void confirmSuggestion(item.id, false)} />
            </View>
          </View>
        )}
      />

      <Text style={styles.section}>Timeline</Text>
      <TextInput
        style={styles.input}
        placeholder="Add note (transplant, nutrients, pest sighting…)"
        value={eventNote}
        onChangeText={setEventNote}
      />
      <Button title="Add timeline event" onPress={() => void addEvent()} />
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        scrollEnabled={false}
        ListEmptyComponent={<Text style={styles.muted}>No events.</Text>}
        renderItem={({ item }) => (
          <Text style={styles.line}>
            {item.created_at.slice(0, 10)} — {item.event_type}: {item.body}
          </Text>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48, gap: 8 },
  scrollTablet: {
    maxWidth: 880,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  section: { marginTop: 16, fontWeight: "700", color: "#0d2818" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
  },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  stageOn: {
    padding: 8,
    backgroundColor: "#1a5c2e",
    color: "#fff",
    borderRadius: 8,
    overflow: "hidden",
  },
  stageOff: {
    padding: 8,
    backgroundColor: "#e8e8e8",
    borderRadius: 8,
    overflow: "hidden",
  },
  line: { marginVertical: 4, color: "#333" },
  body: { color: "#222", marginVertical: 6 },
  muted: { color: "#777" },
  healthCard: {
    padding: 12,
    backgroundColor: "#f2f6f2",
    borderRadius: 10,
    marginBottom: 10,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
});
