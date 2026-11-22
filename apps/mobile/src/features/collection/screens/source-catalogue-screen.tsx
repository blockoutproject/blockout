import type { LegendListRef } from "@legendapp/list/react-native";
import {
  useInfiniteQuery,
  useIsFetching,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getListCollectionSourceChildrenQueryKey } from "../../../../.generated/mobile";
import { useIsFocused, useNavigation, useRouter } from "expo-router";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react-native";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  DiscoveredCollectionResourcePageResponse,
  DiscoveredCollectionResourceResponse,
  SourceBindingResponse,
} from "../../../../.generated/schemas/index.zod";
import {
  AccessFeedback,
  isAccessLoading,
} from "@/features/access/components/access-feedback";
import { controlOpacity } from "@/shared/components/control-styles";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { IconButton } from "@/shared/components/icon-button";
import {
  ListContinuation,
  type ListContinuationProps,
} from "@/shared/components/list-continuation";
import { ListLoading } from "@/shared/components/list-loading";
import { LoadingGroup } from "@/shared/components/loading-group";
import { Page, pageContentStyle } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { PageList } from "@/shared/components/page-list";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ReloadButton } from "@/shared/components/reload-button";
import { EmptyState, ErrorState } from "@/shared/components/state-card";
import { Surface } from "@/shared/components/surface";
import { TextSkeleton } from "@/shared/components/text-skeleton";
import { useNativeHandoff } from "@/shared/native/use-native-handoff";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import {
  createCollectionQueries,
  isCollectionReadRefused,
  type CollectionQueryAuthority,
} from "../api/collection-queries";
import { useCollectionSeason } from "../api/use-collection-season";
import { CollectionLink } from "../components/collection-link";
import { CollectionReadState } from "../components/collection-read-state";
import { SourceCatalogBadge } from "../components/source-catalog-badge";
import { collectionBilanHref } from "../model/collection-hrefs";
import type { SourceCatalogueFocus } from "../model/collection-route-params";
import { formatCollectionTimestamp } from "../model/collection-time";
import { sourceCatalogStatus } from "../model/source-catalogue";

const loading = <ListLoading label="Chargement du catalogue" />;

export function SourceCatalogueScreen({
  seasonId,
  sourceId,
  focus,
}: Readonly<{
  seasonId: string;
  sourceId: string;
  focus: SourceCatalogueFocus;
}>) {
  const reading = useCollectionSeason(seasonId);
  const { authority, season } = reading;
  const source = useQuery(createCollectionQueries(authority).source(sourceId));
  const matchesRoute =
    source.data?.id === sourceId && source.data.seasonId === seasonId;
  const current =
    authority.enabled &&
    season.data &&
    matchesRoute &&
    !hasReadError(season) &&
    !hasReadError(source)
      ? source.data
      : undefined;
  const navigation = useNavigation();
  const handoff = useNativeHandoff(current?.acceptedUrl ?? undefined, () =>
    navigation.isFocused(),
  );
  const { colors } = useTheme();
  const header = (
    <PageHeader
      title={current?.label ?? "Source"}
      subtitle={
        current && season.data
          ? `${current.provider.toUpperCase()}  ${season.data.label}`
          : undefined
      }
      action={
        current?.acceptedUrl && (
          <IconButton
            label="Ouvrir le site officiel"
            loading={handoff.pending}
            onPress={() => void handoff.open()}
          >
            <ExternalLink
              accessible={false}
              color={colors.icon}
              size={tokens.size.icon.lg}
            />
          </IconButton>
        )
      }
    />
  );

  let content: ReactNode;
  if (current) {
    content = (
      <SourceCatalogue
        key={current.id}
        source={current}
        focus={focus}
        authority={authority}
        sourceFetching={source.isFetching}
        refreshSource={() => source.refetch({ cancelRefetch: false })}
      />
    );
  } else if (!authority.enabled) {
    content = (
      <CollectionReadState pending={isAccessLoading(authority)}>
        <AccessFeedback {...authority} loadingContent={loading} />
      </CollectionReadState>
    );
  } else {
    const required = !season.data || hasReadError(season) ? season : source;
    content = (
      <CollectionReadState
        pending={required.isPending && !hasReadError(required)}
      >
        {source.data && !matchesRoute ? (
          <ErrorState />
        ) : (
          <ReadFeedback query={required} loadingContent={loading} />
        )}
      </CollectionReadState>
    );
  }

  return <Page header={header}>{content}</Page>;
}

