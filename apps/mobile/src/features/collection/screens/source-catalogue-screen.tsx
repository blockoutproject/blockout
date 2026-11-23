import type { LegendListRef } from "@legendapp/list/react-native";
import { useQuery } from "@tanstack/react-query";
import { useIsFocused, useNavigation, useRouter } from "expo-router";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react-native";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  SourceCataloguePackResponse,
  SourceCataloguePhaseResponse,
  SourceCatalogueResponse,
} from "../../../../.generated/schemas/index.zod";
import {
  AccessFeedback,
  isAccessLoading,
} from "@/features/access/components/access-feedback";
import { controlOpacity } from "@/shared/components/control-styles";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { IconButton } from "@/shared/components/icon-button";
import { ListLoading } from "@/shared/components/list-loading";
import { Page, pageContentStyle } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { PageList } from "@/shared/components/page-list";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ReloadButton } from "@/shared/components/reload-button";
import { EmptyState, ErrorState } from "@/shared/components/state-card";
import { Surface } from "@/shared/components/surface";
import { useNativeHandoff } from "@/shared/native/use-native-handoff";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { createCollectionQueries } from "../api/collection-queries";
import { useCollectionSeason } from "../api/use-collection-season";
import { CollectionLink } from "../components/collection-link";
import { PageReadState } from "@/shared/components/page-read-state";
import { SourceCatalogBadge } from "../components/source-catalog-badge";
import { collectionBilanHref } from "../model/collection-hrefs";
import {
  collectionOperatorSources,
  collectionProviderSubtitle,
} from "../model/collection-operator-source";
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
          ? collectionProviderSubtitle(current.provider, season.data.label)
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
        fetching={source.isFetching}
        refreshSource={() => source.refetch({ cancelRefetch: false })}
      />
    );
  } else if (!authority.enabled) {
    content = (
      <PageReadState pending={isAccessLoading(authority)}>
        <AccessFeedback {...authority} loadingContent={loading} />
      </PageReadState>
    );
  } else {
    const required = !season.data || hasReadError(season) ? season : source;
    content = (
      <PageReadState pending={required.isPending && !hasReadError(required)}>
        {source.data && !matchesRoute ? (
          <ErrorState />
        ) : (
          <ReadFeedback query={required} loadingContent={loading} />
        )}
      </PageReadState>
    );
  }

  return <Page header={header}>{content}</Page>;
}

