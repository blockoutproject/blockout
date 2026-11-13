import { NotificationState } from "@/features/notifications/state/notification-state";
import { Stack } from "expo-router";
import { useTheme } from "@/shared/theme/theme-provider";
import { sheetScreenOptions } from "@/shared/components/sheet";
import { useAccountAvailability } from "@/features/accounts/current-account";
import { MemberAdmissionScreen } from "@/features/accounts/screens/member-admission-screen";

/** Native direct links retain the ordinary caller behind contextual sheets. */
export const unstable_settings = { anchor: "(tabs)" };

/** Holds the requested member route in Router during first account recovery; admitted stacks retain their native history. */
export default function OrdinaryLayout() {
  const { colors } = useTheme();
  const account = useAccountAvailability();
  if (!account.canEnter) {
    return <MemberAdmissionScreen />;
  }
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
          name="pro"
          options={{ presentation: "fullScreenModal" }}
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