function SourceCatalogue({
  source,
  authority,
  sourceFetching,
  focus,
  refreshSource,
}: Readonly<{
  source: SourceBindingResponse;
  authority: CollectionQueryAuthority;
  sourceFetching: boolean;
  focus: SourceCatalogueFocus;
  refreshSource: () => Promise<unknown>;
}>) {
  const router = useRouter();
  const { colors } = useTheme();
  const client = useQueryClient();
  const childrenKey = getListCollectionSourceChildrenQueryKey(source.id);
  const childrenFetching = useIsFetching({ queryKey: childrenKey });
  const ffvb = source.provider === "ffvb";
  const list = useRef<LegendListRef>(null);
  const positionedRow = useRef<string>(undefined);
  const focusedPool = useRef<string>(undefined);
  const [expansion, setExpansion] = useState(new Map<string, boolean>());
  const { query, rows, failed, continuation, target, loadMore, focused } =
    useCatalogueChildren(authority, source.id, ffvb ? "pack" : "phase", {
      focusKey: ffvb ? focus.packId : focus.phaseReference,
    });

  useLayoutEffect(() => {
    const current = list.current;
    if (!current) {
      positionedRow.current = undefined;
      focusedPool.current = undefined;
    } else if (focused && target && positionedRow.current !== target) {
      positionedRow.current = target;
      void current.scrollToKey({
        key: target,
        animated: false,
        viewPosition: 0.15,
      });
    }
  }, [focused, target]);

  function showFocusedPool(packKey: string, poolId: string, offset: number) {
    if (!focused || focusedPool.current === poolId) {
      return;
    }
    focusedPool.current = poolId;
    if (offset > 0) {
      void list.current?.scrollToKey({
        key: packKey,
        animated: false,
        viewPosition: 0.15,
        viewOffset: -offset,
      });
    }
  }

  const refreshing = sourceFetching || childrenFetching > 0;

  function refreshCatalogue() {
    return Promise.all([
      refreshSource(),
      client.refetchQueries(
        { queryKey: childrenKey, type: "active" },
        { cancelRefetch: false },
      ),
    ]);
  }

  if (failed || !query.data) {
    return (
      <CollectionReadState pending={!failed}>
        <ReadFeedback query={query} loadingContent={loading} />
      </CollectionReadState>
    );
  }

  return (
    <PageList
      ref={list}
      data={rows}
      extraData={expansion}
      keyExtractor={(row) => row.key}
      contentContainerStyle={pageContentStyle}
      onEndReached={query.isError ? undefined : loadMore}
      onEndReachedThreshold={0.5}
      alwaysBounceVertical={rows.length > 0}
      refreshControl={
        rows.length > 0 ? (
          <DataRefreshControl
            fetching={refreshing}
            enabled={!continuation.loading && !continuation.failed}
            onRefresh={refreshCatalogue}
          />
        ) : undefined
      }
      ListHeaderComponent={
        <View style={styles.summary}>
          <CatalogSummary
            catalog={source.catalog}
            hasEntries={rows.length > 0}
            onOpenBilan={() =>
              router.push(
                collectionBilanHref(source.seasonId, source.provider, {
                  sourceId: source.id,
                }),
              )
            }
          />
          {rows.length > 0 && (
            <Text
              accessibilityRole="header"
              style={[tokens.typography.navigation, { color: colors.text }]}
            >
              {ffvb
                ? query.hasNextPage
                  ? "Packs découverts"
                  : `Packs découverts (${rows.length})`
                : "Phases découvertes"}
            </Text>
          )}
        </View>
      }
      renderItem={({ item: { key, resource } }) => {
        const isTarget = key === target;
        if (!ffvb) {
          return (
            <Surface
              style={[styles.phase, isTarget && { borderColor: colors.focus }]}
            >
              <Text style={[tokens.typography.strong, { color: colors.text }]}>
                {resource.phaseLabel ?? `Phase ${key}`}
              </Text>
            </Surface>
          );
        }
        const expanded = expansion.get(key) ?? isTarget;
        return (
          <CatalogPack
            pack={resource}
            sourceId={source.id}
            authority={authority}
            expanded={expanded}
            highlighted={isTarget && !focus.poolId}
            focusPoolId={isTarget ? focus.poolId : undefined}
            onToggle={() =>
              setExpansion((current) => new Map(current).set(key, !expanded))
            }
            onFocusPool={(id, offset) => showFocusedPool(key, id, offset)}
          />
        );
      }}
      ListEmptyComponent={
        !query.hasNextPage ? (
          <EmptyState
            title={ffvb ? "Aucun pack découvert" : "Aucune phase découverte"}
          >
            <ReloadButton fetching={refreshing} onReload={refreshCatalogue} />
          </EmptyState>
        ) : undefined
      }
      ListFooterComponent={
        query.hasNextPage ? (
          <CatalogContinuation
            {...continuation}
            moreLabel={ffvb ? undefined : "Afficher plus de phases"}
          />
        ) : undefined
      }
    />
  );
}

