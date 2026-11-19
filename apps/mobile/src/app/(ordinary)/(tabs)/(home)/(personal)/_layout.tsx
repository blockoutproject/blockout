import { Redirect, Stack } from "expo-router";
import { useAccountSession } from "@/features/accounts/current-account";
import { StartupAccessGate } from "@/features/access/screens/access-gate-screen";
import { useAgeDeclaration } from "@/features/advertising/age-declaration-provider";
import { useStackScreenOptions } from "@/shared/native/stack-screen-options";

/** Direct Home entries retain its index in the tab's native history. */
export const unstable_settings = { anchor: "index" };

/** Preserves Home's age/session entry guards; the ordinary Stack owns its shared season presentation. */
export default function HomeLayout() {
  const screenOptions = useStackScreenOptions();
  const age = useAgeDeclaration();
  const session = useAccountSession();
  if (age.loading) {
    return <StartupAccessGate />;
  }
  if (age.required) {
    return <Redirect href="/age-declaration" />;
  }
  if (session.status === "guest") {
    return <Redirect href="/search" />;
  }
  return <Stack screenOptions={screenOptions} />;
}
