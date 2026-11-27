import { useStackScreenOptions } from "@/shared/native/stack-screen-options";
import { Stack } from "expo-router";

/** Keeps ordinary help and explicit sign-in under the root public gates. */
export default function RecoveryLayout() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="sign-in" options={{ statusBarStyle: "light" }} />
    </Stack>
  );
}
