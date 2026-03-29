import { router } from "expo-router";
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

type Plant = {
  id: string;
  nickname: string;
  species: string | null;
  stage: string;
  started_at: string;
  target_market_date: string | null;
};

type Template = { id: string; species: string; variety: string | null };

export default function PlantsScreen() {
  const { user } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [nickname, setNickname] = useState("");
  const [species, setSpecies] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: p }, { data: t }] = await Promise.all([
      supabase
        .from("plants")
        .select("id, nickname, species, stage, started_at, target_market_date")
        .order("created_at", { ascending: false }),
      supabase.from("crop_templates").select("id, species, variety"),
    ]);
    setPlants((p as Plant[]) ?? []);
    setTemplates((t as Template[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function createPlant() {
    if (!user || !nickname.trim()) return;
    const { error } = await supabase.from("plants").insert({
      user_id: user.id,
      nickname: nickname.trim(),
      species: species.trim() || null,
      crop_template_id: templateId,
    });
    if (error) {
      console.error(error);
      return;
    }
    setModal(false);
    setNickname("");
    setSpecies("");
    setTemplateId(null);
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
      <FlatList
        data={plants}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No plants yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/plant/${item.id}`)}
          >
            <Text style={styles.cardTitle}>{item.nickname}</Text>
            <Text style={styles.cardMeta}>
              {item.species ?? "Species TBD"} · {item.stage}
            </Text>
            {item.target_market_date ? (
              <Text style={styles.cardMeta}>Market: {item.target_market_date}</Text>
            ) : null}
          </TouchableOpacity>
        )}
      />
      <Button title="Add plant" onPress={() => setModal(true)} />

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New plant</Text>
            <TextInput
              style={styles.input}
              placeholder="Nickname"
              value={nickname}
              onChangeText={setNickname}
            />
            <TextInput
              style={styles.input}
              placeholder="Species (optional)"
              value={species}
              onChangeText={setSpecies}
            />
            <Text style={styles.label}>Crop template (optional)</Text>
            <FlatList
              style={{ maxHeight: 120 }}
              data={templates}
              keyExtractor={(t) => t.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() =>
                    setTemplateId(templateId === item.id ? null : item.id)
                  }
                >
                  <Text style={templateId === item.id ? styles.pickOn : styles.pick}>
                    {item.species} {item.variety ? `(${item.variety})` : ""}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <View style={styles.row}>
              <Button title="Cancel" onPress={() => setModal(false)} />
              <Button title="Save" onPress={createPlant} />
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
  empty: { textAlign: "center", marginTop: 32, color: "#666" },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f4f7f4",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: "600" },
  cardMeta: { color: "#555", marginTop: 4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#0006",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
  },
  label: { fontWeight: "600", marginTop: 8 },
  pick: { padding: 8, color: "#333" },
  pickOn: { padding: 8, color: "#1a5c2e", fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
});
