import React, { useCallback, useMemo, useRef } from "react";
import { ActivityIndicator, FlatList, Keyboard, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { BOTTOM_TABBAR_HEIGHT } from "@/src/theme/globals";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import TeamCard from "@/src/components/teamList/TeamListCard";
import TeamListHeader from "@/src/components/teamList/TeamListHeader";
import ReportFormSheet from "@/src/components/report/ReportFormSheet";
import { ReportType } from "@/src/types/Report";
import { TeamSummaryDTO } from "@/src/types/Team";
import { useTeamListByCLubId } from "@/src/hooks/team/useTeamListByClubId";

const TeamListScreen: React.FC = () => {
    const theme = useAppTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { clubId } = useLocalSearchParams();
    const { data, isLoading, isError, refetch } = useTeamListByCLubId(String(clubId));
    
    const reportSheetRef = useRef<BottomSheetModal>(null);
    const handleOpenReport = useCallback(() => {
        reportSheetRef.current?.present();
    }, []);

    const handlePress = useCallback((id: number) => {
        Haptics.selectionAsync();
        router.push(`/team/${id}`);
    }, [router]);

    const renderItem = useCallback(
        ({ item }: { item: TeamSummaryDTO }) => (
            <TeamCard
                team={item}
                onPress={() => handlePress(item.id)}
                testID={`team-card-${item.id}`}
            />
        ),
        [handlePress]
    );

    const body = useMemo(() => {
        if (isLoading) {
            return (
                <ActivityIndicator
                    size="small"
                    color={theme.text}
                    style={styles.loader}
                    testID="team-list-loader"
                />
            );
        }

        if (isError) {
            return (
                <ErrorState
                    subtitle="Impossible de charger les équipes."
                    onRetry={refetch}
                    paddingTop={"40%"}
                />
            );
        }

        if (!data || data.length === 0) {
            return (
                <ErrorState
                    subtitle="Aucune équipe trouvée pour ce club."
                    onRetry={refetch}
                    paddingTop={"30%"}
                />
            );
        }

        return (
            <FlatList
                data={data}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
                contentContainerStyle={{
                    paddingHorizontal: 8,
                    paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT,
                }}
                scrollEnabled={data.length > 0}
                testID="team-list"
            />
        );
    }, [isLoading, isError, data, refetch, renderItem, insets.bottom, theme.text]);

    return (
        <View
            style={[styles.container, { backgroundColor: theme.background }]}
            testID="team-list-screen"
        >
            <TeamListHeader
                title="Équipes"
                onOpenReport={handleOpenReport}
            />

            {body}

            <ReportFormSheet
                ref={reportSheetRef}
                context={{ screen: "TeamList", defaultType: ReportType.DISPLAY_BUG }}
                onSuccess={() => {
                    reportSheetRef.current?.dismiss();
                }}
                snapPoint="90%"
                footerLabel="Envoyer"
            />
        </View>
    );
};

export default TeamListScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
    loader: { marginTop: 8 },
});