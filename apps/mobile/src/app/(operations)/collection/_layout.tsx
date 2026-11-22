import { useStackScreenOptions } from "@/shared/native/stack-screen-options";
import { ScreenState } from "@/shared/components/screen-state";
import { PageHeader } from "@/shared/components/page-header";
import { Page, PageScrollView } from "@/shared/components/page";
import { ErrorState } from "@/shared/components/state-card";

import { Stack } from "expo-router";
import { useOperationalAdmission } from "@/features/access/queries/use-access-admission";
import { sheetScreenOptions } from "@/shared/components/sheet";
import { useTheme } from "@/shared/theme/theme-provider";

/** Collection operations retain F12's current minimum-version/identity admission independently of ordinary access. */
export default function CollectionLayout() {
  const screenOptions = useStackScreenOptions();
  const { colors } = useTheme();
  return useOperationalAdmission() ? (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="[seasonId]/controls/[provider]/bilan-filters"
        options={{
          ...sheetScreenOptions,
          contentStyle: { backgroundColor: colors.surface },
        }}
      />
      <Stack.Screen
        name="[seasonId]/controls/[provider]/sources-filters"
        options={{
          ...sheetScreenOptions,
          contentStyle: { backgroundColor: colors.surface },
        }}
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
