import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";

import { useSessionStore } from "../../src/store/session";
import { api } from "../../src/api/client";

type AccesoRow = {
  id: number;
  tipo: "ingreso" | "salida";
  fecha: string;
};

export default function GuardHome() {
  const user = useSessionStore((s) => s.user);
  const turno = useSessionStore((s) => s.turno);
  const finalizarTurno = useSessionStore((s) => s.finalizarTurno);
  const signOut = useSessionStore((s) => s.signOut);

  const [loading, setLoading] = useState(true);
  const [recientes, setRecientes] = useState<AccesoRow[]>([]);

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

  useEffect(() => {
    cargarRecientes();
  }, []);

  async function onCerrarTurno() {
    Alert.alert(
      "Finalizar turno",
      "¿Seguro que deseas finalizar el turno y cerrar sesión?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, finalizar",
          style: "destructive",
          onPress: async () => {
            await finalizarTurno();
            // FIX: typed routes no reconoce esta ruta aunque exista el archivo
            router.replace("/guard/turno-finalizado" as any);
          },
        },
      ]
    );
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 14 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
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

      <View
        style={{
          padding: 14,
          borderRadius: 16,
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: "#eee",
        }}
      >
        <Text style={{ opacity: 0.7 }}>Bienvenido,</Text>
        <Text style={{ fontSize: 18, fontWeight: "900" }}>
          {user?.first_name
            ? `${user.first_name} ${user.last_name ?? ""}`
            : user?.username}
        </Text>
        <Text style={{ marginTop: 8, opacity: 0.8 }}>
          Sede: {turno?.sede ?? "-"} | Turno: {turno?.jornada ?? "-"}
        </Text>
      </View>

      <Pressable
        onPress={() => router.push("/guard/scan" as any)}
        style={{
          backgroundColor: "#16a34a",
          padding: 18,
          borderRadius: 18,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "900" }}>
          Escanear Entrada/Salida
        </Text>
        <Text style={{ color: "#fff", opacity: 0.9 }}>
          Personas o Equipos Tecnológicos
        </Text>
      </Pressable>

      <Pressable
        onPress={cargarRecientes}
        style={{
          padding: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#eee",
          alignItems: "center",
        }}
      >
        <Text style={{ fontWeight: "900" }}>Actualizar registros</Text>
      </Pressable>

      <Text style={{ fontSize: 16, fontWeight: "900" }}>
        Registros recientes
      </Text>

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
              <View
                style={{
                  backgroundColor: "#fff",
                  borderWidth: 1,
                  borderColor: "#eee",
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <Text style={{ fontWeight: "900" }}>
                  #{item.id} — {item.tipo.toUpperCase()}
                </Text>
                <Text style={{ opacity: 0.7 }}>
                  {new Date(item.fecha).toLocaleString()}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={{ opacity: 0.7 }}>Aún no hay registros.</Text>
            }
          />
        )}
      </View>

      <Pressable
        onPress={onCerrarTurno}
        style={{
          backgroundColor: "#dc2626",
          padding: 14,
          borderRadius: 999,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "900" }}>
          Finalizar turno
        </Text>
      </Pressable>
    </View>
  );
}
