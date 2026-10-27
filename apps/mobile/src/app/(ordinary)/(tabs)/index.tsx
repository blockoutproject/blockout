import { useAccountSession } from "../../../features/accounts/current-account";
import { StartupAccessGate } from "../../../features/access/screens/access-gate-screen";
import { Redirect } from "expo-router";
import { useAgeDeclaration } from "../../../features/advertising/age-declaration-provider";
import { PersonalScreen } from "../../../features/following/screens/personal-screen";

/** Guards every ordinary-home entry without storing a second completion flag or replaying discovery. */
export default function Index() {
  const age = useAgeDeclaration();
  const session = useAccountSession();
  if (age.loading) return <StartupAccessGate />;
  if (age.required) return <Redirect href="/age-declaration" />;
  if (session.status === "guest") return <Redirect href="/search" />;
  return <PersonalScreen />;
}