function CatalogSummary({
  catalog,
  hasEntries,
  onOpenBilan,
}: Readonly<{
  catalog: SourceBindingResponse["catalog"];
  hasEntries: boolean;
  onOpenBilan: () => void;
}>) {
  const { colors } = useTheme();
  const status = sourceCatalogStatus(catalog);
  const degraded = status === "partial" || status === "unavailable";
  const lastComplete = catalog?.lastCompleteAt;
  const metadata = [
    tokens.typography.metadata,
    { color: colors.secondaryText },
  ];
  const lastRead = catalog?.observedAt
    ? `Dernière lecture · ${formatCollectionTimestamp(catalog.observedAt, "compact")}`
    : status === "not-read"
      ? "Première lecture en attente."
      : undefined;
  return (
    <Surface style={styles.catalog}>
      <View style={styles.catalogTitle}>
        <Text
          accessibilityRole="header"
          style={[styles.catalogLabel, { color: colors.text }]}
        >
          Catalogue
        </Text>
        <SourceCatalogBadge status={status} />
      </View>
      <View style={styles.catalogInfo}>
        {lastRead && <Text style={metadata}>{lastRead}</Text>}
        {degraded && (
          <>
            <Text style={metadata}>
              {catalog?.reason ||
                (status === "partial"
                  ? "La dernière lecture du catalogue est incomplète."
                  : "Le catalogue n’a pas pu être lu.")}
            </Text>
            {hasEntries && (
              <Text style={metadata}>
                Le dernier catalogue connu reste affiché.
              </Text>
            )}
            {lastComplete && (
              <Text style={metadata}>
                Dernière lecture complète ·{" "}
                {formatCollectionTimestamp(lastComplete, "compact")}
              </Text>
            )}
          </>
        )}
      </View>
      <CollectionLink
        label="Voir le bilan de cette source"
        centered
        onPress={onOpenBilan}
      />
    </Surface>
  );
}

function CatalogPack({
  pack,
  sourceId,
  authority,
  expanded,
  highlighted,
  focusPoolId,
  onToggle,
  onFocusPool,
}: Readonly<{
  pack: DiscoveredCollectionResourceResponse;
  sourceId: string;
  authority: CollectionQueryAuthority;
  expanded: boolean;
  highlighted: boolean;
  focusPoolId?: string;
  onToggle: () => void;
  onFocusPool: (id: string, offset: number) => void;
}>) {
  const { colors } = useTheme();
  const Chevron = expanded ? ChevronDown : ChevronRight;
  const count = pack.poolCount;
  const countLabel =
    count === undefined
      ? undefined
      : `${count} ${count === 1 ? "poule" : "poules"}`;
  return (
    <Surface
      style={[styles.pack, highlighted && { borderColor: colors.focus }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          countLabel ? `${pack.label}, ${countLabel}` : pack.label
        }
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.packLabel,
          { opacity: controlOpacity(false, pressed) },
        ]}
      >
        <View style={styles.packIdentity}>
          <Text style={[tokens.typography.strong, { color: colors.text }]}>
            {pack.label}
          </Text>
          {countLabel && (
            <Text
              style={[
                tokens.typography.metadata,
                { color: colors.secondaryText },
              ]}
            >
              {countLabel}
            </Text>
          )}
        </View>
        <Chevron
          accessible={false}
          color={colors.icon}
          size={tokens.size.icon.sm}
        />
      </Pressable>
      {expanded && (
        <CatalogPools
          sourceId={sourceId}
          packId={pack.id}
          authority={authority}
          focusPoolId={focusPoolId}
          onFocusPool={onFocusPool}
        />
      )}
    </Surface>
  );
}

