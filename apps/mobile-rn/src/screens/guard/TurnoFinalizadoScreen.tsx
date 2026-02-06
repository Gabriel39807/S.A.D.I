import React from "react";
import { View, Text, Pressable } from "react-native";
import { useSessionStore } from "../../store/session";

export function TurnoFinalizadoScreen() {
  const signOut = useSessionStore((s) => s.signOut);

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: "center", gap: 14 }}>
      <Text style={{ fontSize: 28, fontWeight: "900", textAlign: "center" }}>Turno Finalizado</Text>
      <Text style={{ textAlign: "center", opacity: 0.7 }}>
        Tu turno ha sido cerrado correctamente. Gracias por tu labor en el control de acceso.
      </Text>

      <Pressable
        onPress={signOut}
        style={{ backgroundColor: "#16a34a", padding: 14, borderRadius: 999, alignItems: "center" }}
      >
        <Text style={{ color: "#fff", fontWeight: "900" }}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}
