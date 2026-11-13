import { Stack } from "expo-router";
import { sheetScreenOptions } from "@/shared/components/sheet";
import { useTheme } from "@/shared/theme/theme-provider";

/** Filters keep their short sheet; match and report readers use ordinary native stack pages. */
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
    </Stack>
  );
}
