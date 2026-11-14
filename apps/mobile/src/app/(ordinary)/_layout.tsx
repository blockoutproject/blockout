import { NotificationState } from "@/features/notifications/state/notification-state";
import { Stack } from "expo-router";
import { useTheme } from "@/shared/theme/theme-provider";
import { sheetScreenOptions } from "@/shared/components/sheet";

/** Native direct links retain the ordinary caller behind contextual sheets. */
export const unstable_settings = { anchor: "(tabs)" };

/** Public admission is resolved above; account prerequisites stay inside their destination. */
export default function OrdinaryLayout() {
  const { colors } = useTheme();
  return (
    <NotificationState>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
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
    </NotificationState>
  );
}
