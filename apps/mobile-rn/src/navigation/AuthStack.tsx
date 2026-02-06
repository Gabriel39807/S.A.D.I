import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RoleSelectScreen } from "../screens/RoleSelectScreen";
import { GuardLoginScreen } from "../screens/guard/GuardLoginScreen";

export type AuthStackParamList = {
  RoleSelect: undefined;
  GuardLogin: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} options={{ title: "SADI" }} />
      <Stack.Screen name="GuardLogin" component={GuardLoginScreen} options={{ title: "Personal de Seguridad" }} />
    </Stack.Navigator>
  );
}
