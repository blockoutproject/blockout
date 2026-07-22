import { FlashList, ListRenderItemInfo } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { Href, router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDeleteNotification } from "@/src/modules/notifications/hooks/useDeleteNotification";
import { useNotifications } from "@/src/modules/notifications/hooks/useNotifications";
import { NotificationResponse } from "@/src/shared/generated/models";
import NotificationItem from "@/src/modules/notifications/ui/NotificationItem";
import NotificationsHeader from "@/src/modules/notifications/ui/NotificationsHeader";
import NotificationsSkeleton from "@/src/modules/notifications/ui/NotificationsSkeleton";
import { useAppTheme } from "@/src/shared/providers/ThemeProvider";
import { BOTTOM_TABBAR_HEIGHT } from "@/src/shared/theme/tokens";
import EmptyState from "@/src/shared/ui/feedback/EmptyState";
import ErrorState from "@/src/shared/ui/feedback/ErrorState";

const PAGE_SIZE = 20;

const NotificationsScreen: React.FC = () => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { mutateAsync: deleteNotif } = useDeleteNotification(PAGE_SIZE);

  const {
    items,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useNotifications(PAGE_SIZE);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleDelete = useCallback(
    async (notification: NotificationResponse) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await deleteNotif(notification.id);
    },
    [deleteNotif],
  );

  const handleOpen = useCallback(
    async (notification: NotificationResponse) => {
      await Haptics.selectionAsync();
      if (notification.deepLink) router.push(notification.deepLink as Href);
    },
    [],
  );

  const renderNotification = useCallback(
    ({ item }: ListRenderItemInfo<NotificationResponse>) => (
      <NotificationItem
        notification={item}
        onOpen={handleOpen}
        onDelete={handleDelete}
      />
    ),
    [handleDelete, handleOpen],
  );

  const contentPadding = useMemo(
    () => ({ paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT + 12 }),
    [insets.bottom],
  );

  let body: React.ReactNode;

  if (isLoading) {
    body = <NotificationsSkeleton />;
  } else if (isError) {
    body = (
      <ErrorState
        subtitle="Impossible de charger les notifications."
        onRetry={refetch}
        paddingTop="40%"
        testID="notifications-error"
        retryTestID="notifications-retry-action"
      />
    );
  } else {
    const hasData = items.length > 0;
    body = (
      <FlashList
        data={items}
        keyExtractor={(n) => String(n.id)}
        renderItem={renderNotification}
        contentContainerStyle={contentPadding}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.5}
        onEndReached={hasData ? handleLoadMore : undefined}
        scrollEnabled={hasData}
        bounces={hasData}
        overScrollMode={hasData ? "auto" : "never"}
        refreshControl={
          hasData ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.text}
              progressViewOffset={100}
            />
          ) : undefined
        }
        ListEmptyComponent={
          <EmptyState
            title="Aucune notification"
            subtitle="Vous n’avez pas encore reçu de notification."
            paddingTop="40%"
            onRetry={refetch}
            testID="notifications-empty"
            retryTestID="notifications-empty-retry-action"
          />
        }
        ListFooterComponent={
          isFetchingNextPage && hasNextPage ? (
            <ActivityIndicator style={styles.footerLoader} />
          ) : null
        }
        testID="notifications-list"
      />
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      testID="notifications-screen"
    >
      <NotificationsHeader />
      {body}
    </View>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  footerLoader: { marginBottom: 20 },
});
