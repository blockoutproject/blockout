import { useRef, useLayoutEffect, useState } from "react";
import {
  hashKey,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronDown, ChevronUp, Search } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TabLegendList } from "react-native-collapsible-tab/legend-list";
import type { ApiFetchOptions } from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { ListContinuation } from "../../../shared/components/list-continuation";
import {
  pagedListDefaults,
  PagedStateScrollView,
} from "../../../shared/components/paged-tabs";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { EmptyState } from "../../../shared/components/state-card";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import {
  SportingEntityCard,
  type SportingEntityCardProps,
} from "../../sporting/entity-card";
import { useSportingNavigation } from "../../sporting/navigation";
import type { FollowingOwner, FollowingTarget } from "../api/following-keys";
import {
  createFollowListOptions,
  type FollowListPage,
  type PersonalCalendarRead,
} from "../api/personal-queries";

/** Both current collections share the existing personal season, original owner and visible-tab admission. */
export interface FollowedListsProps {
  owner: FollowingOwner;
  request: (signal?: AbortSignal) => Promise<ApiFetchOptions>;
  read: PersonalCalendarRead;
  seasonId?: string;
  active: boolean;
  bypass: boolean;
}

/** Render-only current identity slots; no follow state or loaded-count total is inferred from them. */
type FollowedItem = SportingEntityCardProps & { kind: FollowingTarget["type"] };
/** One virtualized native list holds headers, cards and independent read boundaries. */
type FollowedRow =
  | {
      key: string;
      kind: "heading" | "feedback";
      resource: FollowingTarget["type"];
    }
  | {
      key: string;
      kind: "item";
      resource: FollowingTarget["type"];
      item: FollowedItem;
    };

/** UUIDs retain their first position and latest current summary after offset movement; homonyms stay distinct. */
function followedItems(
  pages: readonly FollowListPage[] | undefined,
): FollowedItem[] {
  const items = (pages ?? []).flatMap((page) =>
    page.items.map((summary): FollowedItem => {
      if ("team" in summary) {
        const { team, club, season, classification } = summary;
        return {
          kind: "team",
          identity: team,
          subtitle: club?.name,
          season,
          classification,
        };
      }
      const { pool, season, classification, competitionName, phaseName } =
        summary;
      return {
        kind: "pool",
        identity: pool,
        subtitle:
          [competitionName, phaseName].filter(Boolean).join(" · ") || undefined,
        season,
        classification,
      };
    }),
  );
  return [
    ...new Map(
      items.map((item) => [item.identity.id.toLowerCase(), item]),
    ).values(),
  ];
}

/** Native Query owns retained pages and reset semantics; explicit events alone publish read feedback. */
function useFollowedList(
  props: FollowedListsProps,
  type: FollowingTarget["type"],
  expanded: boolean,
) {
  const client = useQueryClient();
  const feedback = useActionFeedback();
  const options = createFollowListOptions(
    props.owner,
    props.request,
    type,
    props.seasonId,
    props.read,
    props.bypass,
  );
  const active = props.active && expanded;
  const identity = hashKey(options.queryKey);
  const current = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    current.current = active ? identity : undefined;
    return () => {
      current.current = undefined;
    };
  }, [active, identity]);
  const query = useInfiniteQuery({
    ...options,
    enabled: (state) => active && state.state.status !== "error",
  });
  /** Native scroll continuation stops after failure; only its explicit footer retries the same page. */
  async function append(retry = false) {
    if (
      !active ||
      query.isFetching ||
      !query.hasNextPage ||
      (query.isError && !retry)
    )
      return;
    feedback.clear();
    const result = await query.fetchNextPage();
    if (
      result.isError &&
      current.current === identity &&
      props.owner.isCurrent(props.owner.generation)
    )
      feedback.error();
  }
  /** An unchanged-context pull replaces one page only on success and keeps authorized rows on failure. */
  async function refresh() {
    if (!active || !query.data || query.isFetching) return;
    feedback.clear();
    await client.cancelQueries({ queryKey: options.queryKey, exact: true });
    try {
      await client.infiniteQuery({ ...options, staleTime: 0, pages: 1 });
    } catch {
      if (
        current.current === identity &&
        props.owner.isCurrent(props.owner.generation) &&
        client.getQueryData(options.queryKey)
      )
        feedback.error();
    }
  }
  return { query, items: followedItems(query.data?.pages), append, refresh };
}

