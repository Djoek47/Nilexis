import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Station = {
  id: string;
  name: string;
  arduino_thing_id: string | null;
};

export default function StationsScreen() {
  const { user } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
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

  async function createStation() {
    if (!user || !name.trim()) return;
    const { error } = await supabase.from("stations").insert({
      user_id: user.id,
      name: name.trim(),
      arduino_thing_id: thingId.trim() || null,
    });
    if (error) {
      console.error(error);
      return;
    }
    setModal(false);
    setName("");
    setThingId("");
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
        Set <Text style={{ fontWeight: "700" }}>arduino_thing_id</Text> to match Arduino IoT Cloud
        so <Text style={{ fontWeight: "700" }}>/api/telemetry</Text> can attach readings.
      </Text>
      <FlatList
        data={stations}
        keyExtractor={(s) => s.id}
        ListEmptyComponent={<Text style={styles.empty}>No stations.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.meta}>Thing: {item.arduino_thing_id ?? "—"}</Text>
          </View>
        )}
      />
      <Button title="Add station" onPress={() => setModal(true)} />
      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New station</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Arduino Cloud Thing ID (UUID)"
              autoCapitalize="none"
              value={thingId}
              onChangeText={setThingId}
            />
            <View style={styles.row}>
              <Button title="Cancel" onPress={() => setModal(false)} />
              <Button title="Save" onPress={createStation} />
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
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#eef2ee",
    marginBottom: 10,
  },
  title: { fontSize: 17, fontWeight: "600" },
  meta: { color: "#555", marginTop: 4 },
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
