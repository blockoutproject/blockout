import { NoAvailableFollows } from "./no-available-follows";
import { PageFlatList } from "@/shared/components/page-list";
import { useContentReveal } from "@/shared/components/content-reveal";
import { useEffect, useState, type ReactNode } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronUp } from "lucide-react-native";
import { DisclosureChevron } from "@/shared/components/disclosure-chevron";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { PageScrollView } from "@/shared/components/page";
import type { ApiFetchOptions } from "@/shared/api/api-fetch";
import { BottomContentSpacer } from "@/shared/components/bottom-content-inset";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { ListContinuation } from "@/shared/components/list-continuation";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import {
  SportingEntityCard,
  SportingEntityCardLoading,
  type SportingEntityCardProps,
} from "@/features/sporting/entity-card";
import { useSportingNavigation } from "@/features/sporting/navigation";
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

const disclosureEasing = Easing.bezier(...tokens.motion.compact.easing);
const followedResources = ["team", "pool"] as const;
const followedLabels = { team: "Équipes suivies", pool: "Poules suivies" };

/** Keeps a closing section in the list until its height reaches zero. */
function useFollowedDisclosure(reducedMotion: boolean) {
  const [phase, setPhase] = useState<"open" | "closing" | "closed">("open");
  const progress = useSharedValue(1);
  const expanded = phase === "open";

  useEffect(() => {
    let active = true;

    function finishClosing() {
      if (active) {
        setPhase((current) => (current === "closing" ? "closed" : current));
      }
    }

    progress.set(
      withTiming(
        expanded ? 1 : 0,
        {
          duration: reducedMotion ? 0 : tokens.motion.compact.duration,
          easing: disclosureEasing,
          reduceMotion: ReduceMotion.Never,
        },
        (finished) => {
          if (finished && !expanded) {
            scheduleOnRN(finishClosing);
          }
        },
      ),
    );

    return () => {
      active = false;
    };
  }, [expanded, progress, reducedMotion]);

  return {
    expanded,
    visible: expanded || (phase === "closing" && !reducedMotion),
    progress,
    toggle: () =>
      setPhase((current) => {
        if (current !== "open") {
          return "open";
        }
        return reducedMotion ? "closed" : "closing";
      }),
  };
}

