import { useLocalSearchParams } from "expo-router";
import { CollectionBilanVisit } from "@/features/collection/screens/collection-bilan-visit";
import {
  collectionBilanRouteCriteria,
  collectionProviderFromRoute,
} from "@/features/collection/model/collection-route-params";
import { ErrorState } from "@/shared/components/state-card";
import { Page, PageScrollView } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { ScreenState } from "@/shared/components/screen-state";

export default function CollectionBilanRoute() {
  const params = useLocalSearchParams<{ seasonId: string; provider: string }>();
  const provider = collectionProviderFromRoute(params.provider);
  return provider ? (
    <CollectionBilanVisit
      seasonId={params.seasonId}
      provider={provider}
      criteria={collectionBilanRouteCriteria(params)}
    />
  ) : (
    <Page header={<PageHeader title="Bilan" />}>
      <PageScrollView>
        <ScreenState>
          <ErrorState />
        </ScreenState>
      </PageScrollView>
    </Page>
  );
}
