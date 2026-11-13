import { Stack } from "expo-router";

/** Each tab retains its root behind cold links; the first alphabetical group makes Search the sporting default. */
export const unstable_settings = {
  anchor: "search",
  home: { anchor: "(personal)" },
  notifications: { anchor: "notifications" },
  profile: { anchor: "profile" },
};

export default function SharedTabLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
