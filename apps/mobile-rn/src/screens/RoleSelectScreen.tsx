import React from "react";
import { View, Text, Pressable } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../navigation/AuthStack";

type Props = NativeStackScreenProps<AuthStackParamList, "RoleSelect">;

export function RoleSelectScreen({ navigation }: Props) {
  return (
    <View style={{ flex: 1, padding: 16, gap: 16, justifyContent: "center" }}>
      <Text style={{ fontSize: 28, fontWeight: "800", textAlign: "center" }}>SADI</Text>
      <Text style={{ fontSize: 16, textAlign: "center", opacity: 0.7 }}>
        Sistema de Control de Acceso
      </Text>

      <Pressable
        onPress={() => navigation.navigate("GuardLogin")}
        style={{ padding: 18, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee" }}
      >
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Personal de Seguridad</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>Control de acceso</Text>
      </Pressable>

      <Pressable
        onPress={() => {}}
        style={{ padding: 18, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee", opacity: 0.5 }}
      >
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Aprendiz</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>Consulta tus activos (luego)</Text>
      </Pressable>

      <Pressable
        onPress={() => {}}
        style={{ padding: 18, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee", opacity: 0.5 }}
      >
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Administrador</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>Gestión del sistema (luego)</Text>
      </Pressable>
    </View>
  );
}
