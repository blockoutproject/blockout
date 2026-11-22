import { useRouter } from "expo-router";
import type { CollectionProviderEnum } from "../../../../.generated/schemas/index.zod";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { PagedTabs } from "@/shared/components/paged-tabs";
import { useCollectionSeason } from "../api/use-source-preparation";
import {
  CollectionControlLoading,
  CollectionSummaryLoading,
  ProviderPreparationLoading,
} from "../components/collection-loading";
import { CollectionProviderRead } from "../components/collection-provider-read";
import { CollectionFollowUp } from "./collection-follow-up-screen";
import { ProviderSourcesScreen } from "./provider-sources-screen";

/** Source preparation stays mounted after tab selection so its established native draft lifetime is preserved. */
export function CollectionProviderScreen({
  provider,
  seasonId,
  tab,
}: Readonly<{
  provider: CollectionProviderEnum;
  seasonId: string;
  tab: "suivi" | "sources";
}>) {
  const router = useRouter();
  const reading = useCollectionSeason(seasonId);
  const { season } = reading;
  return (
    <Page fullBleed>
      <PagedTabs
        selected={tab}
        onSelect={(tab) => router.setParams({ tab })}
        header={
          <PageHeader
            title="Collecte"
            subtitle={[provider.toUpperCase(), season.data?.label]
              .filter(Boolean)
              .join("  ")}
          />
        }
        tabs={[
          {
            id: "suivi",
            label: "Suivi",
            preview: (
              <PageContent>
                <CollectionControlLoading />
                <CollectionSummaryLoading />
              </PageContent>
            ),
            content: (
              <CollectionProviderRead provider={provider} reading={reading}>
                {(controlId, currentSeason) => (
                  <CollectionFollowUp
                    key={controlId}
                    active={tab === "suivi"}
                    controlId={controlId}
                    provider={provider}
                    season={currentSeason}
                    refreshSeason={{
                      fetching: season.isFetching,
                      refetch: () => season.refetch({ cancelRefetch: false }),
                    }}
                    onOpenBilan={() =>
                      router.push({
                        pathname:
                          "/collection/[seasonId]/controls/[provider]/bilan",
                        params: { seasonId, provider },
                      })
                    }
                  />
                )}
              </CollectionProviderRead>
            ),
          },
          {
            id: "sources",
            label: "Sources",
            preview: (
              <PageContent>
                <ProviderPreparationLoading />
              </PageContent>
            ),
            content: (
              <ProviderSourcesScreen provider={provider} seasonId={seasonId} />
            ),
          },
        ]}
      />
    </Page>
  );
}
