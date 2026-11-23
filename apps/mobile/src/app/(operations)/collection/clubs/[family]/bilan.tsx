import { useLocalSearchParams } from "expo-router";
import { isClubCollectionFamily } from "@/features/collection/model/collection-club-family";
import { collectionBilanSearchCriteria } from "@/features/collection/model/collection-route-params";
import { CollectionClubBilanVisit } from "@/features/collection/screens/collection-bilan-visit";
import { Page } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { PageReadState } from "@/shared/components/page-read-state";
import { ErrorState } from "@/shared/components/state-card";

export default function CollectionClubBilanRoute() {
  const params = useLocalSearchParams();
  const { family } = params;
  return isClubCollectionFamily(family) ? (
    <CollectionClubBilanVisit
      family={family}
      criteria={collectionBilanSearchCriteria(params)}
    />
  ) : (
    <Page header={<PageHeader title="Bilan" />}>
      <PageReadState>
        <ErrorState />
      </PageReadState>
    </Page>
  );
}
