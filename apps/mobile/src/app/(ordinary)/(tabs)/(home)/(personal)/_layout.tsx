import { Redirect, Stack } from "expo-router";
import { useAccountSession } from "@/features/accounts/current-account";
import { useStackScreenOptions } from "@/shared/native/stack-screen-options";

/** Direct Home entries retain its index in the tab's native history. */
export const unstable_settings = { anchor: "index" };

/** Guests enter public search while Home retains its native stack for an account. */
export default function HomeLayout() {
  const screenOptions = useStackScreenOptions();
  const session = useAccountSession();
  if (session.status === "guest") {
    return <Redirect href="/search" />;
  }
  return <Stack screenOptions={screenOptions} />;
}
