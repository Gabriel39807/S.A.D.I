import { Stack } from "expo-router";

export default function AprendizLayout() {
  return (
    <Stack screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="home" options={{ title: "Panel Aprendiz" }} />
      <Stack.Screen name="historial" options={{ title: "Historial" }} />
      <Stack.Screen name="alertas" options={{ title: "Alertas" }} />
    </Stack>
  );
}
