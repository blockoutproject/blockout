import { ScreenState } from "../../../../../shared/components/screen-state";
import { PageHeader } from "../../../../../shared/components/page-header";
import { Page, PageScrollView } from "../../../../../shared/components/page";
import { ErrorState } from "../../../../../shared/components/state-card";

import { useLocalSearchParams } from "expo-router";
import { CollectionControlScreen } from "../../../../../features/collection/screens/collection-dashboard-screen";

/** Commands target exactly the selected season and one supported competition provider. */
export default function CompetitionCollectionRoute() {
  const { seasonId, provider } = useLocalSearchParams<{
    seasonId: string;
    provider: string;
  }>();
  return provider === "ffvb" || provider === "lnv" ? (
    <CollectionControlScreen family={provider} seasonId={seasonId} />
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
