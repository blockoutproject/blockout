import { ScreenState } from "../../../../shared/components/screen-state";
import { PageHeader } from "../../../../shared/components/page-header";
import { Page, PageScrollView } from "../../../../shared/components/page";
import { ErrorState } from "../../../../shared/components/state-card";

import { useLocalSearchParams } from "expo-router";
import { CollectionControlScreen } from "../../../../features/collection/screens/collection-dashboard-screen";

/** Only the two seasonless families are admitted here; competition controls require an explicit season route. */
export default function ClubCollectionRoute() {
  const { family } = useLocalSearchParams<{ family: string }>();
  return family === "club-sheets" || family === "geocoding" ? (
    <CollectionControlScreen family={family} />
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
