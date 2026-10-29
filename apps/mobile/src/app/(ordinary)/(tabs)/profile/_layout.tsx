import { Stack } from "expo-router";

/** Direct editor links retain the overview as the back destination. */
export const unstable_settings = { anchor: "index" };

/** Native profile history keeps the ordinary tab capsule visible around overview and editing. */
export default function ProfileLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
