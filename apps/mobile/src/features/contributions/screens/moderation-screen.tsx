import { Controller, useForm } from "react-hook-form";
import { hashKey } from "@tanstack/react-query";
import { Link, useNavigation, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  AppState,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  useCollapsingTabsContext,
  type CollapsingTabsRef,
} from "react-native-collapsible-tab";
import { TabLegendList } from "react-native-collapsible-tab/legend-list";
import type { StreamModerationItemResponse } from "../../../../.generated/schemas/index.zod";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { ListContinuation } from "../../../shared/components/list-continuation";
import { ListSeparator } from "../../../shared/components/list-separator";
import { Page, pageContentStyle } from "../../../shared/components/page";
import {
  PagedTabs,
  PagerTabBar,
  PagedStateScrollView,
  pagedListDefaults,
} from "../../../shared/components/paged-tabs";
import { PageHeader } from "../../../shared/components/page-header";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { SearchField } from "../../../shared/components/search-field";
import { EmptyState } from "../../../shared/components/state-card";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { ModerationMatchContext } from "../components/moderation-match-context";
import { useModerationQueue, type ModerationFilters } from "../api/moderation";
import { ModerationQueueLoading } from "../components/moderation-loading";

const queueTabs = [
  { id: "to-review", label: "À traiter" },
  { id: "active", label: "Actifs" },
  { id: "all", label: "Tous" },
] as const;
/** Committed route criteria persist across detail navigation; RHF owns only the editable search field. */
export interface ModerationScreenProps {
  filters: ModerationFilters;
}
/** Reuses the search native pager, tab bar and controls; RNCT is the sole scroll/gesture owner. */
export function ModerationScreen({ filters }: ModerationScreenProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const filterSize = Math.max(
    tokens.size.control.default,
    tokens.typography.body.lineHeight * fontScale + tokens.spacing.md * 2,
  );
  const pager = useRef<CollapsingTabsRef>(null);
  const selected =
    !filters.state || filters.state === "to-review"
      ? "to-review"
      : filters.state === "active"
        ? "active"
        : "all";
  const specificState =
    filters.state && !["to-review", "active", "all"].includes(filters.state)
      ? filters.state
      : undefined;
  const criteria = hashKey([
    filters.query,
    filters.seasonId,
    filters.platform,
    specificState,
  ]);
  const previousCriteria = useRef(criteria);
  useEffect(() => {
    if (previousCriteria.current !== criteria) {
      pager.current?.scrollAllToTop();
      previousCriteria.current = criteria;
    }
  }, [criteria]);
  const changed = !!filters.seasonId || !!filters.platform || !!specificState;
  const { control, handleSubmit, setValue } = useForm<{ query: string }>({
    defaultValues: { query: filters.query ?? "" },
  });
  return (
    <Page edges={["left", "right", "bottom"]}>
      <PagedTabs
        ref={pager}
        selected={selected}
        onSelect={(state) => router.setParams({ state })}
        header={<PageHeader title="Liens vidéo" />}
        tabs={queueTabs.map(({ id, label }) => ({
          id,
          label,
          content: (
            <QueueScene
              id={id}
              active={selected === id}
              filters={{
                ...filters,
                state: id === "all" && specificState ? specificState : id,
              }}
            />
          ),
        }))}
        renderTabBar={(props) => (
          <>
            <PagerTabBar {...props} />
            <View style={styles.toolbar}>
              <View style={styles.searchInput}>
                <Controller
                  control={control}
                  name="query"
                  render={({ field }) => (
                    <SearchField
                      ref={field.ref}
                      label="Rechercher un match, un lien"
                      placeholder="Rechercher un match, un lien…"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      onClear={() => {
                        setValue("query", "");
                        router.setParams({ query: "" });
                      }}
                      returnKeyType="search"
                      onSubmitEditing={() =>
                        void handleSubmit(({ query }) =>
                          router.setParams({ query }),
                        )()
                      }
                    />
                  )}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={changed ? "Filtres actifs" : "Filtres"}
                onPress={() => {
                  Keyboard.dismiss();
                  router.push({
                    pathname: "/administration/stream-links/filters",
                    params: { ...filters },
                  });
                }}
                style={({ pressed }) => [
                  styles.filter,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    width: filterSize,
                    minHeight: filterSize,
                    opacity: pressed ? tokens.opacity.pressed : 1,
                  },
                ]}
              >
                <Image
                  accessible={false}
                  source={require("../../../../assets/discovery/filter.svg")}
                  tintColor={colors.icon}
                  contentFit="contain"
                  style={styles.filterIcon}
                />
                {changed && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.indicator,
                      {
                        backgroundColor: colors.accentPrimary,
                        borderColor: colors.surface,
                      },
                    ]}
                  />
                )}
              </Pressable>
            </View>
          </>
        )}
      />
    </Page>
  );
}

