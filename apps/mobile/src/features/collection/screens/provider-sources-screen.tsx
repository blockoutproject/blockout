import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
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
import { pageContentStyle } from "@/shared/components/page";
import { PageList } from "@/shared/components/page-list";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { EmptyState } from "@/shared/components/state-card";
import { Surface } from "@/shared/components/surface";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { createCollectionQueries } from "../api/collection-queries";
import type { useCollectionSeason } from "../api/use-collection-season";
import { ReloadButton } from "@/shared/components/reload-button";
import { PageReadState } from "@/shared/components/page-read-state";
import { SourceCatalogBadge } from "../components/source-catalog-badge";
import { collectionSourceHref } from "../model/collection-hrefs";
import {
  sourceCatalogLabels,
  sourceCatalogStatus,
  sourceScopes,
  type SourceFilters,
} from "../model/source-catalogue";

type SourceRow = { heading: string } | SourceBindingResponse;

export function ProviderSourcesLoading() {
  return <ListLoading label="Chargement des sources" />;
}

export function ProviderSourcesScreen({
  seasonId,
  provider,
  reading,
  filters,
  search,
}: Readonly<{
  seasonId: string;
  provider: CollectionProviderEnum;
  reading: ReturnType<typeof useCollectionSeason>;
  filters: SourceFilters;
  search: string;
}>) {
  const router = useRouter();
  const { colors } = useTheme();
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
    return (
      <PageReadState pending={pending}>
        {authority.enabled ? (
          <ReadFeedback query={requiredRead} loadingContent={loading} />
        ) : (
          <AccessFeedback {...authority} loadingContent={loading} />
        )}
      </PageReadState>
    );
  }

  const needle = searchKey(search.trim());
  const { scope, status: filterStatus } = filters;
  const items = sources.data.items.filter((source) => {
    const status = sourceCatalogStatus(source.catalog);
    return (
      source.provider === provider &&
      !!(source.acceptedUrl || status !== "not-read") &&
      (!filterStatus || filterStatus === status) &&
      (!scope || source.scope === scope) &&
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

  return (
    <PageList<SourceRow>
      data={rows}
      keyExtractor={(row) => ("heading" in row ? row.heading : row.id)}
      contentContainerStyle={rows.length ? pageContentStyle : undefined}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        rows.length ? (
          <DataRefreshControl
            fetching={sources.isFetching}
            onRefresh={() => sources.refetch({ cancelRefetch: false })}
          />
        ) : undefined
      }
      renderItem={({ item, index }) => {
        if ("heading" in item) {
          return (
            <Text
              accessibilityRole="header"
              style={[
                styles.heading,
                index > 0 && styles.sectionHeading,
                { color: colors.text },
              ]}
            >
              {item.heading}
            </Text>
          );
        }
        const status = sourceCatalogStatus(item.catalog);
        return (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={item.label}
            accessibilityValue={{
              text: sourceCatalogLabels[status],
            }}
            onPress={() => router.push(collectionSourceHref(seasonId, item))}
            style={({ pressed }) => ({
              opacity: controlOpacity(false, pressed),
            })}
          >
            <Surface style={styles.source}>
              <Text style={[styles.label, { color: colors.text }]}>
                {item.label}
              </Text>
              <SourceCatalogBadge status={status} />
              <ChevronRight
                accessible={false}
                color={colors.icon}
                size={tokens.size.icon.sm}
              />
            </Surface>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <ScreenState>
          {needle || filterStatus || scope ? (
            <EmptyState title="Aucune source correspondante" />
          ) : (
            <EmptyState title="Aucune source découverte">
              <ReloadButton query={sources} />
            </EmptyState>
          )}
        </ScreenState>
      }
    />
  );
}

function searchKey(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("fr");
}

const styles = StyleSheet.create({
  heading: {
    ...tokens.typography.navigation,
    marginBottom: tokens.spacing.sm,
  },
  sectionHeading: { marginTop: tokens.spacing.sm },
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
