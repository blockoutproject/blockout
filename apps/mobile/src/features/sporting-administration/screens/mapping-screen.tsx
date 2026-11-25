import { hashKey, useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Keyboard } from "react-native";
import type { MappingPackResponse } from "../../../../.generated/schemas/index.zod";
import {
  AccessFeedback,
  isAccessLoading,
} from "@/features/access/components/access-feedback";
import { ListLoading } from "@/shared/components/list-loading";
import { Page } from "@/shared/components/page";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { PageReadState } from "@/shared/components/page-read-state";
import { SearchField } from "@/shared/components/search-field";
import {
  SearchToolbar,
  searchToolbarMinHeight,
} from "@/shared/components/search-toolbar";
import { useSubmittedSearch } from "@/shared/forms/use-submitted-search";
import { tokens } from "@/shared/theme/tokens";
import { useSportingAuthority } from "../api/classification";
import { createMappingQueries } from "../api/mapping-queries";
import { MappingHeader } from "../components/mapping-header";
import { MappingList } from "../components/mapping-list";
import { MappingRow } from "../components/mapping-row";
import {
  selectedMappingSeason,
  useMappingRouteParams,
} from "../model/mapping-route-params";

const loadingLabel = "Chargement des packs";
const loading = <ListLoading label={loadingLabel} />;

export function MappingScreen() {
  const router = useRouter();
  const { filters, search } = useMappingRouteParams();
  const authority = useSportingAuthority("classification");
  const queries = createMappingQueries(authority);
  const seasons = useInfiniteQuery(
    queries.filters("season", !filters.seasonId),
  );
  const season = selectedMappingSeason(
    filters,
    seasons.data?.pages[0]?.items[0],
  );
  const criteria = {
    status: filters.status,
    sourceId: filters.sourceId,
    seasonId: season?.id === "all" ? undefined : season?.id,
    search: search || undefined,
  };
  const options = queries.packs(criteria, !!filters.seasonId || !!seasons.data);
  const packs = useInfiniteQuery(options);
  const seasonFailed = hasReadError(seasons) && !seasons.isFetchNextPageError;
  const searchField = useSubmittedSearch(search, (text) =>
    router.setParams({ search: text }),
  );
  const filtered = !!(filters.status || filters.sourceId || filters.seasonId);

  if (
    !authority.enabled ||
    (!filters.seasonId && (!seasons.data || seasonFailed))
  ) {
    const failed = authority.enabled
      ? seasonFailed
      : !isAccessLoading(authority);
    return (
      <Page header={<MappingHeader />}>
        <PageReadState pending={!failed}>
          {authority.enabled ? (
            <ReadFeedback query={seasons} loadingContent={loading} />
          ) : (
            <AccessFeedback {...authority} loadingContent={loading} />
          )}
        </PageReadState>
      </Page>
    );
  }

  return (
    <Page
      header={
        <>
          <MappingHeader subtitle={season?.label} />
          <SearchToolbar
            filter={{
              active: filtered,
              onPress: () =>
                router.push({
                  pathname: "/administration/mapping/filters",
                  params: { ...filters, search },
                }),
            }}
          >
            <SearchField
              {...searchField}
              label="Rechercher un pack, une poule ou une source"
              placeholder="Pack, poule, source…"
            />
          </SearchToolbar>
        </>
      }
      headerMinHeight={tokens.layout.header + searchToolbarMinHeight}
    >
      <MappingList<MappingPackResponse>
        key={hashKey(options.queryKey)}
        query={packs}
        loadingLabel={loadingLabel}
        emptyLabel="Aucun pack trouvé"
        renderItem={({ item: pack }) => {
          const { poolCount, classifiedPoolCount, defaultClassification } =
            pack;
          const singular = poolCount === 1;
          return (
            <MappingRow
              label={pack.label}
              detail={`${pack.sourceLabel} - ${poolCount} ${singular ? "poule" : "poules"}`}
              badges={[
                defaultClassification
                  ? { label: "Défaut défini", tone: "info" }
                  : { label: "Sans défaut", tone: "neutral" },
                poolCount === 0
                  ? { label: "Aucune poule", tone: "neutral" }
                  : {
                      label: `${classifiedPoolCount}/${poolCount} ${singular ? "classée" : "classées"}`,
                      tone:
                        classifiedPoolCount === poolCount
                          ? "success"
                          : "strong-warning",
                    },
              ]}
              badgePlacement="below"
              onPress={() => {
                Keyboard.dismiss();
                router.push({
                  pathname: "/administration/mapping/[packId]",
                  params: { packId: pack.id },
                });
              }}
            />
          );
        }}
      />
    </Page>
  );
}
