import { ErrorState } from "../../../../shared/components/state-card";
import { PreparationPage } from "../../../../features/collection/components/preparation-layout";
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
    <PreparationPage title="Collectes" state={<ErrorState />} />
  );
}
