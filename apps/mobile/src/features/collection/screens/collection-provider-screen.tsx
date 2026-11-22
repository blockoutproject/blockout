import { useRouter } from "expo-router";
import { useState } from "react";
import type { CollectionProviderEnum } from "../../../../.generated/schemas/index.zod";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { PagedTabs } from "@/shared/components/paged-tabs";
import { hasReadError } from "@/shared/components/read-feedback";
import { SearchField } from "@/shared/components/search-field";
import {
  SearchToolbar,
  searchToolbarMinHeight,
} from "@/shared/components/search-toolbar";
import { tokens } from "@/shared/theme/tokens";
import { useCollectionSeason } from "../api/use-collection-season";
import { CollectionProviderRead } from "../components/collection-provider-read";
import { collectionBilanHref } from "../model/collection-hrefs";
import {
  CollectionFollowUp,
  CollectionFollowUpLoading,
} from "./collection-follow-up-screen";
import type { SourceFilters } from "../model/source-catalogue";
import {
  ProviderSourcesLoading,
  ProviderSourcesScreen,
} from "./provider-sources-screen";

export function CollectionProviderScreen({
  provider,
  seasonId,
  tab,
  filters: routeFilters,
}: Readonly<{
  provider: CollectionProviderEnum;
  seasonId: string;
  tab: "suivi" | "sources";
  filters: SourceFilters;
}>) {
  const router = useRouter();
  const reading = useCollectionSeason(seasonId);
  const { authority, season } = reading;
  const [search, setSearch] = useState("");
  const sourceTab =
    tab === "sources" &&
    authority.enabled &&
    !!season.data &&
    !hasReadError(season);
  const filters: SourceFilters =
    provider === "ffvb" ? routeFilters : { status: routeFilters.status };
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
        tabBarMinHeight={
          sourceTab ? tokens.touch.minimum + searchToolbarMinHeight : undefined
        }
        renderTabBar={
          sourceTab
            ? (tabBar) => (
                <>
                  {tabBar}
                  <SearchToolbar
                    filter={{
                      active: Boolean(filters.status || filters.scope),
                      onPress: () =>
                        router.push({
                          pathname:
                            "/collection/[seasonId]/controls/[provider]/sources-filters",
                          params: { seasonId, provider, ...filters },
                        }),
                    }}
                  >
                    <SearchField
                      label="Rechercher une source"
                      placeholder="Nom ou référence…"
                      value={search}
                      onChangeText={setSearch}
                      onClear={() => setSearch("")}
                      autoCorrect={false}
                      returnKeyType="search"
                    />
                  </SearchToolbar>
                </>
              )
            : undefined
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
                view="suivi"
                loadingContent={followUpLoading}
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
                <ProviderSourcesLoading />
              </PageContent>
            ),
            content: (
              <ProviderSourcesScreen
                provider={provider}
                seasonId={seasonId}
                reading={reading}
                filters={filters}
                search={search}
              />
            ),
          },
        ]}
      />
    </Page>
  );
}
