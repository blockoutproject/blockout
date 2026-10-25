import { StartupAccessGate } from "../../features/access/screens/access-gate-screen";
import { Redirect } from "expo-router";
import { useAgeDeclaration } from "../../features/advertising/age-declaration-provider";

/** Guards every ordinary-home entry without storing a second completion flag or replaying discovery. */
export default function Index() {
  const age = useAgeDeclaration();
  if (age.loading) return <StartupAccessGate />;
  if (age.required) return <Redirect href="/age-declaration" />;
  return null;
}
