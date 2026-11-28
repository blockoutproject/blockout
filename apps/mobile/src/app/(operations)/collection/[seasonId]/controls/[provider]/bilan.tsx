import { useLocalSearchParams } from "expo-router";
import { CollectionBilanVisit } from "@/features/collection/screens/collection-bilan-visit";
import {
  collectionBilanRouteCriteria,
  collectionProviderFromRoute,
} from "@/features/collection/model/collection-route-params";
import { ErrorState } from "@/shared/components/state-card";
import { Page } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { PageReadState } from "@/shared/components/page-read-state";

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
      <PageReadState>
        <ErrorState />
      </PageReadState>
    </Page>
  );
}