/** Open rows participate in native layout immediately. Disclosure measures unclipped content during motion. */
function FollowedDisclosureRow({
  children,
  expanded,
  progress,
}: Readonly<{
  children: ReactNode;
  expanded: boolean;
  progress: SharedValue<number>;
}>) {
  const height = useSharedValue(0);
  const layout = useAnimatedStyle(() => {
    const fraction = progress.get();
    return {
      height: fraction === 1 ? "auto" : height.get() * fraction,
      overflow: fraction === 1 ? "visible" : "hidden",
    };
  });
  const contentLayout = useAnimatedStyle(() => ({
    position: progress.get() === 1 ? "relative" : "absolute",
  }));
  return (
    <Animated.View
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
      pointerEvents={expanded ? "auto" : "none"}
      style={layout}
    >
      <Animated.View
        onLayout={(event) => height.set(event.nativeEvent.layout.height)}
        style={[styles.disclosureContent, contentLayout]}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

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
          club,
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
          [competitionName, phaseName].filter(Boolean).join(" - ") || undefined,
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
  const [refreshing, setRefreshing] = useState(false);
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

  async function append() {
    if (!active || query.isFetching || !query.hasNextPage) {
      return;
    }
    await query.fetchNextPage({ cancelRefetch: false });
  }

  /** Refetches the ordinary retained traversal; final failure belongs to the shared Following card. */
  async function refresh() {
    if (!active || !query.data || query.isFetching) {
      return;
    }
    setRefreshing(true);
    try {
      await query.refetch({ cancelRefetch: false });
    } finally {
      setRefreshing(false);
    }
  }

  return {
    query,
    items: followedItems(query.data?.pages),
    append,
    refresh,
    refreshing,
  };
}

/** Home sections share one native list and open exact F03 sheets through the existing F11 owner. */
export function FollowedLists(props: Readonly<FollowedListsProps>) {
  const { reducedMotion } = useTheme();
  const teamDisclosure = useFollowedDisclosure(reducedMotion);
  const poolDisclosure = useFollowedDisclosure(reducedMotion);
  const disclosure = { team: teamDisclosure, pool: poolDisclosure };
  const teams = useFollowedList(props, "team", teamDisclosure.expanded);
  const pools = useFollowedList(props, "pool", poolDisclosure.expanded);
  const lists = { team: teams, pool: pools };
  const sporting = useSportingNavigation(props.active);
  const failed = followedResources
    .filter((type) => {
      const { query, refreshing } = lists[type];
      return (
        disclosure[type].expanded &&
        hasReadError(query) &&
        // A pull retains the previous continuation error until this collection's new read settles.
        (!query.data || (!query.isFetchNextPageError && !refreshing))
      );
    })
    .map((type) => lists[type].query);
  const presentation = useContentReveal();
  const hasCards =
    (teamDisclosure.visible && teams.items.length > 0) ||
    (poolDisclosure.visible && pools.items.length > 0);

  /** One pull refetches the open collections; their existing queries own both outcomes. */
  async function refresh() {
    await Promise.all([teams.refresh(), pools.refresh()]);
  }

  /** Rereads only open collections whose initial or complete read failed. */
  async function retry() {
    if (!props.active) {
      return;
    }
    await Promise.all(
      failed.map((query) => query.refetch({ cancelRefetch: false })),
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

  const rows: FollowedRow[] = followedResources.flatMap((resource) => [
    { key: `${resource}-heading`, kind: "heading" as const, resource },
    ...(disclosure[resource].visible
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
  ]);
  const refreshControl = [teams, pools].some(
    (list) => list.items.length > 0,
  ) ? (
    <DataRefreshControl
      enabled={props.active}
      onRefresh={refresh}
      fetching={
        (teamDisclosure.expanded && teams.query.isFetching) ||
        (poolDisclosure.expanded && pools.query.isFetching)
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
    <PageFlatList
      accessibilityRole="list"
      accessibilityLabel="Équipes et poules suivies"
      data={rows}
      reveal={{
        active: props.active && hasCards,
        blockKey: (row) => (row.kind === "item" ? row.key : undefined),
        presentation,
      }}
      keyExtractor={(row) => row.key}
      removeClippedSubviews={false}
      alwaysBounceVertical
      refreshControl={refreshControl}
      contentContainerStyle={styles.content}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (!teams.query.isError) {
          void teams.append();
        }
        if (!pools.query.isError) {
          void pools.append();
        }
      }}
      ListFooterComponent={<BottomContentSpacer />}
      renderItem={({ item: row }) => {
        const list = lists[row.resource];
        const section = disclosure[row.resource];
        if (row.kind === "heading") {
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={followedLabels[row.resource]}
              accessibilityState={{ expanded: section.expanded }}
              onPress={section.toggle}
              style={styles.heading}
            >
              <FollowedHeading
                resource={row.resource}
                expanded={section.expanded}
              />
            </Pressable>
          );
        }
        let content: ReactNode;
        if (row.kind === "item") {
          content = (
            <View style={styles.card}>
              <SportingEntityCard {...row.item} onOpen={sporting.navigate} />
            </View>
          );
        } else if (!list.query.data) {
          content =
            (list.query.isEnabled || !section.expanded) &&
            list.query.isPending &&
            list.query.isFetching ? (
              <FollowedCardsLoading resource={row.resource} />
            ) : null;
        } else if (!list.items.length && !list.query.hasNextPage) {
          content = (
            <View style={styles.feedback}>
              <NoAvailableFollows />
            </View>
          );
        } else {
          content = (
            <ListContinuation
              loading={list.query.isFetchingNextPage}
              failed={list.query.hasNextPage && list.query.isFetchNextPageError}
              disabled={!props.active || list.query.isFetching}
              onRetry={() => void list.append()}
            />
          );
        }
        return (
          <FollowedDisclosureRow
            expanded={section.expanded}
            progress={section.progress}
          >
            {content}
          </FollowedDisclosureRow>
        );
      }}
    />
  );
}

/** The first visit opens both sections; the preview reserves their usual loading geometry. */
export function FollowedListsPreview() {
  return (
    <View style={styles.content}>
      {followedResources.map((resource) => (
        <View key={resource}>
          <View style={styles.heading}>
            <FollowedHeading resource={resource} />
          </View>
          <FollowedCardsLoading resource={resource} />
        </View>
      ))}
    </View>
  );
}

function FollowedHeading({
  resource,
  expanded,
}: Readonly<{ resource: FollowingTarget["type"]; expanded?: boolean }>) {
  const { colors } = useTheme();
  return (
    <>
      <Text
        style={[
          tokens.typography.navigation,
          styles.title,
          { color: colors.text },
        ]}
      >
        {followedLabels[resource]}
      </Text>
      {expanded === undefined ? (
        <ChevronUp
          accessible={false}
          size={tokens.size.icon.md}
          color={colors.icon}
        />
      ) : (
        <DisclosureChevron expanded={expanded} />
      )}
    </>
  );
}

function FollowedCardsLoading({
  resource,
}: Readonly<{ resource: FollowingTarget["type"] }>) {
  return (
    <View style={styles.feedback}>
      <View style={styles.card}>
        <SportingEntityCardLoading
          kind={resource}
          label={
            resource === "team"
              ? "Chargement des équipes suivies"
              : "Chargement des poules suivies"
          }
        />
      </View>
    </View>
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
  disclosureContent: { top: 0, left: 0, right: 0 },
  card: { paddingBottom: tokens.spacing.md },
  feedback: { paddingBottom: tokens.spacing.xl },
});
