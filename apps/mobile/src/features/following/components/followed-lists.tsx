import { PageList } from "../../../shared/components/page-list";
import { useRef, useState } from "react";
import type { LegendListRef } from "@legendapp/list/react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Search } from "lucide-react-native";
import { DisclosureChevron } from "../../../shared/components/disclosure-chevron";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import { PageScrollView } from "../../../shared/components/page";
import type { ApiFetchOptions } from "../../../shared/api/api-fetch";
import { Button } from "../../../shared/components/button";
import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { ListContinuation } from "../../../shared/components/list-continuation";
import {
  hasReadError,
  ReadFeedback,
} from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { EmptyState } from "../../../shared/components/state-card";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import {
  SportingEntityCard,
  SportingEntityCardLoading,
  type SportingEntityCardProps,
} from "../../sporting/entity-card";
import { useSportingNavigation } from "../../sporting/navigation";
import type { FollowingOwner, FollowingTarget } from "../api/following-keys";
import {
  createFollowListOptions,
  type FollowListPage,
} from "../api/personal-queries";

/** Both current collections share the existing personal season, original owner and visible-tab admission. */
export interface FollowedListsProps {
  owner: FollowingOwner;
  request: (signal?: AbortSignal) => Promise<ApiFetchOptions>;
  seasonId?: string;
  active: boolean;
  bypass: boolean;
}

/** Render-only current identity slots; no follow state or loaded-count total is inferred from them. */
type FollowedItem = SportingEntityCardProps & {
  kind: FollowingTarget["type"];
};
/** One virtualized native list holds the two collapsible collections and their native loading feedback. */
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

/** Query owns each open collection's retained pages, continuation and reset semantics. */
function useFollowedList(
  props: FollowedListsProps,
  type: FollowingTarget["type"],
  expanded: boolean,
) {
  const options = createFollowListOptions(
    props.owner,
    props.request,
    type,
    props.seasonId,
    props.bypass,
  );
  const active = props.active && expanded;
  const query = useInfiniteQuery({
    ...options,
    enabled: (state) => active && state.state.status !== "error",
  });

  /** Native scroll continuation stops after failure; the tab's card resumes the failed page. */
  async function append() {
    if (!active || query.isFetching || !query.hasNextPage || query.isError) {
      return;
    }
    await query.fetchNextPage({ cancelRefetch: false });
  }

  /** Refetches the ordinary retained traversal; final failure belongs to the shared Following card. */
  async function refresh() {
    if (!active || !query.data || query.isFetching) {
      return;
    }
    await query.refetch({ cancelRefetch: false });
  }

  return { query, items: followedItems(query.data?.pages), append, refresh };
}

/** Approved Home sections retain native scroll context and open exact F03 sheets through the existing F11 owner. */
export function FollowedLists(props: Readonly<FollowedListsProps>) {
  const [expanded, setExpanded] = useState({ team: true, pool: true });
  const list = useRef<LegendListRef>(null);
  const offset = useRef(0);
  const teams = useFollowedList(props, "team", expanded.team);
  const pools = useFollowedList(props, "pool", expanded.pool);
  const lists = { team: teams, pool: pools };
  const { colors } = useTheme();
  const sporting = useSportingNavigation(props.active);
  const failed = (["team", "pool"] as const)
    .filter((type) => expanded[type] && hasReadError(lists[type].query))
    .map((type) => lists[type].query);

  /** One pull refetches the open collections; their existing queries own both outcomes. */
  async function refresh() {
    await Promise.all([teams.refresh(), pools.refresh()]);
  }

  /** Rereads only failed open collections, preserving the native failed continuation cursor. */
  async function retry() {
    if (!props.active) {
      return;
    }
    await Promise.all(
      failed.map((query) =>
        query.isFetchNextPageError
          ? query.fetchNextPage({ cancelRefetch: false })
          : query.refetch({ cancelRefetch: false }),
      ),
    );
  }

  if (failed.length > 0) {
    return (
      <PageScrollView>
        <ScreenState>
          <ReadFeedback
            query={{
              ...failed[0],
              isFetching: failed.some((query) => query.isFetching),
            }}
            loadingContent={null}
            onRetry={retry}
          />
        </ScreenState>
      </PageScrollView>
    );
  }

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
  const refreshControl = [teams, pools].some(
    (list) => list.items.length > 0,
  ) ? (
    <DataRefreshControl
      enabled={props.active}
      onRefresh={refresh}
      fetching={
        (expanded.team && teams.query.isFetching) ||
        (expanded.pool && pools.query.isFetching)
      }
    />
  ) : undefined;
  if (
    teams.query.data &&
    pools.query.data &&
    !teams.query.isError &&
    !pools.query.isError &&
    !teams.items.length &&
    !pools.items.length &&
    !teams.query.hasNextPage &&
    !pools.query.hasNextPage
  ) {
    return (
      <PageScrollView refreshControl={refreshControl}>
        <ScreenState>
          <NoAvailableFollows />
        </ScreenState>
      </PageScrollView>
    );
  }
  return (
    <PageList
      ref={list}
      {...hiddenScrollIndicators}
      accessibilityRole="list"
      accessibilityLabel="Équipes et poules suivies"
      data={rows}
      keyExtractor={(row) => row.key}
      getItemType={(row) => row.kind}
      recycleItems
      alwaysBounceVertical
      onScroll={({ nativeEvent }) => {
        offset.current = nativeEvent.contentOffset.y;
      }}
      onLoad={() => {
        if (offset.current > 0) {
          list.current?.scrollToOffset({
            offset: offset.current,
            animated: false,
          });
        }
      }}
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
              <DisclosureChevron expanded={expanded[row.resource]} />
            </Pressable>
          );
        }
        if (row.kind === "item") {
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
        }

        /** Successful section content uses its native first-load, empty and pending-continuation feedback. */
        function renderListFeedback() {
          if (!list.query.data) {
            return (
              <ReadFeedback
                query={list.query}
                loadingContent={
                  <View style={styles.card}>
                    <SportingEntityCardLoading
                      label={
                        row.resource === "team"
                          ? "Chargement des équipes suivies"
                          : "Chargement des poules suivies"
                      }
                    />
                  </View>
                }
              />
            );
          }
          if (!list.items.length && !list.query.hasNextPage) {
            return <NoAvailableFollows />;
          }
          return (
            <ListContinuation
              loading={list.query.isFetchingNextPage}
              failed={false}
              onRetry={() => void list.append()}
            />
          );
        }

        return <View style={styles.feedback}>{renderListFeedback()}</View>;
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