/** One retained native page has one private Query traversal; inactive pages neither fetch nor continue. */
function QueueScene({
  id,
  active,
  filters,
}: {
  id: string;
  active: boolean;
  filters: ModerationFilters;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const editing = useModerationQueue(filters, active);
  const { query } = editing;
  const { colors } = useTheme();
  const feedback = useActionFeedback();
  const navigation = useNavigation();
  const { focusedTab } = useCollapsingTabsContext();
  const current =
    editing.canRetain && !isAccessDenied(query.error)
      ? query.data?.pages[0]
      : undefined;
  const rows = current
    ? [
        ...new Map(
          (query.data?.pages ?? [])
            .flatMap((page) => page.items)
            .map((item) => [item.match.id, item]),
        ).values(),
      ]
    : [];
  /** Refreshes this selected traversal from page zero, retaining accepted rows and route criteria on failure. */
  async function refresh() {
    if (refreshing || !active) return;
    feedback.clear();
    setRefreshing(true);
    try {
      await editing.refresh();
    } catch {
      feedback.error();
    } finally {
      setRefreshing(false);
    }
  }
  /** The same native end event and retry footer used by search own bounded continuation. */
  async function more() {
    if (
      !active ||
      refreshing ||
      !navigation.isFocused() ||
      AppState.currentState !== "active" ||
      !editing.allowed ||
      !query.hasNextPage ||
      query.isFetching ||
      (query.isError && !query.isFetchNextPageError)
    )
      return;
    feedback.clear();
    const result = await query.fetchNextPage({ cancelRefetch: false });
    if (
      result.isFetchNextPageError &&
      navigation.isFocused() &&
      focusedTab.value === id
    )
      feedback.error();
  }
  const refreshControl = current ? (
    <DataRefreshControl
      refreshing={refreshing}
      enabled={active}
      onRefresh={() => void refresh()}
    />
  ) : undefined;
  if (
    !current &&
    (editing.profile.isPending || (editing.allowed && query.isPending))
  )
    return (
      <PagedStateScrollView>
        <View style={[pageContentStyle, styles.list]}>
          <ModerationQueueLoading />
        </View>
      </PagedStateScrollView>
    );
  if (rows.length === 0)
    return (
      <PagedStateScrollView refreshControl={refreshControl}>
        <ScreenState>
          {!editing.canRetain && editing.profile.isSuccess ? (
            <Text style={[tokens.typography.body, { color: colors.text }]}>
              La modération des liens vidéo n’est pas autorisée.
            </Text>
          ) : !current ? (
            <ReadFeedback
              query={
                editing.profile.isError || editing.profile.isPending
                  ? editing.profile
                  : query
              }
            />
          ) : (
            <EmptyState
              title="Aucun lien à traiter"
              description="Aucun match ne correspond à cette sélection."
            />
          )}
        </ScreenState>
      </PagedStateScrollView>
    );
  return (
    <TabLegendList
      {...pagedListDefaults}
      recycleItems
      accessibilityLabel="File de modération des liens"
      data={rows}
      keyExtractor={(item) => item.match.id}
      contentContainerStyle={[pageContentStyle, styles.list]}
      ItemSeparatorComponent={ListSeparator}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={refreshControl}
      onEndReached={() => {
        if (!query.isError) void more();
      }}
      renderItem={({ item }) => <ModerationQueueRow item={item} />}
      ListFooterComponent={
        <>
          <ListContinuation
            loading={query.isFetchingNextPage}
            failed={query.isError}
            disabled={!active || query.isFetching}
            onRetry={() =>
              void (query.isFetchNextPageError ? more() : refresh())
            }
          />
          <BottomContentSpacer />
        </>
      }
    />
  );
}

/** Private match cards reuse sporting identities, shared surfaces and the existing list geometry. */
function ModerationQueueRow({ item }: { item: StreamModerationItemResponse }) {
  const { colors } = useTheme();
  const match = item.match;
  return (
    <Link
      href={{
        pathname: "/administration/stream-links/[matchId]",
        params: { matchId: match.id },
      }}
      asChild
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${match.home.name} – ${match.away.name}`}
      >
        <ModerationMatchContext match={match} showMatchLink={false}>
          <View style={[styles.badges, { borderColor: colors.border }]}>
            {[
              [item.counts.active, "actif"],
              [item.counts.pending, "en attente"],
              [item.counts.reports, "signalements"],
              [item.counts.hidden, "masqué"],
              [item.counts.rejected, "refusés (historique)"],
            ]
              .filter(([count]) => count !== 0)
              .map(([count, label]) => (
                <Text
                  key={label}
                  style={[
                    styles.badge,
                    {
                      color: colors.secondaryText,
                      backgroundColor: colors.subtle,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {count} {label}
                </Text>
              ))}
          </View>
        </ModerationMatchContext>
      </Pressable>
    </Link>
  );
}
const styles = StyleSheet.create({
  list: { paddingTop: tokens.layout.content.start },
  toolbar: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.screen,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.layout.content.start,
  },
  filter: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  filterIcon: { width: tokens.size.icon.lg, height: tokens.size.icon.lg },
  indicator: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 11,
    height: 11,
    borderRadius: tokens.radius.full,
    borderWidth: tokens.spacing.optical,
  },
  searchInput: { flex: 1 },
  badges: {
    borderTopWidth: tokens.border.thin,
    paddingTop: tokens.spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
  },
  badge: {
    ...tokens.typography.metadata,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.sm,
  },
});
