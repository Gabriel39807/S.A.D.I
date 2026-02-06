import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";

import { useSessionStore } from "../src/store/session";
import type { Jornada, Sede } from "../src/api/turnos";

export default function IndexScreen() {
  const signInGuarda = useSessionStore((s) => s.signInGuarda);
  const user = useSessionStore((s) => s.user);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [sede, setSede] = useState<Sede>("CEGAFE");
  const [jornada, setJornada] = useState<Jornada>("MANANA");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si ya está logueado como guarda, lo mandamos al home
  React.useEffect(() => {
    if (user?.rol === "guarda") router.replace("/guard/home");
  }, [user]);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await signInGuarda({
        username: username.trim(),
        password,
        sede,
        jornada,
      });
      router.replace("/guard/home");
    } catch (e: any) {
      setError(e?.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: "center", gap: 14 }}>
      <Text style={{ fontSize: 28, fontWeight: "900", textAlign: "center" }}>SADI</Text>
      <Text style={{ textAlign: "center", opacity: 0.7 }}>
        Personal de Seguridad
      </Text>

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 18,
          padding: 16,
          borderWidth: 1,
          borderColor: "#eee",
          gap: 10,
        }}
      >
        <Text style={{ fontWeight: "800" }}>Usuario</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="guardia.carlos"
          autoCapitalize="none"
          style={{ borderWidth: 1, borderColor: "#eee", padding: 12, borderRadius: 12 }}
        />

        <Text style={{ fontWeight: "800" }}>Contraseña</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="********"
          secureTextEntry
          style={{ borderWidth: 1, borderColor: "#eee", padding: 12, borderRadius: 12 }}
        />

        <Text style={{ fontWeight: "800" }}>Sede</Text>
        <View style={{ borderWidth: 1, borderColor: "#eee", borderRadius: 12, overflow: "hidden" }}>
          <Picker selectedValue={sede} onValueChange={(v) => setSede(v)}>
            <Picker.Item label="CEGAFE" value="CEGAFE" />
            <Picker.Item label="SANTA CLARA" value="SANTA_CLARA" />
            <Picker.Item label="ITEDRIS" value="ITEDRIS" />
            <Picker.Item label="GASTRONOMIA" value="GASTRONOMIA" />
          </Picker>
        </View>

        <Text style={{ fontWeight: "800" }}>Turno</Text>
        <View style={{ borderWidth: 1, borderColor: "#eee", borderRadius: 12, overflow: "hidden" }}>
          <Picker selectedValue={jornada} onValueChange={(v) => setJornada(v)}>
            <Picker.Item label="Mañana" value="MANANA" />
            <Picker.Item label="Tarde" value="TARDE" />
            <Picker.Item label="Noche" value="NOCHE" />
          </Picker>
        </View>

        {error ? <Text style={{ color: "red" }}>{error}</Text> : null}

        <Pressable
          disabled={loading}
          onPress={onSubmit}
          style={{
            marginTop: 6,
            backgroundColor: loading ? "#6b7280" : "#16a34a",
            padding: 14,
            borderRadius: 999,
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "900" }}>Iniciar Turno</Text>
          )}
        </Pressable>

        <Text style={{ textAlign: "center", opacity: 0.6, marginTop: 6 }}>
          Recuerda finalizar el turno al terminar tu jornada.
        </Text>
      </View>
    </View>
  );
}
