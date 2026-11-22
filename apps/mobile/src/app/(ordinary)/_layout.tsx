import { useStackScreenOptions } from "@/shared/native/stack-screen-options";
import { NotificationState } from "@/features/notifications/state/notification-state";
import { Stack, usePathname } from "expo-router";
import { useSheetScreenOptions } from "@/shared/components/sheet";
import { SearchVisitProvider } from "@/features/discovery/forms/search-visit";
import {
  PersonalSeasonProvider,
  usePersonalSeasonScope,
} from "@/features/following/components/personal-season-provider";

/** A direct link to a contextual sheet keeps the default tab stack underneath. */
export const unstable_settings = { anchor: "(tabs)" };

/** Public admission is resolved above; account prerequisites stay inside their destination. */
export default function OrdinaryLayout() {
  const pathname = usePathname();
  return (
    <NotificationState>
      <SearchVisitProvider
        enter={pathname === "/search" || pathname.startsWith("/search/")}
      >
        <PersonalSeasonProvider
          enabled={pathname === "/" || pathname === "/season"}
        >
          <OrdinaryStack />
        </PersonalSeasonProvider>
      </SearchVisitProvider>
    </NotificationState>
  );
}

/** Contextual presentations share the Stack above Tabs, so native layering covers the retained capsule on both platforms. */
function OrdinaryStack() {
  const screenOptions = useStackScreenOptions();
  const scope = usePersonalSeasonScope();
  const canChooseSeason = Boolean(
    scope?.usable && !scope.blocked && scope.season.options.data,
  );
  const sheetOptions = useSheetScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="search/(sheets)/filters" options={sheetOptions} />
      <Stack.Screen name="search/(sheets)/choice" options={sheetOptions} />
      <Stack.Protected guard={canChooseSeason}>
        <Stack.Screen name="(sheets)/season" options={sheetOptions} />
      </Stack.Protected>
      <Stack.Screen name="sign-in-invitation" options={sheetOptions} />
    </Stack>
  );
}
