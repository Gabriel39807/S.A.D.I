import React, { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";

import { useSessionStore } from "../../src/store/session";
import { api } from "../../src/api/client";
import * as Accesos from "../../src/api/accesos";

type AccesoRow = { id: number; tipo: "ingreso" | "salida"; fecha: string };

export default function GuardHome() {
  const user = useSessionStore((s) => s.user);
  const turno = useSessionStore((s) => s.turno);
  const signOut = useSessionStore((s) => s.signOut);

  const [loading, setLoading] = useState(true);
  const [recientes, setRecientes] = useState<AccesoRow[]>([]);
  const [stats, setStats] = useState<{ ingresos: number; salidas: number; total: number } | null>(null);

  async function cargarRecientes() {
    setLoading(true);
    try {
      const r = await api.get("/api/accesos/?page=1");
      const results = r.data?.results ?? [];
      setRecientes(results.slice(0, 8));
    } catch {
      setRecientes([]);
    } finally {
      setLoading(false);
    }
  }

  async function cargarStats() {
    try {
      const r = await Accesos.stats();
      if (r?.permitido && r.stats) setStats(r.stats);
      else setStats(null);
    } catch {
      setStats(null);
    }
  }

  useEffect(() => {
    cargarRecientes();
    cargarStats();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16, gap: 14 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "900" }}>SADI</Text>

        <Pressable
          onPress={async () => {
            await signOut();
            router.replace("/" as any);
          }}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "#eee",
          }}
        >
          <Text style={{ fontWeight: "900" }}>Salir</Text>
        </Pressable>
      </View>

      {/* Card bienvenida */}
      <View style={{ padding: 14, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee" }}>
        <Text style={{ opacity: 0.7 }}>Bienvenido,</Text>
        <Text style={{ fontSize: 18, fontWeight: "900" }}>
          {user?.first_name ? `${user.first_name} ${user.last_name ?? ""}` : user?.username}
        </Text>
        <Text style={{ marginTop: 8, opacity: 0.8 }}>
          Sede: {turno?.sede ?? "-"} | Turno: {turno?.jornada ?? "-"}
        </Text>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee", borderRadius: 16, padding: 12 }}>
          <Text style={{ opacity: 0.7 }}>Ingresos</Text>
          <Text style={{ fontSize: 22, fontWeight: "900" }}>{stats?.ingresos ?? "-"}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee", borderRadius: 16, padding: 12 }}>
          <Text style={{ opacity: 0.7 }}>Salidas</Text>
          <Text style={{ fontSize: 22, fontWeight: "900" }}>{stats?.salidas ?? "-"}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee", borderRadius: 16, padding: 12 }}>
          <Text style={{ opacity: 0.7 }}>Total</Text>
          <Text style={{ fontSize: 22, fontWeight: "900" }}>{stats?.total ?? "-"}</Text>
        </View>
      </View>

      {/* QR protagonista */}
      <Pressable
        onPress={() => router.push("/guard/scan" as any)}
        style={{
          backgroundColor: "#16a34a",
          padding: 18,
          borderRadius: 18,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}>Escanear QR</Text>
        <Text style={{ color: "#fff", opacity: 0.9 }}>Entrada / Salida • Personas o Equipos</Text>
      </Pressable>

      {/* Accesos rápidos */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={() => router.push("/guard/historial" as any)}
          style={{ flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: "#eee", alignItems: "center" }}
        >
          <Text style={{ fontWeight: "900" }}>Historial</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/guard/alertas" as any)}
          style={{ flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: "#eee", alignItems: "center" }}
        >
          <Text style={{ fontWeight: "900" }}>Alertas</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (!turno?.id) {
              Alert.alert("Sin turno", "No hay turno activo para cerrar.");
              return;
            }
            router.push({ pathname: "/guard/cierre-turno", params: { id: String(turno.id) } } as any);
          }}
          style={{ flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: "#eee", alignItems: "center" }}
        >
          <Text style={{ fontWeight: "900" }}>Cerrar</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => { cargarRecientes(); cargarStats(); }} style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "#eee", alignItems: "center" }}>
        <Text style={{ fontWeight: "900" }}>Actualizar</Text>
      </Pressable>

      <Text style={{ fontSize: 16, fontWeight: "900" }}>Últimos accesos</Text>

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={{ padding: 16 }}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={recientes}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => (
              <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee", borderRadius: 14, padding: 12, marginBottom: 10 }}>
                <Text style={{ fontWeight: "900" }}>
                  #{item.id} — {item.tipo.toUpperCase()}
                </Text>
                <Text style={{ opacity: 0.7 }}>{new Date(item.fecha).toLocaleString()}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={{ opacity: 0.7 }}>Aún no hay registros.</Text>}
          />
        )}
      </View>
    </View>
  );
}
