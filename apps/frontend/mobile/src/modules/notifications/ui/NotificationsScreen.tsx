import React, {useCallback, useMemo, useState} from "react";
import {ActivityIndicator, RefreshControl, StyleSheet, View,} from "react-native";
import * as Haptics from "expo-haptics";
import {Href, router} from "expo-router";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {useNotifications} from "@/src/hooks/notification/useNotifications";
import NotificationItem from "@/src/components/notifications/NotificationItem";
import ErrorState from "@/src/shared/ui/feedback/ErrorState";
import EmptyState from "@/src/shared/ui/feedback/EmptyState";
import NotificationsHeader from "@/src/components/notifications/NotificationsHeader";
import {BOTTOM_TABBAR_HEIGHT} from "@/src/shared/theme/tokens";
import {EnrichedUserNotification} from "@/src/types/Notification";
import {useDeleteNotification} from "@/src/hooks/notification/useDeleteNotification";
import NotificationsSkeleton from "@/src/components/notifications/NotificationsSkeleton";
import {FlashList} from "@shopify/flash-list";

const PAGE_SIZE = 20;

const NotificationsScreen: React.FC = () => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const {mutateAsync: deleteNotif} = useDeleteNotification(PAGE_SIZE);

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
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleDelete = useCallback(async (n: EnrichedUserNotification) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await deleteNotif(n.id);
  }, [deleteNotif]);

  const handleOpen = useCallback(async (n: EnrichedUserNotification) => {
    await Haptics.selectionAsync();
    if (n.deepLink) router.push(n.deepLink as Href);
  }, []);

  const contentPadding = useMemo(
    () => ({paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT + 12}),
    [insets.bottom]
  );

  let body: React.ReactNode;

  if (isLoading) {
    body = (
      <NotificationsSkeleton/>
    );
  } else if (isError) {
    body = (
      <ErrorState
        subtitle="Impossible de charger les notifications."
        onRetry={refetch}
        paddingTop="40%"
      />
    );
  } else {
    const hasData = items.length > 0;
    body = (
      <FlashList
        data={items}
        keyExtractor={(n) => String(n.id)}
        renderItem={({item}) => (
          <NotificationItem
            notification={item}
            onOpen={handleOpen}
            onDelete={handleDelete}
          />
        )}
        contentContainerStyle={[{paddingBottom: contentPadding.paddingBottom}]}
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
        ListEmptyComponent={() => (
          <EmptyState
            title="Aucune notification"
            subtitle="Vous n’avez pas encore reçu de notification."
            paddingTop="40%"
            onRetry={refetch}
          />
        )}
        ListFooterComponent={
          isFetchingNextPage && hasNextPage
            ? <ActivityIndicator style={styles.footerLoader}/>
            : null
        }
        testID="notifications-list"
      />
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <NotificationsHeader/>
      {body}
    </View>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: {flex: 1},
  center: {flex: 1, justifyContent: "center", alignItems: "center"},
  footerLoader: {marginBottom: 20},
});
