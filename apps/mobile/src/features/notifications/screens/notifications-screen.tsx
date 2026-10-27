import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useEffectEvent, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import {
  Page,
  PageContent,
  PageScrollView,
  pageContentStyle,
} from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { Button } from "../../../shared/components/button";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { EmptyState, ErrorState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { Skeleton } from "../../../shared/components/skeleton";
import { ListSeparator } from "../../../shared/components/list-separator";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useInboxQueries } from "../api/use-inbox-queries";
import { refreshInbox, refreshNotificationSummary } from "../api/inbox-queries";
import { createReadNotificationOptions } from "../api/inbox-mutations";
import { notificationExpiry } from "../state/inbox-expiry";
import { NotificationItem } from "../components/notification-item";

/** Current F05/F12 admission precedes private inbox observers, including direct guest entry. */
export function NotificationsScreen() {
  const authority = useInboxQueries();
  const { account } = authority;
  if (!authority.queries)
    return (
      <Page edges={["left", "right"]}>
        <ScrollChrome header={<PageHeader title="Notifications" />}>
          {({ onScroll, headerHeight }) => (
            <PageScrollView
              onScroll={onScroll}
              scrollEventThrottle={16}
              scrollIndicatorInsets={{ top: headerHeight }}
              contentContainerStyle={{ paddingTop: headerHeight }}
            >
              <ScreenState>
                {account.isPending ? (
                  <RequestLoading />
                ) : (
                  <ErrorState
                    onRetry={() => void account.refetch()}
                    retrying={account.isFetching}
                  />
                )}
              </ScreenState>
            </PageScrollView>
          )}
        </ScrollChrome>
      </Page>
    );
  return (
    <Inbox
      key={`${authority.owner.generation}:${authority.owner.accountId}`}
      {...authority}
      queries={authority.queries}
    />
  );
}

/** Native growing list; read and match navigation settle independently in their existing owners. */
function Inbox({
  owner,
  queries,
}: {
  owner: ReturnType<typeof useInboxQueries>["owner"];
  queries: NonNullable<ReturnType<typeof useInboxQueries>["queries"]>;
}) {
  const client = useQueryClient();
  // Focus owns opening reads; the native observer still owns data, paging and fetch state.
  const query = useInfiniteQuery({ ...queries.inbox, enabled: false });
  const command = useMutation(
    createReadNotificationOptions(client, owner, queries),
  );
  const router = useRouter();
  const navigation = useNavigation();
  const feedback = useActionFeedback();
  const { colors } = useTheme();
  // Cached rows also pass the opening cutoff before the first render; the ordinary layout owns active/resume cleanup.
  const [openedAt] = useState(Date.now);
  const rows = [
    ...new Map(
      (query.data?.pages ?? [])
        .flatMap((page) => page.notifications)
        .filter((row) => notificationExpiry(row) > openedAt)
        .map((row) => [row.id, row]),
    ).values(),
  ];

  /** Opening/focus requests the first page and whole summary; failure retains authorized content. */
  const open = useEffectEvent(() => {
    void refreshInbox(client, queries).catch(() => undefined);
    void refreshNotificationSummary(client, queries).catch(() => undefined);
  });
  useEffect(() => {
    if (navigation.isFocused()) open();
    return navigation.addListener("focus", () => open());
  }, [navigation]);

  /** User refresh reports failure discreetly and swaps traversal only after a successful native Query fetch. */
  async function refresh() {
    feedback.clear();
    const outcomes = await Promise.allSettled([
      refreshInbox(client, queries),
      refreshNotificationSummary(client, queries),
    ]);
    if (
      owner.isCurrent(owner.generation) &&
      outcomes.some(
        (result) =>
          result.status === "rejected" && !isAccessDenied(result.reason),
      )
    )
      feedback.error();
  }
  /** Failed continuation leaves loaded rows and the exact same cursor available for explicit retry. */
  async function loadMore() {
    const result = await query.fetchNextPage({ cancelRefetch: false });
    if (
      owner.isCurrent(owner.generation) &&
      result.isError &&
      !isAccessDenied(result.error)
    )
      feedback.error();
  }
  return (
    <Page edges={["left", "right"]}>
      <ScrollChrome
        header={
          <View style={styles.header}>
            <Text
              accessibilityRole="header"
              style={[tokens.typography.navigation, { color: colors.text }]}
            >
              Notifications
            </Text>
          </View>
        }
      >
        {({ onScroll, headerHeight }) => (
          <Animated.FlatList
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            alwaysBounceVertical
            data={rows}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={ListSeparator}
            contentContainerStyle={[
              rows.length ? pageContentStyle : styles.empty,
              {
                paddingTop:
                  headerHeight +
                  (rows.length ? tokens.layout.content.start : 0),
              },
            ]}
            refreshControl={
              <DataRefreshControl
                progressViewOffset={headerHeight}
                refreshing={query.isRefetching && !query.isFetchingNextPage}
                onRefresh={() => void refresh()}
              />
            }
            ListEmptyComponent={
              query.data ? (
                <ScreenState>
                  <EmptyState
                    title="Aucune notification pour le moment"
                    description="Les nouvelles de vos équipes et poules suivies apparaîtront ici."
                  />
                </ScreenState>
              ) : query.isError ? (
                <ScreenState>
                  <ErrorState
                    onRetry={() => void refresh()}
                    retrying={query.isFetching}
                  />
                </ScreenState>
              ) : (
                <NotificationLoading />
              )
            }
            ListFooterComponent={
              query.hasNextPage ? (
                <View style={styles.continuation}>
                  <Button
                    label={
                      query.isFetchNextPageError
                        ? "Réessayer"
                        : "Charger la suite"
                    }
                    variant="secondary"
                    loading={query.isFetchingNextPage}
                    disabled={query.isFetching}
                    onPress={() => void loadMore()}
                  />
                </View>
              ) : undefined
            }
            renderItem={({ item }) => (
              <NotificationItem
                notification={item}
                pending={command.isPending && command.variables === item.id}
                onPress={() => {
                  if (!owner.isCurrent(owner.generation)) return;
                  // Both intents start on tap; either can fail without reversing the other.
                  command.mutate(item.id, {
                    onError: () => {
                      if (owner.isCurrent(owner.generation)) feedback.error();
                    },
                  });
                  try {
                    router.push({
                      pathname: "/matches/[matchId]",
                      params: { matchId: item.match.id },
                    });
                  } catch {
                    feedback.error();
                  }
                }}
              />
            )}
          />
        )}
      </ScrollChrome>
    </Page>
  );
}

/** Approved notification skeleton slots use shared reduced-motion-independent primitives. */
function NotificationLoading() {
  return (
    <PageContent>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Chargement des notifications"
        style={styles.skeletons}
      >
        {[0, 1, 2].map((key) => (
          <View key={key} style={styles.skeleton}>
            <Skeleton height={64} shape="rectangle" />
            <Skeleton width="80%" />
            <Skeleton width="65%" />
            <Skeleton width="65%" />
          </View>
        ))}
      </View>
    </PageContent>
  );
}
const styles = StyleSheet.create({
  header: {
    minHeight: tokens.layout.header,
    paddingHorizontal: tokens.spacing.screen,
    justifyContent: "center",
  },
  empty: { flexGrow: 1 },
  continuation: { marginTop: tokens.spacing.lg },
  skeletons: { gap: tokens.layout.list.gap },
  skeleton: { gap: tokens.spacing.md, paddingBottom: tokens.spacing.md },
});
