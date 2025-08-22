import React, { useCallback, useRef } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useRoute } from "@react-navigation/native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useEnrichedMatchById } from "@/src/hooks/match/useEnrichedMatchById";
import MatchSkeleton from "@/src/components/match/components/MatchSkeleton";
import MatchScoreCard from "@/src/components/match/components/MatchScoreCard";
import MatchScoreDetailsCard from "@/src/components/match/components/MatchScoreDetailsCard";
import MatchInfoCard from "@/src/components/match/components/MatchInfoCard";
import { SheetStackParamList } from "@/src/components/common/BottomSheetNavigator";
import { getTeamsRankingColor } from "@/src/utils/utils";
import ErrorState from "@/src/components/common/ErrorState";
import MatchHeader from "@/src/components/match/components/MatchHeader";
import ReportForm from "../report/ReportForm";
import { ReportType } from "@/src/types/Report";
import BottomSheetCustomModal from "../common/BottomSheetCustomModal";
import * as Haptics from "expo-haptics";
import RankingCard from "../ranking/RankingCard";
import { ScrollView } from "react-native-gesture-handler";
import { HEADER_HEIGHT } from "@/src/theme/globals";


type MatchRouteProp = RouteProp<SheetStackParamList, "Match">;

type MatchScreenProps = {
    onCloseSheet: () => void;
};

const MatchScreen: React.FC<MatchScreenProps> = ({ onCloseSheet }) => {
    const { params } = useRoute<MatchRouteProp>();
    const matchId = params.matchId;
    const { data: enrichedMatch, isLoading, error, refetch } = useEnrichedMatchById(matchId);
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    const reportSheetRef = useRef<BottomSheetModal>(null);
    const [ isRefreshing, setIsRefreshing ] = React.useState(false);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await refetch();
        setIsRefreshing(false);
    }, [refetch]);

    let body: React.ReactNode;

    if (isLoading) {
        body = <MatchSkeleton />;
    } else if (error) {
        body = <ErrorState message="Impossible de charger ce match." onRetry={refetch} />;
    } else if (!enrichedMatch) {
        body = <ErrorState message="Ce match est introuvable." onRetry={refetch} />;
    } else {
        const division = enrichedMatch.pool.division;
        const gradient: readonly [string, string, ...string[]] = [
            division.firstGradientColor,
            division.secondGradientColor,
            division.thirdGradientColor,
        ];

        body = (
            <ScrollView
                scrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    { backgroundColor: theme.background, paddingBottom: insets.bottom + HEADER_HEIGHT },
                ]}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
                }
            >
                <MatchScoreCard enrichedMatch={enrichedMatch} gradient={gradient} />
                <MatchScoreDetailsCard enrichedMatch={enrichedMatch} />
                <MatchInfoCard enrichedMatch={enrichedMatch} />
                <RankingCard
                    enrichedPool={enrichedMatch.pool}
                    scrollable={false}
                    highlightTeams={getTeamsRankingColor(theme, {
                        teamA: enrichedMatch.teamA,
                        teamB: enrichedMatch.teamB,
                        set: enrichedMatch.set,
                        highlightColor: enrichedMatch.pool.division.mainColor,
                    })}
                />
            </ScrollView>
        );
    }

    return (
        <View style={{ backgroundColor: theme.background }}>
            <MatchHeader
                onCloseSheet={onCloseSheet}
                onOpenReport={() => reportSheetRef.current?.present()}
            />
            {body}

            <BottomSheetCustomModal
                ref={reportSheetRef}
                snapPoint={"90%"}
            >
                <ReportForm
                    context={{
                        screen: "Match",
                        defaultType: ReportType.DISPLAY_BUG,
                    }}
                    onSuccess={() => {
                        reportSheetRef.current?.dismiss();
                    }}
                />
            </BottomSheetCustomModal>
        </View>
    );
};

export default MatchScreen;

const styles = StyleSheet.create({
    scrollContent: {
        gap: 20,
        paddingHorizontal: 4,
    },
});