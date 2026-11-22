import { useRouter } from "expo-router";
import type { CollectionProviderEnum } from "../../../../.generated/schemas/index.zod";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { PagedTabs } from "@/shared/components/paged-tabs";
import { useCollectionSeason } from "../api/use-source-preparation";
import { ProviderPreparationLoading } from "../components/collection-loading";
import { CollectionProviderRead } from "../components/collection-provider-read";
import { collectionBilanHref } from "../model/collection-hrefs";
import {
  CollectionFollowUp,
  CollectionFollowUpLoading,
} from "./collection-follow-up-screen";
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
  const followUpLoading = <CollectionFollowUpLoading />;
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
            preview: <PageContent>{followUpLoading}</PageContent>,
            content: (
              <CollectionProviderRead
                provider={provider}
                reading={reading}
                loadingContent={followUpLoading}
                retainControlOnError
              >
                {(control, currentSeason, controls) => (
                  <CollectionFollowUp
                    key={control.id}
                    active={tab === "suivi"}
                    control={control}
                    controls={controls}
                    season={currentSeason}
                    seasonQuery={season}
                    onOpenBilan={() =>
                      router.push(collectionBilanHref(seasonId, provider))
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
