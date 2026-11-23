import { useLocalSearchParams } from "expo-router";
import { collectionClubFamilyFromRoute } from "@/features/collection/model/collection-club-family";
import { collectionClubBilanRouteCriteria } from "@/features/collection/model/collection-route-params";
import { CollectionClubBilanVisit } from "@/features/collection/screens/collection-bilan-visit";
import { Page } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { PageReadState } from "@/shared/components/page-read-state";
import { ErrorState } from "@/shared/components/state-card";

export default function CollectionClubBilanRoute() {
  const params = useLocalSearchParams();
  const family = collectionClubFamilyFromRoute(params.family);
  return family ? (
    <CollectionClubBilanVisit
      family={family}
      criteria={collectionClubBilanRouteCriteria(params)}
    />
  ) : (
    <Page header={<PageHeader title="Bilan" />}>
      <PageReadState>
        <ErrorState />
      </PageReadState>
    </Page>
  );
}