function SourceCatalogue({
  source,
  fetching,
  focus,
  refreshSource,
}: Readonly<{
  source: SourceCatalogueResponse;
  fetching: boolean;
  focus: SourceCatalogueFocus;
  refreshSource: () => Promise<unknown>;
}>) {
  const router = useRouter();
  const { colors } = useTheme();
  const focused = useIsFocused();
  const { rows, target, heading, emptyTitle } = catalogueContent(source, focus);
  const list = useRef<LegendListRef>(null);
  const positionedRow = useRef<string>(undefined);
  const positionedPool = useRef<string>(undefined);
  const [expansion, setExpansion] = useState(new Map<string, boolean>());
  useLayoutEffect(() => {
    if (list.current && focused && target && positionedRow.current !== target) {
      positionedRow.current = target;
      void list.current.scrollToKey({
        key: target,
        animated: false,
        viewPosition: 0.15,
      });
    }
  }, [focused, target]);

  function showFocusedPool(packKey: string, poolId: string, offset: number) {
    if (!focused || positionedPool.current === poolId) {
      return;
    }
    positionedPool.current = poolId;
    // A pool on a wrapped line can need a second scroll after its pack is measured.
    if (offset > 0) {
      void list.current?.scrollToKey({
        key: packKey,
        animated: false,
        viewPosition: 0.15,
        viewOffset: -offset,
      });
    }
  }

  return (
    <PageList<SourceCataloguePackResponse | SourceCataloguePhaseResponse>
      ref={list}
      data={rows}
      extraData={expansion}
      keyExtractor={(row) => ("id" in row ? row.id : row.reference)}
      contentContainerStyle={pageContentStyle}
      alwaysBounceVertical={rows.length > 0}
      refreshControl={
        rows.length > 0 ? (
          <DataRefreshControl fetching={fetching} onRefresh={refreshSource} />
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
              {heading}
            </Text>
          )}
        </View>
      }
      renderItem={({ item }) => {
        if ("reference" in item) {
          return (
            <Surface
              style={[
                styles.phase,
                item.reference === target && { borderColor: colors.focus },
              ]}
            >
              <Text style={[tokens.typography.strong, { color: colors.text }]}>
                {item.label ?? `Phase ${item.reference}`}
              </Text>
            </Surface>
          );
        }
        const { id } = item;
        const isTarget = id === target;
        const expanded = expansion.get(id) ?? isTarget;
        return (
          <CatalogPack
            pack={item}
            expanded={expanded}
            highlighted={isTarget && !focus.poolId}
            focusPoolId={isTarget ? focus.poolId : undefined}
            onToggle={() =>
              setExpansion((current) => new Map(current).set(id, !expanded))
            }
            onFocusPool={(poolId, offset) =>
              showFocusedPool(id, poolId, offset)
            }
          />
        );
      }}
      ListEmptyComponent={
        <EmptyState title={emptyTitle}>
          <ReloadButton fetching={fetching} onReload={refreshSource} />
        </EmptyState>
      }
    />
  );
}

function catalogueContent(
  source: SourceCatalogueResponse,
  focus: SourceCatalogueFocus,
) {
  switch (collectionOperatorSources[source.provider].catalogue) {
    case "packs":
      return {
        rows: source.packs,
        target: source.packs.find(({ id }) => id === focus.packId)?.id,
        heading: `Packs découverts (${source.packs.length})`,
        emptyTitle: "Aucun pack découvert",
      };
    case "phases":
      return {
        rows: source.phases,
        target: source.phases.find(
          ({ reference }) => reference === focus.phaseReference,
        )?.reference,
        heading: "Phases découvertes",
        emptyTitle: "Aucune phase découverte",
      };
  }
}

function CatalogSummary({
  catalog,
  hasEntries,
  onOpenBilan,
}: Readonly<{
  catalog: SourceCatalogueResponse["catalog"];
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
  expanded,
  highlighted,
  focusPoolId,
  onToggle,
  onFocusPool,
}: Readonly<{
  pack: SourceCataloguePackResponse;
  expanded: boolean;
  highlighted: boolean;
  focusPoolId?: string;
  onToggle: () => void;
  onFocusPool: (id: string, offset: number) => void;
}>) {
  const { colors } = useTheme();
  const Chevron = expanded ? ChevronDown : ChevronRight;
  const count = pack.pools.length;
  const countLabel = `${count} ${count === 1 ? "poule" : "poules"}`;
  return (
    <Surface
      style={[styles.pack, highlighted && { borderColor: colors.focus }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${pack.label}, ${countLabel}`}
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
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            {countLabel}
          </Text>
        </View>
        <Chevron
          accessible={false}
          color={colors.icon}
          size={tokens.size.icon.sm}
        />
      </Pressable>
      {expanded && (
        <View style={styles.pools}>
          {pack.pools.map(({ id, label }) => (
            <Text
              key={id}
              onLayout={
                id === focusPoolId
                  ? ({ nativeEvent }) => onFocusPool(id, nativeEvent.layout.y)
                  : undefined
              }
              style={[
                styles.poolChip,
                {
                  color: colors.secondaryText,
                  backgroundColor: colors.subtle,
                  borderColor:
                    id === focusPoolId ? colors.focus : colors.border,
                },
              ]}
            >
              {label}
            </Text>
          ))}
        </View>
      )}
    </Surface>
  );
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
  },
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
