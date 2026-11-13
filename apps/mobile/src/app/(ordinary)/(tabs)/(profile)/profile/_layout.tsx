import { Stack } from "expo-router";

/** Direct editor links retain the overview as the back destination. */
export const unstable_settings = { anchor: "index" };

/** Native profile history retains the overview and the guarded dedicated forms. */
export default function ProfileLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
