import { ScreenState } from "@/shared/components/screen-state";
import { PageHeader } from "@/shared/components/page-header";
import { Page, PageScrollView } from "@/shared/components/page";
import { ErrorState } from "@/shared/components/state-card";

import { useLocalSearchParams } from "expo-router";
import { CollectionProviderScreen } from "@/features/collection/screens/collection-provider-screen";
import { sourceFiltersFromRoute } from "@/features/collection/model/source-catalogue";
import { collectionProviderFromRoute } from "@/features/collection/model/collection-route-params";

/** Both provider tabs share the selected canonical season. */
export default function CollectionProviderRoute() {
  const params = useLocalSearchParams<{
    seasonId: string;
    provider: string;
    tab?: string;
    status?: string;
    scope?: string;
  }>();
  const provider = collectionProviderFromRoute(params.provider);
  return provider ? (
    <CollectionProviderScreen
      filters={sourceFiltersFromRoute(params)}
      provider={provider}
      seasonId={params.seasonId}
      tab={params.tab === "sources" ? "sources" : "suivi"}
    />
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
