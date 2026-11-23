import { PageHeader } from "@/shared/components/page-header";
import { Page } from "@/shared/components/page";
import { PageReadState } from "@/shared/components/page-read-state";
import { ErrorState } from "@/shared/components/state-card";

import { useLocalSearchParams } from "expo-router";
import { CollectionControlScreen } from "@/features/collection/screens/collection-dashboard-screen";
import { isClubCollectionFamily } from "@/features/collection/model/collection-club-family";

/** Only the two seasonless families are admitted here; competition controls require an explicit season route. */
export default function ClubCollectionRoute() {
  const { family } = useLocalSearchParams();
  return isClubCollectionFamily(family) ? (
    <CollectionControlScreen family={family} />
  ) : (
    <Page header={<PageHeader title="Collectes" />}>
      <PageReadState>
        <ErrorState />
      </PageReadState>
    </Page>
  );
}
