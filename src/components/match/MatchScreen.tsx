import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useRoute } from "@react-navigation/native";
import { BottomSheetScrollView, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useEnrichedMatchById } from "@/src/hooks/match/useEnrichedMatchById";
import MatchSkeleton from "@/src/components/match/components/MatchSkeleton";
import MatchScoreCard from "@/src/components/match/components/MatchScoreCard";
import MatchScoreDetailsCard from "@/src/components/match/components/MatchScoreDetailsCard";
import MatchInfoCard from "@/src/components/match/components/MatchInfoCard";
import RankingCard from "@/src/components/common/RankingCard";
import { SheetStackParamList } from "@/src/components/common/BottomSheetNavigator";
import { getTeamsRankingColor } from "@/src/utils/utils";
import ErrorState from "@/src/components/common/ErrorState";
import MatchHeader from "@/src/components/match/components/MatchHeader";
import ReportForm from "../report/ReportForm";
import { ReportType } from "@/src/types/Report";
import BottomSheetCustomModal from "../common/BottomSheetCustomModal";


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
            <BottomSheetScrollView
                scrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    { backgroundColor: theme.background, paddingBottom: insets.bottom },
                ]}
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
            </BottomSheetScrollView>
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
                onDismiss={() => reportSheetRef.current?.dismiss()}
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