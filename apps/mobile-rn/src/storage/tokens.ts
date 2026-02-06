import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "sadi_access";
const REFRESH_KEY = "sadi_refresh";

// Web fallback
function webSet(key: string, value: string) {
  globalThis?.localStorage?.setItem(key, value);
}
function webGet(key: string) {
  return globalThis?.localStorage?.getItem(key) ?? null;
}
function webDel(key: string) {
  globalThis?.localStorage?.removeItem(key);
}

export async function saveTokens(access: string, refresh: string) {
  if (Platform.OS === "web") {
    webSet(ACCESS_KEY, access);
    webSet(REFRESH_KEY, refresh);
    return;
  }
  await SecureStore.setItemAsync(ACCESS_KEY, access);
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function getAccessToken() {
  if (Platform.OS === "web") return webGet(ACCESS_KEY);
  return SecureStore.getItemAsync(ACCESS_KEY);
}

export async function getRefreshToken() {
  if (Platform.OS === "web") return webGet(REFRESH_KEY);
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearTokens() {
  if (Platform.OS === "web") {
    webDel(ACCESS_KEY);
    webDel(REFRESH_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
