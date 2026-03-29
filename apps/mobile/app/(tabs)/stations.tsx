import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDeviceClass } from "@/hooks/useDeviceClass";

type Station = {
  id: string;
  name: string;
  arduino_thing_id: string | null;
};

export default function StationsScreen() {
  const { user } = useAuth();
  const isTablet = useDeviceClass() === "tablet";
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [thingId, setThingId] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("stations")
      .select("id, name, arduino_thing_id")
      .order("created_at", { ascending: false });
    setStations((data as Station[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  function openAddModal() {
    setEditingId(null);
    setName("");
    setThingId("");
    setModal(true);
  }

  function openEditModal(s: Station) {
    setEditingId(s.id);
    setName(s.name);
    setThingId(s.arduino_thing_id ?? "");
    setModal(true);
  }

  function closeModal() {
    setModal(false);
    setEditingId(null);
    setName("");
    setThingId("");
  }

  async function saveStation() {
    if (!user || !name.trim()) return;
    const tid = thingId.trim() || null;

    if (editingId) {
      const { error } = await supabase
        .from("stations")
        .update({ name: name.trim(), arduino_thing_id: tid })
        .eq("id", editingId)
        .eq("user_id", user.id);
      if (error) {
        console.error(error);
        return;
      }
    } else {
      const { error } = await supabase.from("stations").insert({
        user_id: user.id,
        name: name.trim(),
        arduino_thing_id: tid,
      });
      if (error) {
        console.error(error);
        return;
      }
    }

    closeModal();
    load();
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
      <Text style={styles.hint}>
        In{" "}
        <Text style={{ fontWeight: "700" }}>Arduino IoT Cloud</Text> (cloud.arduino.cc), open your
        Thing and copy its <Text style={{ fontWeight: "700" }}>Thing ID</Text> (UUID). Paste it
        below for each station — it must match the{" "}
        <Text style={{ fontWeight: "700" }}>arduino_thing_id</Text> field in{" "}
        <Text style={{ fontWeight: "700" }}>POST /api/telemetry</Text> so readings map to this
        station in Supabase.
      </Text>
      <FlatList
        data={stations}
        keyExtractor={(s) => s.id}
        numColumns={isTablet ? 2 : 1}
        columnWrapperStyle={isTablet ? styles.columnWrap : undefined}
        ListEmptyComponent={<Text style={styles.empty}>No stations.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, isTablet && styles.cardGrid]}
            onPress={() => openEditModal(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.meta}>
              Thing ID: {item.arduino_thing_id ?? "— (tap to set)"}
            </Text>
            <Text style={styles.tapHint}>Tap to edit name or Thing ID</Text>
          </TouchableOpacity>
        )}
      />
      <Button title="Add station" onPress={openAddModal} />
      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {editingId ? "Edit station" : "New station"}
            </Text>
            <Text style={styles.sheetHint}>
              Thing ID = Arduino IoT Cloud Thing UUID (same value the telemetry bridge sends as
              arduino_thing_id).
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Station name"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Arduino Cloud Thing ID (UUID)"
              autoCapitalize="none"
              autoCorrect={false}
              value={thingId}
              onChangeText={setThingId}
            />
            <View style={styles.row}>
              <Button title="Cancel" onPress={closeModal} />
              <Button title="Save" onPress={() => void saveStation()} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  hint: { color: "#444", marginBottom: 8 },
  empty: { textAlign: "center", marginTop: 24, color: "#666" },
  columnWrap: { gap: 10, marginBottom: 10 },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#eef2ee",
    marginBottom: 10,
  },
  cardGrid: { flex: 1, marginBottom: 0, minWidth: 0 },
  title: { fontSize: 17, fontWeight: "600" },
  meta: { color: "#555", marginTop: 4 },
  tapHint: { fontSize: 12, color: "#888", marginTop: 8 },
  sheetHint: { fontSize: 13, color: "#666", marginBottom: 4 },
  backdrop: {
    flex: 1,
    backgroundColor: "#0006",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 10,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
});
