import { zodResolver } from "@hookform/resolvers/zod";
import { hashKey, useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Keyboard } from "react-native";
import type { MappingPackResponse } from "../../../../.generated/schemas/index.zod";
import {
  AccessFeedback,
  isAccessLoading,
} from "@/features/access/components/access-feedback";
import { ListLoading } from "@/shared/components/list-loading";
import { Page, PageContent, PageScrollView } from "@/shared/components/page";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { SearchField } from "@/shared/components/search-field";
import { SearchToolbar } from "@/shared/components/search-toolbar";
import { tokens } from "@/shared/theme/tokens";
import { useSportingAuthority } from "../api/classification";
import { createMappingQueries } from "../api/mapping-queries";
import { MappingHeader } from "../components/mapping-header";
import { MappingList } from "../components/mapping-list";
import { MappingRow, mappingStatusLabels } from "../components/mapping-row";
import {
  mappingSearchSchema,
  useMappingRouteParams,
} from "../model/mapping-route-params";

const loading = <ListLoading label="Chargement des packs" />;

export function MappingScreen() {
  const router = useRouter();
  const { filters, search } = useMappingRouteParams();
  const authority = useSportingAuthority("classification");
  const queries = createMappingQueries(authority);
  const seasons = useInfiniteQuery(
    queries.filters("season", !filters.seasonId),
  );
  const latest = seasons.data?.pages[0]?.items[0];
  const seasonId =
    filters.seasonId === "all" ? undefined : (filters.seasonId ?? latest?.id);
  const seasonLabel =
    filters.seasonId === "all"
      ? "Toutes les saisons"
      : filters.seasonId
        ? filters.seasonLabel
        : latest?.label;
  const criteria = {
    status: filters.status,
    sourceId: filters.sourceId,
    seasonId,
    search: search || undefined,
  };
  const options = queries.packs(criteria, !!filters.seasonId || !!seasons.data);
  const packs = useInfiniteQuery(options);
  const seasonFailed = hasReadError(seasons) && !seasons.isFetchNextPageError;
  const { control, handleSubmit, reset } = useForm({
    values: { search: search ?? "" },
    resolver: zodResolver(mappingSearchSchema),
    mode: "onChange",
  });
  const filtered = !!(filters.status || filters.sourceId || filters.seasonId);

  if (
    !authority.enabled ||
    (!filters.seasonId && (!seasons.data || seasonFailed))
  ) {
    const failed = authority.enabled
      ? seasonFailed
      : !isAccessLoading(authority);
    const Layout = failed ? ScreenState : PageContent;
    return (
      <Page header={<MappingHeader />}>
        <PageScrollView>
          <Layout>
            {authority.enabled ? (
              <ReadFeedback query={seasons} loadingContent={loading} />
            ) : (
              <AccessFeedback {...authority} loadingContent={loading} />
            )}
          </Layout>
        </PageScrollView>
      </Page>
    );
  }

  return (
    <Page
      header={
        <>
          <MappingHeader subtitle={seasonLabel} />
          <SearchToolbar
            style={{ paddingTop: tokens.spacing.xs }}
            filter={{
              active: filtered,
              onPress: () =>
                router.push({
                  pathname: "/administration/mapping/filters",
                  params: { ...filters, search },
                }),
            }}
          >
            <Controller
              control={control}
              name="search"
              render={({ field, fieldState }) => (
                <SearchField
                  ref={field.ref}
                  label="Rechercher un pack, une poule ou une source"
                  placeholder="Pack, poule, source…"
                  value={field.value}
                  autoCorrect={false}
                  returnKeyType="search"
                  error={
                    fieldState.invalid
                      ? "La recherche est limitée à 200 caractères."
                      : undefined
                  }
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  onSubmitEditing={() =>
                    void handleSubmit(({ search }) =>
                      router.setParams({ search }),
                    )()
                  }
                  onClear={() => {
                    reset({ search: "" });
                    router.setParams({ search: "" });
                  }}
                />
              )}
            />
          </SearchToolbar>
        </>
      }
      headerMinHeight={
        tokens.layout.header + tokens.size.control.default + tokens.spacing.xs
      }
    >
      <MappingList<MappingPackResponse>
        key={hashKey(options.queryKey)}
        query={packs}
        loadingLabel="Chargement des packs"
        emptyLabel="Aucun pack trouvé"
        renderRow={(pack) => (
          <MappingRow
            label={pack.label}
            detail={`${pack.sourceLabel} · ${pack.poolCount} ${pack.poolCount === 1 ? "poule" : "poules"}`}
            badge={mappingStatusLabels[pack.status]}
            tone={pack.status === "all" ? "success" : "warning"}
            onPress={() => {
              Keyboard.dismiss();
              router.push({
                pathname: "/administration/mapping/[packId]",
                params: { packId: pack.id },
              });
            }}
          />
        )}
      />
    </Page>
  );
}