/** Approved Home sections retain native scroll context and open exact F03 sheets through the existing F11 owner. */
export function FollowedLists(props: FollowedListsProps) {
  const [expanded, setExpanded] = useState({ team: true, pool: true });
  const teams = useFollowedList(props, "team", expanded.team);
  const pools = useFollowedList(props, "pool", expanded.pool);
  const lists = { team: teams, pool: pools };
  const { colors } = useTheme();
  const sporting = useSportingNavigation(props.active);
  const rows: FollowedRow[] = (["team", "pool"] as const).flatMap(
    (resource) => [
      { key: `${resource}-heading`, kind: "heading" as const, resource },
      ...(expanded[resource]
        ? [
            ...lists[resource].items.map((item): FollowedRow => ({
              key: `${resource}-${item.identity.id.toLowerCase()}`,
              kind: "item",
              resource,
              item,
            })),
            {
              key: `${resource}-feedback`,
              kind: "feedback" as const,
              resource,
            },
          ]
        : []),
    ],
  );
  const refreshControl = [teams, pools].some((list) => list.query.data) ? (
    <DataRefreshControl
      enabled={props.active}
      refreshing={[teams, pools].some(
        (list) => list.query.isRefetching && !list.query.isFetchingNextPage,
      )}
      onRefresh={() => {
        void teams.refresh();
        void pools.refresh();
      }}
    />
  ) : undefined;
  if (
    teams.query.data &&
    pools.query.data &&
    !teams.items.length &&
    !pools.items.length &&
    !teams.query.hasNextPage &&
    !pools.query.hasNextPage
  )
    return (
      <PagedStateScrollView refreshControl={refreshControl}>
        <ScreenState>
          <NoAvailableFollows />
        </ScreenState>
      </PagedStateScrollView>
    );
  return (
    <TabLegendList
      {...pagedListDefaults}
      accessibilityRole="list"
      accessibilityLabel="Équipes et poules suivies"
      data={rows}
      keyExtractor={(row) => row.key}
      getItemType={(row) => row.kind}
      recycleItems
      alwaysBounceVertical
      refreshControl={refreshControl}
      contentContainerStyle={styles.content}
      onEndReached={() => {
        void teams.append();
        void pools.append();
      }}
      ListFooterComponent={<BottomContentSpacer />}
      renderItem={({ item: row }) => {
        const list = lists[row.resource];
        if (row.kind === "heading") {
          const Icon = expanded[row.resource] ? ChevronUp : ChevronDown;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                row.resource === "team" ? "Équipes suivies" : "Poules suivies"
              }
              accessibilityState={{ expanded: expanded[row.resource] }}
              onPress={() =>
                setExpanded((value) => ({
                  ...value,
                  [row.resource]: !value[row.resource],
                }))
              }
              style={styles.heading}
            >
              <Text
                style={[
                  tokens.typography.navigation,
                  styles.title,
                  { color: colors.text },
                ]}
              >
                {row.resource === "team" ? "Équipes suivies" : "Poules suivies"}
              </Text>
              <Icon
                accessible={false}
                size={tokens.size.icon.sm}
                color={colors.icon}
              />
            </Pressable>
          );
        }
        if (row.kind === "item")
          return (
            <View style={styles.card}>
              <SportingEntityCard
                {...row.item}
                onPress={() =>
                  void sporting.navigate(row.item.kind, row.item.identity.id)
                }
              />
            </View>
          );
        return (
          <View style={styles.feedback}>
            {!list.query.data ? (
              <ReadFeedback query={list.query} />
            ) : !list.items.length && !list.query.hasNextPage ? (
              <NoAvailableFollows />
            ) : (
              <ListContinuation
                loading={list.query.isFetchingNextPage}
                failed={list.query.isFetchNextPageError}
                disabled={!props.active || list.query.isFetching}
                onRetry={() => void list.append(true)}
              />
            )}
          </View>
        );
      }}
    />
  );
}

/** Empty current visibility offers manual discovery without claiming that retained relations were erased. */
function NoAvailableFollows() {
  const router = useRouter();
  return (
    <EmptyState
      title="Aucun suivi à afficher"
      description="Recherchez une équipe ou une poule pour suivre ses matchs."
    >
      <Button
        label="Rechercher une équipe ou une poule"
        leadingIcon={Search}
        fullWidth
        onPress={() => router.push("/search")}
      />
    </EmptyState>
  );
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: tokens.spacing.lg },
  heading: {
    minHeight: tokens.touch.minimum,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  title: { flex: 1, minWidth: 0 },
  card: { paddingBottom: tokens.spacing.md },
  feedback: { paddingBottom: tokens.spacing.xl },
});
