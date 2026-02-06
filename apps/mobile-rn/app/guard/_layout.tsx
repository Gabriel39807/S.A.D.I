import { Stack } from "expo-router";

export default function GuardLayout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="home" options={{ title: "Panel Personal de Seguridad" }} />
      <Stack.Screen name="scan" options={{ title: "Escanear QR" }} />
      <Stack.Screen name="confirmacion" options={{ title: "Confirmación" }} />
      <Stack.Screen name="turno-finalizado" options={{ title: "" }} />
    </Stack>
  );
}
