import { Stack } from "expo-router";
import { sheetScreenOptions } from "../../../../shared/components/sheet";
import { useTheme } from "../../../../shared/theme/theme-provider";

/** Registers only the existing native filter-sheet presentation; other moderation routes are ordinary screens. */
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
