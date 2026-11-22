import { useLocalSearchParams } from "expo-router";
import { CollectionBilanVisit } from "@/features/collection/screens/collection-bilan-visit";
import { collectionBilanRouteCriteria } from "@/features/collection/model/collection-bilan-route-criteria";
import { ErrorState } from "@/shared/components/state-card";
import { Page, PageScrollView } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { ScreenState } from "@/shared/components/screen-state";

export default function CollectionBilanRoute() {
  const params = useLocalSearchParams<{ seasonId: string; provider: string }>();
  const { seasonId, provider } = params;
  return provider === "ffvb" || provider === "lnv" ? (
    <CollectionBilanVisit
      seasonId={seasonId}
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
