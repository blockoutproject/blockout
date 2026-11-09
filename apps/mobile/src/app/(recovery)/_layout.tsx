import { Stack } from "expo-router";

/** Keeps ordinary help and explicit sign-in beside an initial member destination, under the root public gates. */
export default function RecoveryLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
