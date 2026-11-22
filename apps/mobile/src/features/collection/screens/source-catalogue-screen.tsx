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
  useRef,
  useState,
  type PropsWithChildren,
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
import { ListContinuation } from "@/shared/components/list-continuation";
import { ListLoading } from "@/shared/components/list-loading";
import { LoadingGroup } from "@/shared/components/loading-group";
import {
  Page,
  PageContent,
  PageScrollView,
  pageContentStyle,
} from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { PageList } from "@/shared/components/page-list";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
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
import { CollectionEmptyReload } from "../components/collection-empty-reload";
import { CollectionLink } from "../components/collection-link";
import { SourceCatalogBadge } from "../components/source-catalog-badge";
import { collectionBilanHref } from "../model/collection-hrefs";
import type { SourceCatalogueFocus } from "../model/collection-route-params";
import { formatCollectionTimestamp } from "../model/collection-time";

const loading = <ListLoading label="Chargement du catalogue" />;

function CatalogueFeedback({
  pending = false,
  children,
}: Readonly<PropsWithChildren<{ pending?: boolean }>>) {
  const Layout = pending ? PageContent : ScreenState;
  return (
    <PageScrollView>
      <Layout>{children}</Layout>
    </PageScrollView>
  );
}

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

  if (!authority.enabled) {
    return (
      <Page header={header}>
        <CatalogueFeedback pending={isAccessLoading(authority)}>
          <AccessFeedback {...authority} loadingContent={loading} />
        </CatalogueFeedback>
      </Page>
    );
  }

  if (!current) {
    const required = !season.data || hasReadError(season) ? season : source;
    return (
      <Page header={header}>
        <CatalogueFeedback
          pending={required.isPending && !hasReadError(required)}
        >
          {source.data && !matchesRoute ? (
            <ErrorState />
          ) : (
            <ReadFeedback query={required} loadingContent={loading} />
          )}
        </CatalogueFeedback>
      </Page>
    );
  }

  return (
    <Page header={header}>
      <SourceCatalogue
        key={current.id}
        source={current}
        focus={focus}
        authority={authority}
        sourceFetching={source.isFetching}
        refreshSource={() => source.refetch({ cancelRefetch: false })}
      />
    </Page>
  );
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
  const focused = useIsFocused();
  const { colors } = useTheme();
  const client = useQueryClient();
  const childrenKey = getListCollectionSourceChildrenQueryKey(source.id);
  const childrenFetching = useIsFetching({ queryKey: childrenKey });
  const ffvb = source.provider === "ffvb";
  const list = useRef<LegendListRef>(null);
  const [listReady, setListReady] = useState(false);
  const positionedRow = useRef<string>(undefined);
  const focusedPool = useRef<string>(undefined);
  const [expansion, setExpansion] = useState(new Map<string, boolean>());
  const catalogue = useInfiniteQuery(
    createCollectionQueries(authority).children(source.id),
  );
  const continuationFailed =
    catalogue.isFetchNextPageError && !isCollectionReadRefused(catalogue.error);
  const failed = hasReadError(catalogue) && !continuationFailed;
  const rows = catalogueRows(catalogue.data?.pages, ffvb ? "pack" : "phase");
  const focusIndex = rows.findIndex((row) =>
    ffvb
      ? row.id === focus.packId
      : !!focus.phaseReference && row.phaseReference === focus.phaseReference,
  );
  const focusRow = rows[focusIndex]?.id;
  const lookingForFocus =
    !!(ffvb ? focus.packId : focus.phaseReference) &&
    focusIndex < 0 &&
    catalogue.hasNextPage &&
    !catalogue.isError &&
    catalogue.fetchStatus !== "paused";
  const { fetchNextPage, isFetching } = catalogue;

  useEffect(() => {
    if (focused && lookingForFocus && !isFetching) {
      void fetchNextPage({ cancelRefetch: false });
    }
  }, [fetchNextPage, focused, isFetching, lookingForFocus]);

  const positionFocus = useCallback(() => {
    const current = list.current;
    if (focused && current && focusRow && positionedRow.current !== focusRow) {
      positionedRow.current = focusRow;
      void current.scrollToIndex({
        index: focusIndex,
        animated: false,
        viewPosition: 0.15,
      });
    }
  }, [focusIndex, focusRow, focused]);

  // A continuation failure can present the list before the requested row arrives.
  useEffect(() => {
    if (listReady) {
      positionFocus();
    }
  }, [listReady, positionFocus]);

  function loadMore() {
    if (focused && catalogue.hasNextPage && !isFetching) {
      void fetchNextPage({ cancelRefetch: false });
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

  if (failed || !catalogue.data || (lookingForFocus && !listReady)) {
    return (
      <CatalogueFeedback pending={!failed}>
        {lookingForFocus ? (
          loading
        ) : (
          <ReadFeedback query={catalogue} loadingContent={loading} />
        )}
      </CatalogueFeedback>
    );
  }

  return (
    <PageList
      ref={list}
      onReady={() => {
        setListReady(true);
        positionFocus();
      }}
      data={rows}
      extraData={expansion}
      keyExtractor={(row) => (!ffvb && row.phaseReference) || row.id}
      initialScrollIndex={
        focusIndex > 0 ? { index: focusIndex, viewPosition: 0.15 } : undefined
      }
      contentContainerStyle={pageContentStyle}
      onEndReached={() => {
        if (!catalogue.isError) {
          loadMore();
        }
      }}
      onEndReachedThreshold={0.5}
      alwaysBounceVertical={rows.length > 0}
      refreshControl={
        rows.length > 0 ? (
          <DataRefreshControl
            fetching={refreshing}
            enabled={!catalogue.isFetchingNextPage && !continuationFailed}
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
                ? catalogue.hasNextPage
                  ? "Packs découverts"
                  : `Packs découverts (${rows.length})`
                : "Phases découvertes"}
            </Text>
          )}
        </View>
      }
      renderItem={({ item, index }) => {
        const target = index === focusIndex;
        if (!ffvb) {
          return (
            <Surface
              style={[styles.phase, target && { borderColor: colors.focus }]}
            >
              <Text style={[tokens.typography.strong, { color: colors.text }]}>
                {item.phaseLabel ?? `Phase ${item.phaseReference}`}
              </Text>
            </Surface>
          );
        }
        const expanded = expansion.get(item.id) ?? target;
        return (
          <CatalogPack
            pack={item}
            sourceId={source.id}
            authority={authority}
            expanded={expanded}
            highlighted={target && !focus.poolId}
            focusPoolId={target ? focus.poolId : undefined}
            onToggle={() =>
              setExpansion((current) =>
                new Map(current).set(item.id, !expanded),
              )
            }
            onFocusPool={(id, offset) => {
              if (focusedPool.current === id) {
                return;
              }
              focusedPool.current = id;
              if (offset > tokens.spacing.lg) {
                void list.current?.scrollToIndex({
                  index,
                  animated: false,
                  viewPosition: 0.15,
                  viewOffset: -offset,
                });
              }
            }}
          />
        );
      }}
      ListEmptyComponent={
        !catalogue.hasNextPage ? (
          <EmptyState
            title={ffvb ? "Aucun pack découvert" : "Aucune phase découverte"}
          >
            <CollectionEmptyReload
              fetching={refreshing}
              onReload={refreshCatalogue}
            />
          </EmptyState>
        ) : undefined
      }
      ListFooterComponent={
        catalogue.hasNextPage ? (
          <CatalogContinuation
            loading={catalogue.isFetchingNextPage}
            failed={continuationFailed}
            disabled={isFetching}
            onMore={loadMore}
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
  const status = catalog?.status ?? "not-read";
  const degraded = status === "partial" || status === "unavailable";
  const lastComplete = catalog?.lastCompleteAt;
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
        {lastRead && (
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            {lastRead}
          </Text>
        )}
        {degraded && (
          <>
            <Text
              style={[
                tokens.typography.metadata,
                { color: colors.secondaryText },
              ]}
            >
              {catalog?.reason ||
                (status === "partial"
                  ? "La dernière lecture du catalogue est incomplète."
                  : "Le catalogue n’a pas pu être lu.")}
            </Text>
            {hasEntries && (
              <Text
                style={[
                  tokens.typography.metadata,
                  { color: colors.secondaryText },
                ]}
              >
                Le dernier catalogue connu reste affiché.
              </Text>
            )}
            {lastComplete && (
              <Text
                style={[
                  tokens.typography.metadata,
                  { color: colors.secondaryText },
                ]}
              >
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
  const focused = useIsFocused();
  const query = useInfiniteQuery(
    createCollectionQueries(authority).children(sourceId, packId),
  );
  const continued =
    query.isFetchNextPageError && !isCollectionReadRefused(query.error);
  const failed = hasReadError(query) && !continued;
  const pools = catalogueRows(query.data?.pages, "pool");
  const target = pools.find((pool) => pool.id === focusPoolId);
  const { fetchNextPage, isFetching, hasNextPage, isError } = query;

  useEffect(() => {
    if (
      focusPoolId &&
      focused &&
      !target &&
      hasNextPage &&
      !isFetching &&
      !isError
    ) {
      void fetchNextPage({ cancelRefetch: false });
    }
  }, [
    fetchNextPage,
    focusPoolId,
    focused,
    hasNextPage,
    isError,
    isFetching,
    target,
  ]);

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
      {!pools.length && !hasNextPage && (
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          Aucune poule découverte
        </Text>
      )}
      <View style={styles.poolChips}>
        {pools.map((pool) => (
          <Text
            key={pool.id}
            onLayout={
              pool.id === focusPoolId
                ? ({ nativeEvent }) =>
                    onFocusPool(pool.id, nativeEvent.layout.y)
                : undefined
            }
            style={[
              styles.poolChip,
              {
                color: colors.secondaryText,
                backgroundColor: colors.subtle,
                borderColor:
                  pool.id === focusPoolId ? colors.focus : colors.border,
              },
            ]}
          >
            {pool.label}
          </Text>
        ))}
      </View>
      {hasNextPage && (
        <CatalogContinuation
          loading={query.isFetchingNextPage}
          failed={continued}
          disabled={isFetching}
          onMore={() => void fetchNextPage({ cancelRefetch: false })}
          moreLabel="Afficher plus de poules"
        />
      )}
    </View>
  );
}

/** An explicit edge remains available when a page adds no visible row or sits inside an expanded pack. */
function CatalogContinuation({
  loading,
  failed,
  disabled,
  onMore,
  moreLabel,
}: Readonly<{
  loading: boolean;
  failed: boolean;
  disabled: boolean;
  onMore: () => void;
  moreLabel?: string;
}>) {
  if (loading || failed) {
    return (
      <ListContinuation
        loading={loading}
        failed={failed}
        disabled={disabled}
        onRetry={onMore}
      />
    );
  }
  return moreLabel && !disabled ? (
    <CollectionLink label={moreLabel} onPress={onMore} />
  ) : null;
}

/** Offset pages can repeat entries after catalogue changes. LNV groups share the published phase identity. */
function catalogueRows(
  pages: DiscoveredCollectionResourcePageResponse[] = [],
  kind: "pack" | "phase" | "pool",
) {
  const rows = new Map<string, DiscoveredCollectionResourceResponse>();
  for (const { items } of pages) {
    for (const item of items) {
      if (item.kind !== (kind === "phase" ? "pool" : kind)) {
        continue;
      }
      const key = kind === "phase" ? item.phaseReference : item.id;
      if (key && !rows.has(key)) {
        rows.set(key, item);
      }
    }
  }
  return [...rows.values()];
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
