import { Stack } from "expo-router";
import { SearchVisitProvider } from "../../../features/discovery/forms/search-visit";
import { sheetScreenOptions } from "../../../shared/components/sheet";
import { useTheme } from "../../../shared/theme/theme-provider";

/** Deep links retain the search page behind either native modal route. */
export const unstable_settings = { anchor: "index" };

/** The search visit outlives its native draft and choice sheets, preserving the underlying list. */
export default function SearchLayout() {
  const { colors } = useTheme();
  return (
    <SearchVisitProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="filters"
          options={{
            ...sheetScreenOptions,
            sheetAllowedDetents: [0.75],
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
        <Stack.Screen
          name="choice"
          options={{
            ...sheetScreenOptions,
            sheetAllowedDetents: [0.5],
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
      </Stack>
    </SearchVisitProvider>
  );
}
