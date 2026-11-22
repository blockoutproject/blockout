import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import type {
  CollectionProviderEnum,
  SourceBindingResponse,
} from "../../../../.generated/schemas/index.zod";
import {
  AccessFeedback,
  isAccessLoading,
} from "@/features/access/components/access-feedback";
import { controlOpacity } from "@/shared/components/control-styles";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { ListLoading } from "@/shared/components/list-loading";
import {
  PageContent,
  PageScrollView,
  pageContentStyle,
} from "@/shared/components/page";
import { PageList } from "@/shared/components/page-list";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { SearchField } from "@/shared/components/search-field";
import { SearchToolbar } from "@/shared/components/search-toolbar";
import { EmptyState } from "@/shared/components/state-card";
import { Surface } from "@/shared/components/surface";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { createCollectionQueries } from "../api/collection-queries";
import type { useCollectionSeason } from "../api/use-collection-season";
import { CollectionEmptyReload } from "../components/collection-empty-reload";
import { SourceCatalogBadge } from "../components/source-catalog-badge";
import { collectionSourceHref } from "../model/collection-hrefs";
import {
  sourceCatalogLabels,
  sourceScopes,
  type SourceFilters,
} from "../model/source-catalogue";

type SourceRow = "search" | { heading: string } | SourceBindingResponse;

export function ProviderSourcesLoading() {
  return <ListLoading label="Chargement des sources" />;
}

export function ProviderSourcesScreen({
  seasonId,
  provider,
  reading,
  filters,
}: Readonly<{
  seasonId: string;
  provider: CollectionProviderEnum;
  reading: ReturnType<typeof useCollectionSeason>;
  filters: SourceFilters;
}>) {
  const router = useRouter();
  const { colors } = useTheme();
  const [search, setSearch] = useState("");
  const { authority, season } = reading;
  const options = createCollectionQueries(authority).sources(seasonId);
  const sources = useQuery({
    ...options,
    enabled: authority.enabled && !!season.data,
  });
  const requiredRead = !season.data || hasReadError(season) ? season : sources;
  const loading = <ProviderSourcesLoading />;

  if (
    !authority.enabled ||
    !season.data ||
    !sources.data ||
    hasReadError(requiredRead)
  ) {
    const pending = authority.enabled
      ? requiredRead.isPending && !hasReadError(requiredRead)
      : isAccessLoading(authority);
    const Layout = pending ? PageContent : ScreenState;
    return (
      <PageScrollView>
        <Layout>
          {authority.enabled ? (
            <ReadFeedback query={requiredRead} loadingContent={loading} />
          ) : (
            <AccessFeedback {...authority} loadingContent={loading} />
          )}
        </Layout>
      </PageScrollView>
    );
  }

  const needle = searchKey(search.trim());
  const items = sources.data.items.filter((source) => {
    const status = source.catalog?.status ?? "not-read";
    return (
      source.provider === provider &&
      !!(source.acceptedUrl || status !== "not-read") &&
      (!filters.status || filters.status === status) &&
      (provider !== "ffvb" ||
        !filters.scope ||
        source.scope === filters.scope) &&
      searchKey(`${source.label} ${source.organizerReference}`).includes(needle)
    );
  });
  const rows: SourceRow[] = [];

  function addSection(heading: string, entries: SourceBindingResponse[]) {
    if (entries.length) {
      rows.push({ heading }, ...entries);
    }
  }

  if (provider === "lnv") {
    addSection("Championnats", items);
  } else {
    for (const scope of sourceScopes) {
      addSection(
        scope.label,
        items.filter((source) => source.scope === scope.value),
      );
    }
    addSection(
      "Autres sources",
      items.filter((source) => !source.scope),
    );
  }

  const filtered = !!(filters.status || (provider === "ffvb" && filters.scope));
  return (
    <PageList<SourceRow>
      data={["search", ...rows]}
      extraData={{ search, filters }}
      stickyHeaderIndices={[0]}
      keyExtractor={(row) =>
        row === "search" ? row : "heading" in row ? row.heading : row.id
      }
      contentContainerStyle={pageContentStyle}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        rows.length ? (
          <DataRefreshControl
            fetching={sources.isFetching}
            onRefresh={() => sources.refetch({ cancelRefetch: false })}
          />
        ) : undefined
      }
      renderItem={({ item }) => {
        if (item === "search") {
          return (
            <SearchToolbar
              style={[styles.search, { backgroundColor: colors.canvas }]}
              filter={{
                active: filtered,
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
          );
        }
        if ("heading" in item) {
          return (
            <Text
              accessibilityRole="header"
              style={[styles.heading, { color: colors.text }]}
            >
              {item.heading}
            </Text>
          );
        }
        const label = item.label;
        return (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={label}
            accessibilityValue={{
              text: sourceCatalogLabels[item.catalog?.status ?? "not-read"],
            }}
            onPress={() => router.push(collectionSourceHref(seasonId, item))}
            style={({ pressed }) => ({
              opacity: controlOpacity(false, pressed),
            })}
          >
            <Surface style={styles.source}>
              <Text style={[styles.label, { color: colors.text }]}>
                {label}
              </Text>
              <SourceCatalogBadge status={item.catalog?.status ?? "not-read"} />
              <ChevronRight
                accessible={false}
                color={colors.icon}
                size={tokens.size.icon.sm}
              />
            </Surface>
          </Pressable>
        );
      }}
      ListFooterComponent={
        !rows.length ? (
          <ScreenState style={styles.empty}>
            <EmptyState
              title={
                needle || filtered
                  ? "Aucune source correspondante"
                  : "Aucune source découverte"
              }
            >
              {!needle && !filtered && (
                <CollectionEmptyReload
                  fetching={sources.isFetching}
                  onReload={() => sources.refetch({ cancelRefetch: false })}
                />
              )}
            </EmptyState>
          </ScreenState>
        ) : undefined
      }
    />
  );
}

function searchKey(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("fr");
}

const styles = StyleSheet.create({
  empty: { paddingHorizontal: 0 },
  search: { paddingHorizontal: 0, marginBottom: tokens.spacing.xs },
  heading: {
    ...tokens.typography.navigation,
    marginBottom: tokens.spacing.sm,
    marginTop: tokens.spacing.sm,
  },
  source: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: tokens.size.control.default,
    paddingVertical: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  label: { ...tokens.typography.strong, flex: 1, minWidth: 0 },
});
