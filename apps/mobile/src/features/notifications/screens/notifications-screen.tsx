import { Flag, RefreshCw } from "lucide-react-native";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { PageFlatList } from "@/shared/components/page-list";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigation, useIsFocused, useRouter } from "expo-router";
import { useEffect, useEffectEvent, useState } from "react";
import { StyleSheet } from "react-native";

import {
  Page,
  PageContent,
  PageScrollView,
  pageContentStyle,
} from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { IconButton } from "@/shared/components/icon-button";
import { supportHref } from "@/features/support";

import { BottomContentSpacer } from "@/shared/components/bottom-content-inset";
import { ListContinuation } from "@/shared/components/list-continuation";
import { Button } from "@/shared/components/button";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { EmptyState } from "@/shared/components/state-card";
import { ScreenState } from "@/shared/components/screen-state";
import { ListSeparator } from "@/shared/components/list-separator";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { useInboxQueries } from "../api/use-inbox-queries";
import type { InboxOwner, InboxQueries } from "../api/inbox-queries";
import { createReadNotificationOptions } from "../api/inbox-mutations";
import { expireInbox, notificationExpiry } from "../state/inbox-expiry";
import { NotificationItem } from "../components/notification-item";
import { NotificationLoading } from "../components/notification-loading";
import {
  AccountRecovery,
  AccountSessionFeedback,
} from "@/features/accounts/current-account";
import { useSportingNavigation } from "@/features/sporting/navigation";

/** Matching-account readiness scopes private inbox data without delaying permitted public navigation. */
export function NotificationsScreen() {
  const authority = useInboxQueries();
  const { account, session } = authority;
  const authenticated = session.status === "authenticated";
  const pending =
    session.status === "restoring" ||
    session.status === "authenticating" ||
    session.status === "signing-out" ||
    (authenticated && account.isLoading && !hasReadError(account));
  const FeedbackLayout = pending ? PageContent : ScreenState;
  let feedback = (
    <AccountRecovery error={account.error}>
      <ReadFeedback query={account} loadingContent={<NotificationLoading />} />
    </AccountRecovery>
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
      <Page edges={["top", "left", "right"]} header={<NotificationsHeader />}>
        <PageScrollView>
          <FeedbackLayout>{feedback}</FeedbackLayout>
        </PageScrollView>
      </Page>
    );
  }
  return (
    <Inbox
      key={`${authority.owner.subject}:${authority.owner.accountId}`}
      owner={authority.owner}
      queries={authority.queries}
    />
  );
}

function NotificationsHeader() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <PageHeader
      title="Notifications"
      back={false}
      action={
        <IconButton
          label="Signaler un problème"
          onPress={() => router.push(supportHref({ screen: "notifications" }))}
        >
          <Flag
            accessible={false}
            size={tokens.size.icon.lg}
            color={colors.icon}
          />
        </IconButton>
      }
    />
  );
}

/** Native growing list with a fully named, one-line page title; read and match navigation settle independently in their existing owners. */
function Inbox({
  owner,
  queries,
}: Readonly<{
  owner: InboxOwner;
  queries: InboxQueries;
}>) {
  const client = useQueryClient();
  const focused = useIsFocused();
  const query = useInfiniteQuery({
    ...queries.inbox,
    enabled: (state) => focused && state.state.status !== "error",
  });
  const continuationFailed = !!query.data && query.isFetchNextPageError;
  const command = useMutation(
    createReadNotificationOptions(client, owner, queries),
  );
  const sporting = useSportingNavigation();
  const navigation = useNavigation();
  const feedback = useActionFeedback();
  // Cached rows pass the opening cutoff before effects; ordinary focus/resume events clean retained pages.
  const [openedAt] = useState(Date.now);
  const rows =
    hasReadError(query) && !continuationFailed
      ? []
      : (query.data?.pages ?? [])
          .flatMap((page) => page.notifications)
          .filter((row) => notificationExpiry(row) > openedAt);
  /** Opening filters retained ages; the enabled infinite query owns current list reads. */
  const open = useEffectEvent(() => {
    expireInbox(client, queries);
  });
  useEffect(() => {
    if (navigation.isFocused()) {
      open();
    }
    return navigation.addListener("focus", () => open());
  }, [navigation]);

  /** Full reads keep their scoped card after failure; Query retains the authorized pages. */
  async function refresh() {
    feedback.clear();
    expireInbox(client, queries);
    await query.refetch();
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
    expireInbox(client, queries);
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
    sporting.navigate("match", matchId, reportFailure);
  }

  /** Presents the list's empty state without changing Query ownership or starting reads. */
  function emptyContent() {
    if (continuationFailed || query.isFetchingNextPage) {
      return null;
    }
    if (hasReadError(query)) {
      return (
        <ScreenState>
          <ReadFeedback
            query={query}
            onRetry={refresh}
            loadingContent={<NotificationLoading />}
          />
        </ScreenState>
      );
    }
    if (query.isLoading) {
      return (
        <PageContent>
          <NotificationLoading />
        </PageContent>
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
    return null;
  }

  return (
    <Page edges={["top", "left", "right"]} header={<NotificationsHeader />}>
      <PageFlatList
        alwaysBounceVertical={rows.length > 0}
        data={rows}
        onEndReached={() => {
          if (!query.isError) {
            void loadMore();
          }
        }}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={ListSeparator}
        contentContainerStyle={
          rows.length || continuationFailed || query.isFetchingNextPage
            ? pageContentStyle
            : styles.empty
        }
        refreshControl={
          // Android wraps the scroller here; keep its native ref stable through loading and errors.
          <DataRefreshControl
            onRefresh={refresh}
            enabled={rows.length > 0}
            fetching={query.isFetching}
          />
        }
        ListEmptyComponent={emptyContent() ?? undefined}
        ListFooterComponent={
          <>
            <ListContinuation
              loading={query.isFetchingNextPage}
              failed={continuationFailed}
              disabled={query.isFetching}
              onRetry={() => void loadMore()}
            />
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
  empty: { flexGrow: 1 },
});
