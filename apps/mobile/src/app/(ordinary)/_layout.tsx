import { stackScreenOptions } from "@/shared/native/stack-screen-options";
import { NotificationState } from "@/features/notifications/state/notification-state";
import { Stack, usePathname } from "expo-router";
import { useTheme } from "@/shared/theme/theme-provider";
import { sheetScreenOptions } from "@/shared/components/sheet";
import { SearchVisitProvider } from "@/features/discovery/forms/search-visit";
import {
  PersonalSeasonProvider,
  usePersonalSeasonScope,
} from "@/features/following/components/personal-season-provider";
import { useAgeDeclaration } from "@/features/advertising/age-declaration-provider";

/** Native direct links retain the ordinary caller behind contextual sheets. */
export const unstable_settings = { anchor: "(tabs)" };

/** Public admission is resolved above; account prerequisites stay inside their destination. */
export default function OrdinaryLayout() {
  const pathname = usePathname();
  const age = useAgeDeclaration();
  return (
    <NotificationState>
      <SearchVisitProvider
        enter={pathname === "/search" || pathname.startsWith("/search/")}
      >
        <PersonalSeasonProvider
          enabled={
            !age.loading &&
            !age.required &&
            (pathname === "/" || pathname === "/season")
          }
        >
          <OrdinaryStack />
        </PersonalSeasonProvider>
      </SearchVisitProvider>
    </NotificationState>
  );
}

/** Contextual presentations share the Stack above Tabs, so native layering covers the retained capsule on both platforms. */
function OrdinaryStack() {
  const { colors } = useTheme();
  const scope = usePersonalSeasonScope();
  const canChooseSeason = Boolean(
    scope?.usable && !scope.blocked && scope.season.options.data,
  );
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="search/(sheets)/filters"
        options={{
          ...sheetScreenOptions,
          contentStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="search/(sheets)/choice"
        options={{
          ...sheetScreenOptions,
          contentStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Protected guard={canChooseSeason}>
        <Stack.Screen
          name="(sheets)/season"
          options={{
            ...sheetScreenOptions,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
      </Stack.Protected>
      <Stack.Screen
        name="privacy"
        options={{
          ...sheetScreenOptions,
          sheetAllowedDetents: "fitToContents",
          contentStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="privacy-age"
        options={{
          ...sheetScreenOptions,
          sheetAllowedDetents: "fitToContents",
          contentStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="sign-in-invitation"
        options={{
          ...sheetScreenOptions,
          sheetAllowedDetents: "fitToContents",
          contentStyle: { backgroundColor: colors.surface },
        }}
      />
    </Stack>
  );
}
