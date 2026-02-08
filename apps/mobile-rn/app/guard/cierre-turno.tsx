import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Turnos from "../../src/api/turnos";
import { useSessionStore } from "../../src/store/session";

export default function CierreTurno() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id);

  const finalizarTurno = useSessionStore((s) => s.finalizarTurno);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<null | {
    turno: Turnos.Turno;
    resumen: { ingresos: number; salidas: number; total: number };
  }>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await Turnos.resumenTurno(id);
      if (!r.permitido) throw new Error(r.motivo || "No permitido");
      setData({ turno: r.turno, resumen: r.resumen });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) load(); }, [id]);

  async function confirmarCierre() {
    Alert.alert(
      "Confirmar cierre",
      "¿Seguro que deseas finalizar el turno?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Finalizar",
          style: "destructive",
          onPress: async () => {
            await finalizarTurno();
            router.replace("/guard/turno-finalizado" as any);
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: "center", gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900", textAlign: "center" }}>No se pudo cargar el resumen</Text>
        <Pressable onPress={load} style={{ backgroundColor: "#111827", padding: 14, borderRadius: 999, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "900" }}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 14 }}>
      <Text style={{ fontSize: 24, fontWeight: "900", textAlign: "center" }}>Cierre de turno</Text>

      <View style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee", borderRadius: 16, padding: 14, gap: 8 }}>
        <Text style={{ fontWeight: "900" }}>Resumen</Text>
        <Text style={{ opacity: 0.8 }}>Sede: {data.turno.sede} • Jornada: {data.turno.jornada}</Text>
        <Text style={{ opacity: 0.8 }}>Inicio: {new Date(data.turno.inicio).toLocaleString()}</Text>
        {data.turno.fin ? <Text style={{ opacity: 0.8 }}>Fin: {new Date(data.turno.fin).toLocaleString()}</Text> : null}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <View style={{ flex: 1, borderWidth: 1, borderColor: "#eee", borderRadius: 14, padding: 12 }}>
            <Text style={{ opacity: 0.7 }}>Ingresos</Text>
            <Text style={{ fontSize: 20, fontWeight: "900" }}>{data.resumen.ingresos}</Text>
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: "#eee", borderRadius: 14, padding: 12 }}>
            <Text style={{ opacity: 0.7 }}>Salidas</Text>
            <Text style={{ fontSize: 20, fontWeight: "900" }}>{data.resumen.salidas}</Text>
          </View>
          <View style={{ flex: 1, borderWidth: 1, borderColor: "#eee", borderRadius: 14, padding: 12 }}>
            <Text style={{ opacity: 0.7 }}>Total</Text>
            <Text style={{ fontSize: 20, fontWeight: "900" }}>{data.resumen.total}</Text>
          </View>
        </View>
      </View>

      <Pressable onPress={confirmarCierre} style={{ backgroundColor: "#dc2626", padding: 14, borderRadius: 999, alignItems: "center" }}>
        <Text style={{ color: "#fff", fontWeight: "900" }}>Confirmar cierre</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={{ padding: 10, alignItems: "center" }}>
        <Text style={{ opacity: 0.7 }}>Volver</Text>
      </Pressable>
    </View>
  );
}
