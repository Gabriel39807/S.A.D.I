import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";

import { useSessionStore } from "../src/store/session";

export default function RootLayout() {
  const bootstrap = useSessionStore((s) => s.bootstrap);
  const isReady = useSessionStore((s) => s.isReady);
  const user = useSessionStore((s) => s.user);

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!user) router.replace("/");
    else if (user.rol === "guarda") router.replace("/guard/home");
  }, [isReady, user]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
