import { Redirect } from "expo-router";
import { useAccountSession } from "../../../../features/accounts/current-account";
import { StartupAccessGate } from "../../../../features/access/screens/access-gate-screen";
import { useAgeDeclaration } from "../../../../features/advertising/age-declaration-provider";
import { PersonalSeasonProvider } from "../../../../features/following/components/personal-season-provider";
import { PersonalNavigation } from "../../../../features/following/screens/personal-navigation";

/** Direct season entries retain Home behind the native contextual route. */
export const unstable_settings = { anchor: "index" };

/** Preserves Home's existing age/session entry guards before mounting its single private season owner. */
export default function HomeLayout() {
  const age = useAgeDeclaration();
  const session = useAccountSession();
  if (age.loading) return <StartupAccessGate />;
  if (age.required) return <Redirect href="/age-declaration" />;
  if (session.status === "guest") return <Redirect href="/search" />;
  return (
    <PersonalSeasonProvider>
      <PersonalNavigation />
    </PersonalSeasonProvider>
  );
}
