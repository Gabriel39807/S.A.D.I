import React, { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator } from "react-native";
import * as Notifs from "../../src/api/notificaciones";

export default function GuardAlertas() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Notifs.Notificacion[]>([]);

  async function load() {
    setLoading(true);
    try {
      const r = await Notifs.listar();
      setItems(r);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Pressable onPress={load} style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "#eee", alignItems: "center" }}>
        <Text style={{ fontWeight: "900" }}>Actualizar</Text>
      </Pressable>

      {loading ? (
        <View style={{ padding: 16 }}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => {
            const color =
              item.tipo === "URGENT" ? "#dc2626" : item.tipo === "WARNING" ? "#f59e0b" : "#16a34a";

            return (
              <Pressable
                onPress={async () => {
                  await Notifs.marcarLeida(item.id);
                  load();
                }}
                style={{
                  backgroundColor: "#fff",
                  borderWidth: 1,
                  borderColor: "#eee",
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontWeight: "900" }}>{item.titulo}</Text>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: color }}>
                    <Text style={{ color: "#fff", fontWeight: "900" }}>{item.tipo}</Text>
                  </View>
                </View>

                <Text style={{ marginTop: 6, opacity: 0.8 }}>{item.mensaje}</Text>
                <Text style={{ marginTop: 8, opacity: 0.6 }}>
                  {new Date(item.created_at).toLocaleString()} {item.read_at ? "• Leída" : "• Nueva"}
                </Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={{ opacity: 0.7 }}>No hay alertas.</Text>}
        />
      )}
    </View>
  );
}
