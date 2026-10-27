import { ScreenState } from "../../../shared/components/screen-state";
import { PageHeader } from "../../../shared/components/page-header";
import { Page, PageScrollView } from "../../../shared/components/page";
import { ErrorState } from "../../../shared/components/state-card";

import { Stack } from "expo-router";
import { useOperationalAdmission } from "../../../features/access/queries/use-access-admission";

/** Collection operations retain F12's current minimum-version/identity admission independently of ordinary access. */
export default function CollectionLayout() {
  return useOperationalAdmission() ? (
    <Stack screenOptions={{ headerShown: false }} />
  ) : (
    <Page>
      <PageHeader title="Collectes" />
      <PageScrollView>
        <ScreenState>
          <ErrorState />
        </ScreenState>
      </PageScrollView>
    </Page>
  );
}
