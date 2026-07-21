import React, {useCallback, useEffect, useMemo, useRef, useState,} from "react";
import {Animated, AppState, AppStateStatus, RefreshControl, ScrollView, StyleSheet, View,} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {BottomSheetModal} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import {useLocalSearchParams} from "expo-router";
import {useFocusEffect, useIsFocused} from "@react-navigation/native";

import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {useEnrichedMatchById} from "@/src/hooks/match/useEnrichedMatchById";

import MatchSkeleton from "@/src/components/match/MatchSkeleton";
import MatchScoreCard from "@/src/components/match/MatchScoreCard";
import MatchScoreDetailsCard from "@/src/components/match/MatchScoreDetailsCard";
import MatchInfoCard from "@/src/components/match/MatchInfoCard";
import RankingCard from "@/src/components/ranking/RankingCard";
import MatchHeader from "@/src/components/match/MatchHeader";
import ErrorState from "@/src/shared/ui/feedback/ErrorState";
import FadeIn from "@/src/shared/ui/animations/FadeIn";

import {ReportType} from "@/src/types/Report";
import {getTeamsRankingColor, isLNV, splitIsoDateFormatted} from "@/src/utils/utils";
import {BOTTOM_TABBAR_HEIGHT, HEADER_HEIGHT, SECTION_SEPARATOR_HEIGHT,} from "@/src/shared/theme/globals";
import ReportFormSheet from "@/src/components/report/ReportFormSheet";
import MatchLiveLinkCard from "@/src/components/match/MatchLiveLinkCard";
import useHasScopes from "@/src/hooks/user/useHasScopes";
import GuestPromptSheet, {GuestPromptSheetRef} from "@/src/components/user/GuestPromptSheet.tsx";
import {useSession} from "@/src/shared/providers/SessionProvider";

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const MatchScreen: React.FC = () => {
  const {id} = useLocalSearchParams();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const {isGuest} = useSession()

  const {data: enrichedMatch, isLoading, error, refetch} =
    useEnrichedMatchById(Number(id));

  const {allowed: canCreateLiveLinkScope} = useHasScopes(["create:match_live_link"]);

  const reportSheetRef = useRef<BottomSheetModal>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const isFocused = useIsFocused();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const guestSheetRef = useRef<GuestPromptSheetRef>(null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
    });
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleOpenReport = useCallback(() => {
    reportSheetRef.current?.present();
  }, []);

  const handleRequireAuthForLiveLink = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {
    });
    guestSheetRef.current?.present();
  }, []);

  useEffect(() => {
    if (!isGuest) {
      guestSheetRef.current?.dismiss();
    }
  }, [isGuest]);

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
    return <MatchScoreDetailsCard enrichedMatch={enrichedMatch}/>;
  }, [enrichedMatch]);

  // const adCard = useMemo(() => {
  //     if (!enrichedMatch) {
  //         return null;
  //     }

  //     return (
  //         <MatchAdCard />
  //     );
  // }, [enrichedMatch, gradient]);

  const liveLinkCard = useMemo(() => {
    if (!enrichedMatch || isLNV(enrichedMatch.pool.leagueCode)) {
      return null;
    }

    const hasLiveLink = !!enrichedMatch.liveUrl;

    const shouldShowCard =
      hasLiveLink || canCreateLiveLinkScope;

    if (!shouldShowCard) {
      return null;
    }

    return (
      <MatchLiveLinkCard
        enrichedMatch={enrichedMatch}
        gradient={gradient}
        refetch={refetch}
        onRequireAuth={handleRequireAuthForLiveLink}
      />
    );
  }, [
    enrichedMatch,
    gradient,
    canCreateLiveLinkScope,
    refetch,
    handleOpenReport,
    handleRequireAuthForLiveLink,
  ]);

  const infoCard = useMemo(() => {
    if (!enrichedMatch) {
      return null;
    }
    return <MatchInfoCard enrichedMatch={enrichedMatch}/>;
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
    body = <MatchSkeleton/>;
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
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: true},
        )}
        scrollEventThrottle={16}
        testID="match-scroll"
      >
        {!!scoreCard && <FadeIn appearIndex={0}>{scoreCard}</FadeIn>}

        {!!liveLinkCard && <FadeIn appearIndex={1}>{liveLinkCard}</FadeIn>}

        {!!detailsCard && <FadeIn appearIndex={2}>{detailsCard}</FadeIn>}

        {!!infoCard && <FadeIn appearIndex={3}>{infoCard}</FadeIn>}

        {/* {adCard && (
                    <FadeIn appearIndex={4}>{adCard}</FadeIn>
                )} */}

        {!!rankingCard && <FadeIn appearIndex={5}>{rankingCard}</FadeIn>}
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
            screen: `Match#${enrichedMatch.id}#${enrichedMatch.teamA.name}/${enrichedMatch.teamB.name}`,
            defaultType: ReportType.DISPLAY_BUG,
          }}
          onSuccess={() => {
            reportSheetRef.current?.dismiss();
          }}
          snapPoint="90%"
          footerLabel="Envoyer"
        />

        <GuestPromptSheet ref={guestSheetRef}/>
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
