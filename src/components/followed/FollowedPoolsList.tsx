import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { useFollowedPoolList } from "@/src/hooks/pool/useFollowedPoolList";
import FollowedPoolCard from "./FollowedPoolCard";
import { BOTTOM_TABBAR_HEIGHT } from "@/src/theme/globals";
import FollowedListHeader from "./FollowedListHeader";
import { Filter } from "@/src/types/Filter";
import EmptyState from "@/src/components/common/feedback/EmptyState";
import ErrorState from "@/src/components/common/feedback/ErrorState";

type Props = {
    poolIds?: number[];
    headerOffset: number;
    filters: Filter[];
    setFilters: (next: Filter[] | ((prev: Filter[]) => Filter[])) => void;
};

const FollowedPoolsList: React.FC<Props> = ({
    poolIds,
    headerOffset,
    filters,
    setFilters,
}) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const {
        pools,
        isLoading,
        isError,
        refetch
    } = useFollowedPoolList(poolIds);

    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await refetch?.();
        } finally {
            setIsRefreshing(false);
        }
    }, [refetch]);

    const handlePressPool = useCallback(
        async (id: number) => {
            await Haptics.selectionAsync();
            router.push(`/pool/${id}`);
        },
        [router]
    );

    const ListHeaderComponent = useMemo(
        () => (
            <FollowedListHeader
                filters={filters}
                setFilters={setFilters}
                headerOffset={headerOffset}
            />
        ),
        [filters, setFilters, headerOffset]
    );

    const ListFooterComponent = useMemo(() => {
        return <View style={{ height: insets.bottom + BOTTOM_TABBAR_HEIGHT + 4 }} />;
    }, [insets.bottom]);

    if (isLoading) {
        return (
            <View style={[styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.text} />
            </View>
        );
    }

    if (isError) {
        return (
            <ErrorState
                subtitle="Impossible de charger vos poules suivies."
                onRetry={refetch}
                paddingTop="30%"
            />
        );
    }

    const data = pools ?? [];
    const hasData = data.length > 0;

    return (
        <FlatList
            data={data}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
                <FollowedPoolCard pool={item} onPress={() => handlePressPool(item.id)} />
            )}
            ListHeaderComponent={ListHeaderComponent}
            ListFooterComponent={ListFooterComponent}
            ListEmptyComponent={() => (
                <EmptyState
                    title="C'est calme par ici ..."
                    subtitle="Commence par suivre une poule pour la retrouver ici !"
                    onRetry={refetch}
                    
                    retryLabel="Réessayer"
                    paddingTop="10%"
                />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }}
            alwaysBounceVertical
            scrollEventThrottle={16}
            scrollEnabled={hasData}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            progressViewOffset={headerOffset}
            testID="followed-pools-flatlist"
        />
    );
};

export default FollowedPoolsList;

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyContainer: { alignItems: "center", marginTop: 40 },
    emptyText: { fontSize: 14, textAlign: "center" },
});