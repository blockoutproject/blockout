import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  AppState,
  AppStateStatus,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";

import { layout, spacing, useAppTheme } from "@/src/shared/theme";
import { useMatchById } from "@/src/modules/match/hooks/use-match-by-id";

import MatchSkeleton from "@/src/modules/match/ui/match-skeleton";
import MatchScoreCard from "@/src/modules/match/ui/match-score-card";
import MatchScoreDetailsCard from "@/src/modules/match/ui/match-score-details-card";
import MatchInfoCard from "@/src/modules/match/ui/match-info-card";
import RankingCard from "@/src/modules/ranking/ui/ranking-card";
import MatchHeader from "@/src/modules/match/ui/match-header";
import ErrorState from "@/src/shared/ui/feedback/error-state";
import FadeIn from "@/src/shared/ui/animations/fade-in";

import { ReportTypeEnum } from "@/src/shared/generated/models";
import { formatMatchDateTime } from "@/src/modules/match/view-models/match-date";
import { getMatchRankingHighlights } from "@/src/modules/match/view-models/match-ranking-highlight";
import { isLNV } from "@/src/shared/view-models/league";

import ReportFormSheet from "@/src/modules/report/ui/report-form-sheet";
import MatchLiveLinkCard from "@/src/modules/match/ui/match-live-link-card";
import useHasScopes from "@/src/modules/user/hooks/use-has-scopes";
import GuestPromptSheet, {
  GuestPromptSheetRef,
} from "@/src/modules/session/ui/guest-prompt-sheet";
import { useSessionState } from "@/src/modules/session/providers/session-context";

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const MatchScreen: React.FC = () => {
  const { id } = useLocalSearchParams();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { isGuest } = useSessionState();

  const { data: match, isLoading, error, refetch } = useMatchById(Number(id));

  const { allowed: canCreateLiveLinkScope } = useHasScopes([
    "create:match_live_link",
  ]);

  const reportSheetRef = useRef<BottomSheetModal>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const isFocused = useIsFocused();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const guestSheetRef = useRef<GuestPromptSheetRef>(null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => {},
    );
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleOpenReport = useCallback(() => {
    reportSheetRef.current?.present();
  }, []);

  const handleRequireAuthForLiveLink = useCallback(async () => {
    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
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
        appState.current.match(/inactive|background/) && nextState === "active";

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
    if (!match) {
      return [theme.background, theme.background];
    }
    const d = match.pool.division;
    return [
      d.firstGradientColor,
      d.secondGradientColor,
      d.thirdGradientColor,
    ] as const;
  }, [match, theme]);

  const timeText = useMemo(() => {
    if (!match) {
      return null;
    }
    return formatMatchDateTime(match.matchDate).time ?? null;
  }, [match]);

  const highlightTeams = useMemo(() => {
    if (!match) {
      return [];
    }
    const division = match.pool.division;
    return getMatchRankingHighlights(theme, {
      teamA: match.teamA,
      teamB: match.teamB,
      set: match.set ?? null,
      highlightColor: division.mainColor,
    });
  }, [match, theme]);

  const scoreCard = useMemo(() => {
    if (!match) {
      return null;
    }
    return <MatchScoreCard match={match} gradient={gradient} />;
  }, [match, gradient]);

  const detailsCard = useMemo(() => {
    if (!match) {
      return null;
    }
    return <MatchScoreDetailsCard match={match} />;
  }, [match]);

  const liveLinkCard = useMemo(() => {
    if (!match || isLNV(match.pool.leagueCode)) {
      return null;
    }

    const hasLiveLink = !!match.liveUrl;

    const shouldShowCard = hasLiveLink || canCreateLiveLinkScope;

    if (!shouldShowCard) {
      return null;
    }

    return (
      <MatchLiveLinkCard
        match={match}
        gradient={gradient}
        refetch={refetch}
        onRequireAuth={handleRequireAuthForLiveLink}
      />
    );
  }, [
    match,
    gradient,
    canCreateLiveLinkScope,
    refetch,
    handleRequireAuthForLiveLink,
  ]);

  const infoCard = useMemo(() => {
    if (!match) {
      return null;
    }
    return <MatchInfoCard match={match} />;
  }, [match]);

  const rankingCard = useMemo(() => {
    if (!match) {
      return null;
    }
    return <RankingCard pool={match.pool} highlightTeams={highlightTeams} />;
  }, [match, highlightTeams]);

  let body: React.ReactNode;

  if (isLoading) {
    body = <MatchSkeleton />;
  } else if (error) {
    body = (
      <ErrorState
        subtitle="Impossible de charger ce match."
        onRetry={refetch}
        paddingTop={"50%"}
        testID="match-error"
        retryTestID="match-retry-action"
      />
    );
  } else if (!match) {
    body = (
      <ErrorState
        subtitle="Ce match est introuvable."
        onRetry={refetch}
        paddingTop={"50%"}
        testID="match-not-found"
        retryTestID="match-not-found-retry-action"
      />
    );
  } else {
    body = (
      <AnimatedScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + layout.header,
            paddingBottom:
              insets.bottom +
              layout.bottomNavigation +
              layout.sectionSeparator +
              spacing[1],
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            progressViewOffset={insets.top + layout.header}
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
        {!!scoreCard && <FadeIn appearIndex={0}>{scoreCard}</FadeIn>}

        {!!liveLinkCard && <FadeIn appearIndex={1}>{liveLinkCard}</FadeIn>}

        {!!detailsCard && <FadeIn appearIndex={2}>{detailsCard}</FadeIn>}

        {!!infoCard && <FadeIn appearIndex={3}>{infoCard}</FadeIn>}

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
            teamALogo: match.teamA.logoUrl ?? null,
            teamBLogo: match.teamB.logoUrl ?? null,
            scoreText: match.set ?? null,
            timeText,
            poolCode: match.pool.poolCode,
            leagueCode: match.pool.leagueCode,
            season: match.pool.season,
          }}
          headerGradient={gradient}
        />

        {body}

        <ReportFormSheet
          ref={reportSheetRef}
          context={{
            screen: `Match#${match.id}#${match.teamA.name}/${match.teamB.name}`,
            defaultType: ReportTypeEnum.DISPLAY_BUG,
          }}
          onSuccess={() => {
            reportSheetRef.current?.dismiss();
          }}
          snapPoint="90%"
          footerLabel="Envoyer"
        />

        <GuestPromptSheet ref={guestSheetRef} />
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
      testID="match-screen"
    >
      {body}
    </View>
  );
};

export default MatchScreen;

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing[5],
    paddingHorizontal: spacing[1],
  },
});
