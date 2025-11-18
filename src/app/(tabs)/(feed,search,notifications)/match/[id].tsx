import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    RefreshControl,
    StyleSheet,
    View,
    Animated,
    ScrollView,
    AppState,
    AppStateStatus,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useEnrichedMatchById } from "@/src/hooks/match/useEnrichedMatchById";

import MatchSkeleton from "@/src/components/match/MatchSkeleton";
import MatchScoreCard from "@/src/components/match/MatchScoreCard";
import MatchScoreDetailsCard from "@/src/components/match/MatchScoreDetailsCard";
import MatchInfoCard from "@/src/components/match/MatchInfoCard";
import RankingCard from "@/src/components/ranking/RankingCard";
import MatchHeader from "@/src/components/match/MatchHeader";
import ErrorState from "@/src/components/common/feedback/ErrorState";
import FadeIn from "@/src/components/common/animations/FadeIn";

import { ReportType } from "@/src/types/Report";
import { getTeamsRankingColor, splitIsoDateFormatted } from "@/src/utils/utils";
import {
    BOTTOM_TABBAR_HEIGHT,
    HEADER_HEIGHT,
    SECTION_SEPARATOR_HEIGHT,
} from "@/src/theme/globals";
import ReportFormSheet from "@/src/components/report/ReportFormSheet";
import MatchLiveLinkCard from "@/src/components/match/MatchLiveLinkCard";
import useHasScopes from "@/src/hooks/user/useHasScopes";

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const MatchScreen: React.FC = () => {
    const { id } = useLocalSearchParams();
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    const { data: enrichedMatch, isLoading, error, refetch } =
        useEnrichedMatchById(Number(id));

    const { allowed: canCreateLiveLinkScope } = useHasScopes(["create:match_live_link"]);
    const { allowed: canDeleteLiveLinkScope } = useHasScopes(["delete:match_live_link"]);
    const { allowed: canReportLiveLinkScope } = useHasScopes(["report:match_live_link"]);

    const reportSheetRef = useRef<BottomSheetModal>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const scrollY = useRef(new Animated.Value(0)).current;

    const isFocused = useIsFocused();
    const appState = useRef<AppStateStatus>(AppState.currentState);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
        await refetch();
        setIsRefreshing(false);
    }, [refetch]);

    const handleOpenReport = useCallback(() => {
        reportSheetRef.current?.present();
    }, []);

    useFocusEffect(
        useCallback(() => {
            refetch();
            return undefined;
        }, [refetch]),
    );

    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextState) => {
            const wasInBackground =
                appState.current.match(/inactive|background/) &&
                nextState === "active";

            if (wasInBackground && isFocused) {
                refetch();
            }

            appState.current = nextState;
        });

        return () => {
            subscription.remove();
        };
    }, [isFocused, refetch]);

    const gradient = useMemo<readonly [string, string, ...string[]]>(() => {
        if (!enrichedMatch) {
            return [theme.background, theme.background];
        }
        const d = enrichedMatch.pool.division;
        return [
            d.firstGradientColor,
            d.secondGradientColor,
            d.thirdGradientColor,
        ] as const;
    }, [enrichedMatch, theme]);

    const timeText = useMemo(() => {
        if (!enrichedMatch) {
            return null;
        }
        return splitIsoDateFormatted(enrichedMatch.matchDate).time ?? null;
    }, [enrichedMatch]);

    const highlightTeams = useMemo(() => {
        if (!enrichedMatch) {
            return [];
        }
        const division = enrichedMatch.pool.division;
        return getTeamsRankingColor(theme, {
            teamA: enrichedMatch.teamA,
            teamB: enrichedMatch.teamB,
            set: enrichedMatch.set,
            highlightColor: division.mainColor,
        });
    }, [enrichedMatch, theme]);

    const scoreCard = useMemo(() => {
        if (!enrichedMatch) {
            return null;
        }
        return (
            <MatchScoreCard
                enrichedMatch={enrichedMatch}
                gradient={gradient}
            />
        );
    }, [enrichedMatch, gradient]);

    const detailsCard = useMemo(() => {
        if (!enrichedMatch) {
            return null;
        }
        return <MatchScoreDetailsCard enrichedMatch={enrichedMatch} />;
    }, [enrichedMatch]);

    const liveLinkCard = useMemo(() => {
        if (!enrichedMatch) {
            return null;
        }

        const hasLiveLink = !!enrichedMatch.liveUrl;
        const isFinished = enrichedMatch.status === "FINISHED";
        const isFinalLocked = !!enrichedMatch.liveEditLocked;

        const canCreateLiveLink =
            !hasLiveLink &&
            canCreateLiveLinkScope &&
            (!isFinished || !isFinalLocked);

        // Cas "rediff retirée" : match terminé, verrouillé, plus de lien
        const showRemovedWarning =
            !hasLiveLink && isFinished && isFinalLocked;

        const shouldShowCard =
            hasLiveLink || canCreateLiveLink || showRemovedWarning;

        if (!shouldShowCard) {
            return null;
        }

        return (
            <MatchLiveLinkCard
                enrichedMatch={enrichedMatch}
                gradient={gradient}
                refetch={refetch}
                canCreateLiveLinkScope={canCreateLiveLinkScope}
                canDeleteLiveLinkScope={canDeleteLiveLinkScope}
                canReportLiveLinkScope={canReportLiveLinkScope}
                onOpenSupport={handleOpenReport}
            />
        );
    }, [
        enrichedMatch,
        gradient,
        canCreateLiveLinkScope,
        canDeleteLiveLinkScope,
        canReportLiveLinkScope,
        refetch,
    ]);

    const infoCard = useMemo(() => {
        if (!enrichedMatch) {
            return null;
        }
        return <MatchInfoCard enrichedMatch={enrichedMatch} />;
    }, [enrichedMatch]);

    const rankingCard = useMemo(() => {
        if (!enrichedMatch) {
            return null;
        }
        return (
            <RankingCard
                enrichedPool={enrichedMatch.pool}
                scrollable={false}
                highlightTeams={highlightTeams}
            />
        );
    }, [enrichedMatch, highlightTeams]);

    let body: React.ReactNode;

    if (isLoading) {
        body = <MatchSkeleton />;
    } else if (error) {
        body = (
            <ErrorState
                subtitle="Impossible de charger ce match."
                onRetry={refetch}
                paddingTop={"50%"}
            />
        );
    } else if (!enrichedMatch) {
        body = (
            <ErrorState
                subtitle="Ce match est introuvable."
                onRetry={refetch}
                paddingTop={"50%"}
            />
        );
    } else {
        body = (
            <AnimatedScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: insets.top + HEADER_HEIGHT,
                        paddingBottom:
                            insets.bottom +
                            BOTTOM_TABBAR_HEIGHT +
                            SECTION_SEPARATOR_HEIGHT +
                            4,
                    },
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        progressViewOffset={insets.top + HEADER_HEIGHT}
                        tintColor={theme.text}
                    />
                }
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true },
                )}
                scrollEventThrottle={16}
                testID="match-scroll"
            >
                {scoreCard && (
                    <FadeIn appearIndex={0}>{scoreCard}</FadeIn>
                )}

                {detailsCard && (
                    <FadeIn appearIndex={1}>{detailsCard}</FadeIn>
                )}

                {liveLinkCard && (
                    <FadeIn appearIndex={2}>{liveLinkCard}</FadeIn>
                )}

                {infoCard && (
                    <FadeIn appearIndex={3}>{infoCard}</FadeIn>
                )}

                {rankingCard && (
                    <FadeIn appearIndex={4}>{rankingCard}</FadeIn>
                )}
            </AnimatedScrollView>
        );

        return (
            <View
                style={[
                    {
                        backgroundColor: theme.background,
                        flex: 1,
                    },
                ]}
                testID="match-screen"
            >
                <MatchHeader
                    scrollY={scrollY}
                    onOpenReport={handleOpenReport}
                    headerContent={{
                        teamALogo: enrichedMatch.teamA.logoUrl,
                        teamBLogo: enrichedMatch.teamB.logoUrl,
                        scoreText: enrichedMatch.set ?? null,
                        timeText,
                        poolCode: enrichedMatch.pool.poolCode,
                        leagueCode: enrichedMatch.pool.leagueCode,
                        season: enrichedMatch.pool.season,
                    }}
                    headerGradient={gradient}
                />

                {body}

                <ReportFormSheet
                    ref={reportSheetRef}
                    context={{
                        screen: "Match",
                        defaultType: ReportType.DISPLAY_BUG,
                    }}
                    onSuccess={() => {
                        reportSheetRef.current?.dismiss();
                    }}
                    snapPoint="90%"
                    footerLabel="Envoyer"
                />
            </View>
        );
    }

    return (
        <View
            style={[
                {
                    backgroundColor: theme.background,
                    flex: 1,
                },
            ]}
        >
            {body}
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