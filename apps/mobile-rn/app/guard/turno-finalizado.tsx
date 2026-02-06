import React from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useSessionStore } from "../../src/store/session";

export default function TurnoFinalizado() {
  const signOut = useSessionStore((s) => s.signOut);

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: "center", gap: 14 }}>
      <Text style={{ fontSize: 28, fontWeight: "900", textAlign: "center" }}>Turno Finalizado</Text>
      <Text style={{ textAlign: "center", opacity: 0.7 }}>
        Tu turno ha sido cerrado correctamente. Gracias por tu labor en el control de acceso.
      </Text>

      <Pressable
        onPress={async () => {
          await signOut();
          router.replace("/");
        }}
        style={{ backgroundColor: "#16a34a", padding: 14, borderRadius: 999, alignItems: "center" }}
      >
        <Text style={{ color: "#fff", fontWeight: "900" }}>Volver al inicio</Text>
      </Pressable>
    </View>
  );
}
