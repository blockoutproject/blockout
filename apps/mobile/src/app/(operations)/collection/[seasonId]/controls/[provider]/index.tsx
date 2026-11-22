import { ScreenState } from "@/shared/components/screen-state";
import { PageHeader } from "@/shared/components/page-header";
import { Page, PageScrollView } from "@/shared/components/page";
import { ErrorState } from "@/shared/components/state-card";

import { useLocalSearchParams } from "expo-router";
import { CollectionProviderScreen } from "@/features/collection/screens/collection-provider-screen";

/** Both provider tabs share the selected canonical season. */
export default function CollectionProviderRoute() {
  const { seasonId, provider, tab } = useLocalSearchParams<{
    seasonId: string;
    provider: string;
    tab?: string;
  }>();
  return provider === "ffvb" || provider === "lnv" ? (
    <CollectionProviderScreen
      provider={provider}
      seasonId={seasonId}
      tab={tab === "sources" ? "sources" : "suivi"}
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
