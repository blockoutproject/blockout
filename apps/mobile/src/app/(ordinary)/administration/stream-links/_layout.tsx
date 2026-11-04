import { Stack } from "expo-router";
import { sheetScreenOptions } from "../../../../shared/components/sheet";
import { useTheme } from "../../../../shared/theme/theme-provider";

/** Short contextual sheets and a full-screen report reader retain their native callers underneath. */
export default function ModerationLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="filters"
        options={{
          ...sheetScreenOptions,
          contentStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="version"
        options={{
          ...sheetScreenOptions,
          contentStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="reports"
        options={{ presentation: "fullScreenModal" }}
      />
    </Stack>
  );
}
