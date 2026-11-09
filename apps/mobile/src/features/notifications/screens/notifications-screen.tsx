import { RefreshCw } from "lucide-react-native";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { PageFlatList } from "../../../shared/components/page-list";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigation, useIsFocused } from "expo-router";
import { useEffect, useEffectEvent, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  Page,
  PageContent,
  PageScrollView,
  pageContentStyle,
} from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";

import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { ListContinuation } from "../../../shared/components/list-continuation";
import { Button } from "../../../shared/components/button";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { EmptyState, ErrorState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
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
import { NotificationLoading } from "../components/notification-loading";
import { AccountSessionFeedback } from "../../accounts/current-account";
import { useSportingNavigation } from "../../sporting/navigation";

/** Current F05/F12 admission precedes private inbox observers, including direct guest entry. */
export function NotificationsScreen() {
  const authority = useInboxQueries();
  const { account, session } = authority;
  const authenticated = session.status === "authenticated";
  const pending =
    session.status === "restoring" ||
    session.status === "authenticating" ||
    session.status === "signing-out" ||
    (authenticated && account.isLoading);
  const FeedbackLayout = pending ? PageContent : ScreenState;
  let feedback = (
    <ErrorState
      onRetry={() => void account.refetch()}
      retrying={account.isFetching}
    />
  );
  if (!authenticated) {
    feedback = (
      <AccountSessionFeedback loadingContent={<NotificationLoading />} />
    );
  } else if (pending) {
    feedback = <NotificationLoading />;
  }
  if (!authority.queries) {
    return (
      <Page
        edges={["top", "left", "right"]}
        header={<PageHeader title="Notifications" />}
      >
        <PageScrollView>
          <FeedbackLayout>{feedback}</FeedbackLayout>
        </PageScrollView>
      </Page>
    );
  }
  return (
    <Inbox
      key={`${authority.owner.subject}:${authority.owner.accountId}`}
      {...authority}
      queries={authority.queries}
    />
  );
}

/** Native growing list with a fully named, one-line page title; read and match navigation settle independently in their existing owners. */
function Inbox({
  owner,
  queries,
}: Readonly<{
  owner: ReturnType<typeof useInboxQueries>["owner"];
  queries: NonNullable<ReturnType<typeof useInboxQueries>["queries"]>;
}>) {
  const client = useQueryClient();
  const focused = useIsFocused();
  const query = useInfiniteQuery({ ...queries.inbox, enabled: focused });
  const command = useMutation(
    createReadNotificationOptions(client, owner, queries),
  );
  const sporting = useSportingNavigation();
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
  /** Focus refreshes the whole summary; the enabled infinite query owns list reads and invalidation. */
  const open = useEffectEvent(() => {
    void refreshNotificationSummary(client, queries).catch(() => undefined);
  });
  useEffect(() => {
    if (navigation.isFocused()) {
      open();
    }
    return navigation.addListener("focus", () => open());
  }, [navigation]);

  /** Explicit refresh retains authorized rows on ordinary failure and reports it through the existing toast. */
  async function refresh() {
    feedback.clear();
    const outcomes = await Promise.allSettled([
      refreshInbox(client, queries),
      refreshNotificationSummary(client, queries),
    ]);
    if (
      rows.length > 0 &&
      outcomes.some(
        (result) =>
          result.status === "rejected" && !isAccessDenied(result.reason),
      )
    ) {
      feedback.error();
    }
  }

  /** The focused current owner may retry the failed cursor explicitly; native edge events never replay it. */
  async function loadMore() {
    if (
      !navigation.isFocused() ||
      !query.hasNextPage ||
      query.isFetching ||
      (query.isError && !query.isFetchNextPageError)
    ) {
      return;
    }
    feedback.clear();
    await query.fetchNextPage({ cancelRefetch: false });
  }

  /** Starts both independent intents once; this tap owns their first safe failure feedback. */
  function openNotification(id: string, matchId: string) {
    feedback.clear();
    let reported = false;

    /** Later failure of this same tap neither replaces its toast nor reannounces it. */
    function reportFailure() {
      if (reported) {
        return;
      }
      reported = true;
      feedback.error();
    }

    command.mutate(id, { onError: reportFailure });
    void sporting.navigate("match", matchId, reportFailure);
  }

  /** Presents the list's empty state without changing Query ownership or starting reads. */
  function emptyContent() {
    if (query.isLoading) {
      return (
        <PageContent>
          <NotificationLoading />
        </PageContent>
      );
    }
    if (query.isError) {
      return (
        <ScreenState>
          <ErrorState
            onRetry={() => void refresh()}
            retrying={query.isFetching}
          />
        </ScreenState>
      );
    }
    if (query.data) {
      return (
        <ScreenState>
          <EmptyState
            title="Aucune notification pour le moment"
            description="Les nouvelles de vos équipes et poules suivies apparaîtront ici."
          >
            <Button
              label="Actualiser"
              leadingIcon={RefreshCw}
              onPress={() => void refresh()}
              loading={query.isFetching}
            />
          </EmptyState>
        </ScreenState>
      );
    }
    return (
      <ScreenState>
        <ReadFeedback query={query} loadingContent={<NotificationLoading />} />
      </ScreenState>
    );
  }

  return (
    <Page
      edges={["top", "left", "right"]}
      header={
        <View style={styles.header}>
          <Text
            accessibilityRole="header"
            accessibilityLabel="Notifications"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[tokens.typography.navigation, { color: colors.text }]}
          >
            Notifications
          </Text>
        </View>
      }
    >
      <PageFlatList
        {...hiddenScrollIndicators}
        alwaysBounceVertical={rows.length > 0}
        data={rows}
        onEndReached={() => {
          if (!query.isError) {
            void loadMore();
          }
        }}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={ListSeparator}
        contentContainerStyle={rows.length ? pageContentStyle : styles.empty}
        refreshControl={
          rows.length > 0 ? (
            <DataRefreshControl onRefresh={refresh} />
          ) : undefined
        }
        ListEmptyComponent={emptyContent()}
        ListFooterComponent={
          <>
            {(query.isFetchingNextPage ||
              (!!query.data && query.isFetchNextPageError)) && (
              <View style={rows.length ? styles.continuation : undefined}>
                <ListContinuation
                  loading={query.isFetchingNextPage}
                  failed={!!query.data && query.isFetchNextPageError}
                  disabled={query.isFetching}
                  onRetry={() => void loadMore()}
                />
              </View>
            )}
            <BottomContentSpacer />
          </>
        }
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            pending={command.isPending && command.variables === item.id}
            onPress={() => openNotification(item.id, item.match.id)}
          />
        )}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: tokens.layout.header,
    paddingHorizontal: tokens.spacing.screen,
    justifyContent: "center",
  },
  empty: { flexGrow: 1 },
  continuation: { paddingTop: tokens.layout.list.gap },
});
