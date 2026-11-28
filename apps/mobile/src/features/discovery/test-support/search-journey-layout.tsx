import { Stack, usePathname } from "expo-router";
import { sheetScreenOptions } from "@/shared/components/sheet";
import { SearchVisitProvider } from "../forms/search-visit";

/** Real visit and sibling modal routes; each suite supplies its own session, Query and native-I/O boundaries. */
export function SearchJourneyLayout() {
  const pathname = usePathname();
  return (
    <SearchVisitProvider
      enter={pathname === "/search" || pathname.startsWith("/search/")}
    >
      <Stack screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen
          name="search/(sheets)/filters"
          options={sheetScreenOptions}
        />
        <Stack.Screen
          name="search/(sheets)/choice"
          options={sheetScreenOptions}
        />
      </Stack>
    </SearchVisitProvider>
  );
}