function CatalogPools({
  sourceId,
  packId,
  authority,
  focusPoolId,
  onFocusPool,
}: Readonly<{
  sourceId: string;
  packId: string;
  authority: CollectionQueryAuthority;
  focusPoolId?: string;
  onFocusPool: (id: string, offset: number) => void;
}>) {
  const { colors } = useTheme();
  const { query, rows, target, failed, continuation } = useCatalogueChildren(
    authority,
    sourceId,
    "pool",
    { parentId: packId, focusKey: focusPoolId },
  );

  if (failed || !query.data) {
    return (
      <View style={styles.pools}>
        <ReadFeedback
          query={query}
          loadingContent={
            <LoadingGroup label="Chargement des poules">
              <TextSkeleton role="metadata" width="40%" />
            </LoadingGroup>
          }
        />
      </View>
    );
  }
  return (
    <View style={styles.pools}>
      {!rows.length && !query.hasNextPage && (
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          Aucune poule découverte
        </Text>
      )}
      <View style={styles.poolChips}>
        {rows.map(({ key, resource }) => (
          <Text
            key={key}
            onLayout={
              key === target
                ? ({ nativeEvent }) => onFocusPool(key, nativeEvent.layout.y)
                : undefined
            }
            style={[
              styles.poolChip,
              {
                color: colors.secondaryText,
                backgroundColor: colors.subtle,
                borderColor: key === target ? colors.focus : colors.border,
              },
            ]}
          >
            {resource.label}
          </Text>
        ))}
      </View>
      {query.hasNextPage && (
        <CatalogContinuation
          {...continuation}
          moreLabel="Afficher plus de poules"
        />
      )}
    </View>
  );
}

/** An explicit edge remains available when a page adds no visible row or sits inside an expanded pack. */
function CatalogContinuation({
  moreLabel,
  ...feedback
}: Readonly<ListContinuationProps & { moreLabel?: string }>) {
  if (
    moreLabel &&
    !feedback.loading &&
    !feedback.failed &&
    !feedback.disabled
  ) {
    return <CollectionLink label={moreLabel} onPress={feedback.onRetry} />;
  }
  return <ListContinuation {...feedback} />;
}

type CatalogueLevel = "pack" | "phase" | "pool";

/** Offset pages can repeat entries after catalogue changes. LNV groups share the published phase identity. */
function catalogueRows(
  pages: DiscoveredCollectionResourcePageResponse[] = [],
  level: CatalogueLevel,
) {
  const phase = level === "phase";
  const kind = phase ? "pool" : level;
  const rows = new Map<string, DiscoveredCollectionResourceResponse>();
  for (const { items } of pages) {
    for (const item of items) {
      if (item.kind !== kind) {
        continue;
      }
      const key = phase ? item.phaseReference : item.id;
      if (key && !rows.has(key)) {
        rows.set(key, item);
      }
    }
  }
  return Array.from(rows, ([key, resource]) => ({ key, resource }));
}

/** Roots and expanded packs advance the same generated read, including when seeking an attributed row. */
function useCatalogueChildren(
  authority: CollectionQueryAuthority,
  sourceId: string,
  level: CatalogueLevel,
  { parentId, focusKey }: Readonly<{ parentId?: string; focusKey?: string }>,
) {
  const focused = useIsFocused();
  const query = useInfiniteQuery(
    createCollectionQueries(authority).children(sourceId, parentId),
  );
  const continuationFailed =
    query.isFetchNextPageError && !isCollectionReadRefused(query.error);
  const failed = hasReadError(query) && !continuationFailed;
  const pages = query.data?.pages;
  const rows = useMemo(() => catalogueRows(pages, level), [level, pages]);
  const target =
    !failed && focusKey && rows.some(({ key }) => key === focusKey)
      ? focusKey
      : undefined;
  const { fetchNextPage } = query;
  const canContinue =
    focused && query.hasNextPage && query.fetchStatus === "idle" && !failed;
  const loadMore = useCallback(() => {
    if (canContinue) {
      void fetchNextPage({ cancelRefetch: false });
    }
  }, [canContinue, fetchNextPage]);

  useEffect(() => {
    if (focusKey && !target && !query.isError) {
      loadMore();
    }
  }, [focusKey, target, query.isError, loadMore]);

  return {
    query,
    failed,
    rows,
    target,
    focused,
    loadMore,
    continuation: {
      loading: query.isFetchingNextPage,
      failed: continuationFailed,
      disabled: !canContinue,
      onRetry: loadMore,
    },
  };
}

const styles = StyleSheet.create({
  summary: { gap: tokens.spacing.xl, marginBottom: tokens.spacing.sm },
  catalog: { gap: tokens.spacing.sm },
  catalogTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.sm,
  },
  catalogLabel: { ...tokens.typography.navigation, flexShrink: 1 },
  catalogInfo: { gap: tokens.spacing.xs },
  pack: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    gap: 0,
    marginBottom: tokens.spacing.sm,
  },
  packLabel: {
    minHeight: tokens.touch.minimum,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacing.sm,
  },
  packIdentity: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  pools: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
  },
  poolChips: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.sm },
  poolChip: {
    ...tokens.typography.metadata,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.optical,
  },
  phase: {
    minHeight: tokens.touch.minimum,
    justifyContent: "center",
    paddingVertical: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
  },
});
