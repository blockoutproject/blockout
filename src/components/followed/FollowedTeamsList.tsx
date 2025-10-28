import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { useFollowedTeamList } from "@/src/hooks/team/useFollowedTeamList";
import FollowedTeamCard from "./FollowedTeamCard";
import { BOTTOM_TABBAR_HEIGHT } from "@/src/theme/globals";
import EmptyState from "@/src/components/common/feedback/EmptyState";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import FollowedListSkeleton from "./FollowedListSkeleton";

type Props = {
    teamIds?: number[];
};

const FollowedTeamsList: React.FC<Props> = ({ teamIds }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { teams, isLoading, isError, refetch } = useFollowedTeamList(teamIds);

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

    const handlePressTeam = useCallback(
        async (id: number) => {
            await Haptics.selectionAsync();
            router.push(`/team/${id}`);
        },
        [router]
    );

    const ListFooterComponent = useMemo(() => {
        return <View style={{ height: insets.bottom + BOTTOM_TABBAR_HEIGHT + 4 }} />;
    }, [insets.bottom]);

    if (isLoading) {
        return (
            <FollowedListSkeleton />
        );
    }

    if (isError) {
        return (
            <ErrorState
                subtitle="Impossible de charger vos équipes suivies."
                onRetry={refetch}
                paddingTop="30%"
            />
        );
    }

    const data = teams ?? [];
    const hasData = data.length > 0;

    return (
        <FlatList
            data={data}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
                <FollowedTeamCard team={item} onPress={() => handlePressTeam(item.id)} />
            )}
            ListFooterComponent={ListFooterComponent}
            ListEmptyComponent={() => (
                <EmptyState
                    title="Aucune équipe suivie"
                    subtitle="Commence par suivre une équipe pour la retrouver ici !"
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
            testID="followed-teams-flatlist"
        />
    );
};

export default FollowedTeamsList;

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
});