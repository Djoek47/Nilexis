import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useDeviceClass } from "@/hooks/useDeviceClass";

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
  const device = useDeviceClass();
  const isTablet = device === "tablet";
  const [plants, setPlants] = useState<Plant[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [photoPickModal, setPhotoPickModal] = useState(false);
  const [nickname, setNickname] = useState("");
  const [species, setSpecies] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    const list = (p as Plant[]) ?? [];
    setPlants(list);
    setTemplates((t as Template[]) ?? []);
    setSelectedId((prev) => {
      if (!isTablet) return prev;
      if (!list.length) return null;
      if (!prev || !list.some((x) => x.id === prev)) return list[0].id;
      return prev;
    });
    setLoading(false);
  }, [user, isTablet]);

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

  function openPhotoForPlant(id: string) {
    setPhotoPickModal(false);
    router.push(`/plant/${id}?camera=1`);
  }

  function photoFabPress() {
    if (plants.length === 0) return;
    if (plants.length === 1) {
      openPhotoForPlant(plants[0].id);
      return;
    }
    setPhotoPickModal(true);
  }

  const selected = plants.find((p) => p.id === selectedId);

  const list = (
    <FlatList
      style={isTablet ? styles.listPane : undefined}
      data={plants}
      keyExtractor={(item) => item.id}
      numColumns={isTablet ? 1 : 1}
      ListEmptyComponent={<Text style={styles.empty}>No plants yet.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.card,
            isTablet && selectedId === item.id && styles.cardSelected,
          ]}
          onPress={() => {
            if (isTablet) setSelectedId(item.id);
            else router.push(`/plant/${item.id}`);
          }}
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
  );

  const detailPane =
    isTablet && selected ? (
      <View style={styles.detailPane}>
        <Text style={styles.detailTitle}>{selected.nickname}</Text>
        <Text style={styles.detailMeta}>
          {selected.species ?? "—"} · {selected.stage}
        </Text>
        <Text style={styles.detailHint}>
          Tablet layout: quick view. Use actions below for full management or photos.
        </Text>
        <Button title="Open full plant screen" onPress={() => router.push(`/plant/${selected.id}`)} />
        <View style={{ height: 8 }} />
        <Button title="Add daily photo" onPress={() => openPhotoForPlant(selected.id)} />
      </View>
    ) : isTablet ? (
      <View style={styles.detailPane}>
        <Text style={styles.detailPlaceholder}>Select a plant from the list.</Text>
      </View>
    ) : null;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isTablet ? (
        <View style={styles.splitRow}>
          <View style={styles.listCol}>{list}</View>
          {detailPane}
        </View>
      ) : (
        list
      )}

      {!isTablet ? (
        <Pressable style={styles.fab} onPress={photoFabPress} accessibilityRole="button">
          <Text style={styles.fabText}>Photo</Text>
        </Pressable>
      ) : null}

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

      <Modal visible={photoPickModal} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add photo for…</Text>
            <FlatList
              data={plants}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ paddingVertical: 10 }}
                  onPress={() => openPhotoForPlant(item.id)}
                >
                  <Text style={styles.cardTitle}>{item.nickname}</Text>
                </TouchableOpacity>
              )}
            />
            <Button title="Cancel" onPress={() => setPhotoPickModal(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  splitRow: { flex: 1, flexDirection: "row", gap: 0 },
  listCol: { flex: 1, minWidth: 0 },
  listPane: { flex: 1 },
  detailPane: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: "#ddd",
    paddingLeft: 16,
    paddingTop: 8,
  },
  detailTitle: { fontSize: 22, fontWeight: "700" },
  detailMeta: { color: "#555", marginTop: 6 },
  detailHint: { color: "#666", marginVertical: 12, fontSize: 13 },
  detailPlaceholder: { color: "#888", marginTop: 24 },
  cardSelected: { borderWidth: 2, borderColor: "#1a5c2e" },
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
  fab: {
    position: "absolute",
    right: 20,
    bottom: 88,
    backgroundColor: "#1a5c2e",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 16 },
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
    maxHeight: "80%",
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
