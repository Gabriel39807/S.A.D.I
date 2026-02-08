import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator } from "react-native";
import { api } from "../../src/api/client";

type Row = { id: number; tipo: "ingreso" | "salida"; fecha: string };

function dayKey(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

export default function GuardHistorial() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  async function buscar() {
    setLoading(true);
    try {
      const url = `/api/accesos/?page=1${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`;
      const r = await api.get(url);
      setRows((r.data?.results ?? []) as Row[]);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of rows) {
      const k = dayKey(r.fecha);
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    return Array.from(map.entries()).map(([dia, items]) => ({ dia, items }));
  }, [rows]);

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#eee", padding: 12, gap: 10 }}>
        <Text style={{ fontWeight: "900" }}>Buscar</Text>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Documento, nombre, serial…"
          style={{ borderWidth: 1, borderColor: "#eee", padding: 12, borderRadius: 12 }}
        />
        <Pressable onPress={buscar} style={{ backgroundColor: "#16a34a", padding: 12, borderRadius: 999, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "900" }}>Filtrar</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(i) => i.dia}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontWeight: "900", marginBottom: 8 }}>{item.dia}</Text>
              {item.items.map((r) => (
                <View key={r.id} style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee", borderRadius: 14, padding: 12, marginBottom: 10 }}>
                  <Text style={{ fontWeight: "900" }}>
                    #{r.id} — {r.tipo.toUpperCase()}
                  </Text>
                  <Text style={{ opacity: 0.7 }}>{new Date(r.fecha).toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}
          ListEmptyComponent={<Text style={{ opacity: 0.7 }}>No hay resultados.</Text>}
        />
      )}
    </View>
  );
}
