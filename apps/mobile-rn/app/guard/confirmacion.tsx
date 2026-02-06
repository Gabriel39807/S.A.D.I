import React, { useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { router } from "expo-router";

import * as Accesos from "../../src/api/accesos";

export default function ConfirmacionScreen() {
  const params = useLocalSearchParams<{
    status: "ok" | "notfound" | "denied";
    documento: string;
    motivo?: string;
  }>();

  const documento = params.documento ?? "";
  const status = params.status;

  const data = status === "ok" ? Accesos.__cache.get(documento) : null;

  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const equipos = useMemo(() => data?.equipos_aprobados ?? [], [data]);

  function toggleEquipo(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function registrar(tipo: "ingreso" | "salida") {
    try {
      setLoading(true);
      await Accesos.registrarPorDocumento({
        documento,
        tipo,
        equipos: selected,
      });

      Alert.alert("Listo", `Se registró ${tipo} correctamente.`);
      router.replace("/guard/home");
    } catch (e: any) {
      const motivo = e?.response?.data?.motivo || e?.response?.data?.detail || "No se pudo registrar.";
      Alert.alert("No permitido", motivo);
    } finally {
      setLoading(false);
    }
  }

  if (!status) return null;

  if (status === "notfound") {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: "center", gap: 14 }}>
        <Text style={{ fontSize: 26, fontWeight: "900", textAlign: "center" }}>Acceso Denegado</Text>
        <Text style={{ fontSize: 18, fontWeight: "900", textAlign: "center" }}>Usuario No Encontrado</Text>
        <Text style={{ textAlign: "center", opacity: 0.7 }}>
          La información escaneada no corresponde a un usuario registrado.
        </Text>
        <Pressable onPress={() => router.back()} style={{ backgroundColor: "#dc2626", padding: 14, borderRadius: 999, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "900" }}>Volver a Escanear</Text>
        </Pressable>
      </View>
    );
  }

  if (status === "denied") {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: "center", gap: 14 }}>
        <Text style={{ fontSize: 26, fontWeight: "900", textAlign: "center" }}>Acceso Denegado</Text>
        <Text style={{ fontSize: 18, fontWeight: "900", textAlign: "center" }}>Motivo del Rechazo</Text>
        <Text style={{ textAlign: "center", opacity: 0.8 }}>{params.motivo ?? "Acceso denegado."}</Text>
        <Pressable onPress={() => router.back()} style={{ backgroundColor: "#dc2626", padding: 14, borderRadius: 999, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "900" }}>Volver a Escanear</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  const a = data.aprendiz;

  return (
    <View style={{ flex: 1, padding: 16, gap: 14 }}>
      <Text style={{ fontSize: 26, fontWeight: "900", textAlign: "center" }}>Acceso Autorizado</Text>

      <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#eee", gap: 6 }}>
        <Text style={{ fontSize: 18, fontWeight: "900", textAlign: "center" }}>
          {a.first_name} {a.last_name}
        </Text>
        <Text style={{ textAlign: "center", opacity: 0.7 }}>{a.documento}</Text>
      </View>

      <Text style={{ fontSize: 16, fontWeight: "900" }}>Checklist de Equipos</Text>

      <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#eee" }}>
        <FlatList
          data={equipos}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => {
            const checked = selected.includes(item.id);
            return (
              <Pressable
                onPress={() => toggleEquipo(item.id)}
                style={{
                  padding: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "#f3f4f6",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontWeight: "900" }}>
                    {item.marca} {item.modelo}
                  </Text>
                  <Text style={{ opacity: 0.7 }}>Serial: {item.serial}</Text>
                </View>
                <Text style={{ fontSize: 18 }}>{checked ? "✅" : "⬜"}</Text>
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={{ padding: 12, opacity: 0.7 }}>No hay equipos aprobados.</Text>}
        />
      </View>

      <Pressable disabled={loading} onPress={() => registrar("ingreso")} style={{ backgroundColor: "#16a34a", padding: 14, borderRadius: 999, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "900" }}>Registrar Ingreso</Text>
      </Pressable>

      <Pressable disabled={loading} onPress={() => registrar("salida")} style={{ backgroundColor: "#dc2626", padding: 14, borderRadius: 999, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "900" }}>Registrar Salida</Text>
      </Pressable>
    </View>
  );
}
    