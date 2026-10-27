import { NotificationState } from "../../features/notifications/state/notification-state";
import { Stack } from "expo-router";
import { useTheme } from "../../shared/theme/theme-provider";
import { sheetScreenOptions } from "../../shared/components/sheet";

/** Keeps ordinary routes inside their protected group with the existing native modal presentations. */
export default function OrdinaryLayout() {
  const { colors } = useTheme();
  return (
    <NotificationState>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
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
