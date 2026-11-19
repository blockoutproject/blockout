import { useStackScreenOptions } from "@/shared/native/stack-screen-options";
import { Stack } from "expo-router";

/** Direct editor links retain the overview as the back destination. */
export const unstable_settings = { anchor: "index" };

/** Native profile history retains the overview and the guarded dedicated forms. */
export default function ProfileLayout() {
  const screenOptions = useStackScreenOptions();
  return <Stack screenOptions={screenOptions} />;
}
