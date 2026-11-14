import { Stack } from "expo-router";

/** Keeps ordinary help and explicit sign-in under the root public gates. */
export default function RecoveryLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
