import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ProviderSourcesScreen } from "../../../../features/collection/screens/provider-sources-screen";
import { usePreparationDiscard } from "../../../../features/collection/forms/use-preparation-discard";
import { discardProviderPreparationEditor } from "../../../../features/collection/forms/preparation-editors";
import { RequestError } from "../../../../shared/components/request-feedback";

/** Only the two contract-owned official providers expose preparation; form discard uses native navigation. */
export default function ProviderSourcesRoute() {
  const { seasonId, provider } = useLocalSearchParams<{
    seasonId: string;
    provider: string;
  }>();
  const [dirty, onDirtyChange] = useState(false);
  usePreparationDiscard(dirty, () => {
    onDirtyChange(false);
    discardProviderPreparationEditor();
  });
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
