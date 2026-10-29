import { Stack } from "expo-router";
import { sheetScreenOptions } from "../../../shared/components/sheet";
import { useTheme } from "../../../shared/theme/theme-provider";
import { usePersonalSeasonScope } from "../components/personal-season-provider";

/** Home and its season route share the existing owner; current admission removes stale private choice surfaces. */
export function PersonalNavigation() {
  const { colors } = useTheme();
  const scope = usePersonalSeasonScope();
  const canChoose = Boolean(
    scope?.usable && !scope.blocked && scope.season.options.data,
  );
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={canChoose}>
        <Stack.Screen
          name="(sheets)/season"
          options={{
            ...sheetScreenOptions,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}
