import { ScreenState } from "../../../../shared/components/screen-state";
import { PageHeader } from "../../../../shared/components/page-header";
import { Page, PageScrollView } from "../../../../shared/components/page";
import { ErrorState } from "../../../../shared/components/state-card";

import { useLocalSearchParams } from "expo-router";
import { ProviderSourcesScreen } from "../../../../features/collection/screens/provider-sources-screen";

/** Only the two contract-owned official providers expose preparation; form discard uses native navigation. */
export default function ProviderSourcesRoute() {
  const { seasonId, provider } = useLocalSearchParams<{
    seasonId: string;
    provider: string;
  }>();
  return provider === "ffvb" || provider === "lnv" ? (
    <ProviderSourcesScreen seasonId={seasonId} provider={provider} />
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
