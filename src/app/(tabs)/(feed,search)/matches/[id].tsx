import React, { useCallback, useRef } from "react";
import { RefreshControl, StyleSheet, View, Animated, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useEnrichedMatchById } from "@/src/hooks/match/useEnrichedMatchById";
import MatchSkeleton from "@/src/components/match/components/MatchSkeleton";
import MatchScoreCard from "@/src/components/match/components/MatchScoreCard";
import MatchScoreDetailsCard from "@/src/components/match/components/MatchScoreDetailsCard";
import MatchInfoCard from "@/src/components/match/components/MatchInfoCard";
import { getTeamsRankingColor, splitIsoDateFormatted } from "@/src/utils/utils";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import MatchHeader from "@/src/components/match/components/MatchHeader";
import { ReportType } from "@/src/types/Report";
import * as Haptics from "expo-haptics";
import { BOTTOM_TABBAR_HEIGHT, HEADER_HEIGHT, SECTION_SEPARATOR_HEIGHT } from "@/src/theme/globals";
import RankingCard from "@/src/components/ranking/RankingCard";
import BottomSheetCustomModal from "@/src/components/common/BottomSheetCustomModal";
import ReportForm from "@/src/components/report/ReportForm";
import { useLocalSearchParams } from "expo-router";
import FadeIn from "@/src/components/animations/FadeIn";

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const MatchScreen: React.FC = () => {
    const { id } = useLocalSearchParams();

    const { data: enrichedMatch, isLoading, error, refetch } = useEnrichedMatchById(Number(id));
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    const reportSheetRef = useRef<BottomSheetModal>(null);
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    const scrollY = React.useRef(new Animated.Value(0)).current;

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
        body = <ErrorState subtitle="Impossible de charger ce match." onRetry={refetch} paddingTop={"50%"} />;
    } else if (!enrichedMatch) {
        body = <ErrorState subtitle="Ce match est introuvable." onRetry={refetch} paddingTop={"50%"} />;
    } else {
        const division = enrichedMatch.pool.division;
        const gradient: readonly [string, string, ...string[]] = [
            division.firstGradientColor,
            division.secondGradientColor,
            division.thirdGradientColor,
        ];

        const { time } = splitIsoDateFormatted(enrichedMatch.matchDate);

        body = (
            <AnimatedScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        backgroundColor: theme.background,
                        paddingTop: insets.top + HEADER_HEIGHT,
                        paddingBottom: insets.bottom + BOTTOM_TABBAR_HEIGHT + SECTION_SEPARATOR_HEIGHT,
                    },
                ]}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                    useNativeDriver: true,
                })}
                scrollEventThrottle={16}
            >
                <FadeIn appearIndex={0}>
                    <MatchScoreCard enrichedMatch={enrichedMatch} gradient={gradient} />
                </FadeIn>

                <FadeIn appearIndex={1}>
                    <MatchScoreDetailsCard enrichedMatch={enrichedMatch} />
                </FadeIn>

                <FadeIn appearIndex={2}>
                    <MatchInfoCard enrichedMatch={enrichedMatch} />
                </FadeIn>

                <FadeIn appearIndex={3}>
                    <RankingCard
                        enrichedPool={enrichedMatch.pool}
                        scrollable={false}
                        highlightTeams={getTeamsRankingColor(theme, {
                            teamA: enrichedMatch.teamA,
                            teamB: enrichedMatch.teamB,
                            set: enrichedMatch.set,
                            highlightColor: division.mainColor,
                        })}
                    />
                </FadeIn>
            </AnimatedScrollView>
        );

        return (
            <View style={{ backgroundColor: theme.background, flex: 1 }}>
                <MatchHeader
                    scrollY={scrollY}
                    onOpenReport={() => reportSheetRef.current?.present()}
                    headerContent={{
                        teamALogo: enrichedMatch.teamA.logoUrl,
                        teamBLogo: enrichedMatch.teamB.logoUrl,
                        scoreText: enrichedMatch.set ?? null,
                        timeText: time ?? null,
                    }}
                    headerGradient={gradient}
                />

                {body}

                <BottomSheetCustomModal ref={reportSheetRef} snapPoint={"90%"}>
                    <ReportForm
                        context={{ screen: "Match", defaultType: ReportType.DISPLAY_BUG }}
                        onSuccess={() => {
                            reportSheetRef.current?.dismiss();
                        }}
                    />
                </BottomSheetCustomModal>
            </View>
        );
    }

    return <View style={{ backgroundColor: theme.background, flex: 1 }}>{body}</View>;
};

export default MatchScreen;

const styles = StyleSheet.create({
    scrollContent: {
        gap: 20,
        paddingHorizontal: 4,
    },
});