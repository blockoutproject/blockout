import { Stack } from "expo-router";
import { sheetScreenOptions } from "../../../../shared/components/sheet";
import { useTheme } from "../../../../shared/theme/theme-provider";

/** Registers short filter and exact-lineage views with the existing native sheet presentation. */
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
    </Stack>
  );
}
