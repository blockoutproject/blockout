import { useStackScreenOptions } from "@/shared/native/stack-screen-options";
import { ScreenState } from "@/shared/components/screen-state";
import { PageHeader } from "@/shared/components/page-header";
import { Page, PageScrollView } from "@/shared/components/page";
import { ErrorState } from "@/shared/components/state-card";

import { Stack } from "expo-router";
import { useOperationalAdmission } from "@/features/access/queries/use-access-admission";
import { useSheetScreenOptions } from "@/shared/components/sheet";

/** Collection operations retain F12's current minimum-version/identity admission independently of ordinary access. */
export default function CollectionLayout() {
  const screenOptions = useStackScreenOptions();
  const sheetOptions = useSheetScreenOptions();
  return useOperationalAdmission() ? (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="[seasonId]/actions" options={sheetOptions} />
      <Stack.Screen
        name="clubs/[family]/bilan-filters"
        options={sheetOptions}
      />
      <Stack.Screen
        name="[seasonId]/controls/[provider]/bilan-filters"
        options={sheetOptions}
      />
      <Stack.Screen
        name="[seasonId]/controls/[provider]/sources-filters"
        options={sheetOptions}
      />
    </Stack>
  ) : (
    <Page header={<PageHeader title="Collectes" />}>
      <PageScrollView>
        <ScreenState>
          <ErrorState />
        </ScreenState>
      </PageScrollView>
    </Page>
  );
}
