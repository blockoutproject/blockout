import React, { useState, useMemo, useCallback } from "react";
import {
    View,
    FlatList,
    RefreshControl,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Href, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useNotifications } from "@/src/hooks/notification/useNotifications";
import NotificationItem from "@/src/components/notifications/NotificationItem";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import EmptyState from "@/src/components/common/feedback/EmptyState";
import NotificationsHeader from "@/src/components/notifications/NotificationsHeader";
import { BOTTOM_TABBAR_HEIGHT } from "@/src/theme/globals";
import { EnrichedUserNotification } from "@/src/types/Notification";

const PAGE_SIZE = 20;

const NotificationsContainer: React.FC = () => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

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

    const handleOpen = useCallback(async (n: EnrichedUserNotification) => {
        await Haptics.selectionAsync();
        if (n.deepLink) router.push(n.deepLink as Href);
    }, []);

    const contentPadding = useMemo(
        () => ({ paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT + 12 }),
        [insets.bottom]
    );

    let body: React.ReactNode;

    if (isLoading) {
        body = (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.text} />
            </View>
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
        body = (
            <FlatList
                data={items}
                keyExtractor={(n) => String(n.id)}
                renderItem={({ item }) => (
                    <NotificationItem notification={item} onOpen={handleOpen} />
                )}
                contentContainerStyle={contentPadding}
                showsVerticalScrollIndicator={false}
                onEndReachedThreshold={0.5}
                onEndReached={handleLoadMore}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={theme.text}
                    />
                }
                ListEmptyComponent={() => (
                    <EmptyState
                        title="Aucune notification"
                        subtitle="Vous n’avez pas encore reçu de notification."
                        paddingTop="40%"
                    />
                )}
                ListFooterComponent={
                    isFetchingNextPage && hasNextPage ? (
                        <ActivityIndicator style={{ marginBottom: 20 }} />
                    ) : null
                }
            />
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <NotificationsHeader />
            {body}
        </View>
    );
};

export default NotificationsContainer;

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
});