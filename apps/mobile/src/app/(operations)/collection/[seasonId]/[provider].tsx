import { useLocalSearchParams } from "expo-router";
import { ProviderSourcesScreen } from "../../../../features/collection/screens/provider-sources-screen";
import { usePreparationDiscard } from "../../../../features/collection/forms/use-preparation-discard";
import { RequestError } from "../../../../shared/components/request-feedback";

/** Only the two contract-owned official providers expose preparation; form discard uses native navigation. */
export default function ProviderSourcesRoute() {
  const { seasonId, provider } = useLocalSearchParams<{
    seasonId: string;
    provider: string;
  }>();
  const onDirtyChange = usePreparationDiscard();
  return provider === "ffvb" || provider === "lnv" ? (
    <ProviderSourcesScreen
      seasonId={seasonId}
      provider={provider}
      onDirtyChange={onDirtyChange}
    />
  ) : (
    <RequestError message="Cette source est indisponible." />
  );
}
