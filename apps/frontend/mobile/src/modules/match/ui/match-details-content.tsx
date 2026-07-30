import React from "react";
import { Animated, RefreshControl, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { MatchResponse } from "@/src/shared/generated/models";
import { layout, spacing, useAppTheme } from "@/src/shared/theme";
import type { MatchScreenPresentation } from "@/src/modules/match/view-models/match-screen-presentation";
import MatchScoreCard from "@/src/modules/match/ui/match-score-card";
import MatchScoreDetailsCard from "@/src/modules/match/ui/match-score-details-card";
import MatchInfoCard from "@/src/modules/match/ui/match-info-card";
import MatchLiveLinkCard from "@/src/modules/match/ui/match-live-link-card";
import RankingCard from "@/src/modules/ranking/ui/ranking-card";
import FadeIn from "@/src/shared/ui/animations/fade-in";

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export type MatchDetailsContentProps = {
  match: MatchResponse;
  presentation: MatchScreenPresentation;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  onRequireAuthForLiveLink: () => void;
  refetch: () => Promise<unknown>;
  scrollY: Animated.Value;
};

/**
 * Renders the successful match-detail state while preserving its refresh and
 * animated-scroll behavior.
 */
const MatchDetailsContent = ({
  match,
  presentation,
  isRefreshing,
  onRefresh,
  onRequireAuthForLiveLink,
  refetch,
  scrollY,
}: MatchDetailsContentProps) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
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
          onRefresh={onRefresh}
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
      <FadeIn appearIndex={0}>
        <MatchScoreCard match={match} gradient={presentation.gradient} />
      </FadeIn>

      {presentation.showLiveLinkCard ? (
        <FadeIn appearIndex={1}>
          <MatchLiveLinkCard
            match={match}
            gradient={presentation.gradient}
            refetch={refetch}
            onRequireAuth={onRequireAuthForLiveLink}
          />
        </FadeIn>
      ) : null}

      <FadeIn appearIndex={2}>
        <MatchScoreDetailsCard match={match} />
      </FadeIn>

      <FadeIn appearIndex={3}>
        <MatchInfoCard match={match} />
      </FadeIn>

      <FadeIn appearIndex={5}>
        <RankingCard
          pool={match.pool}
          highlightTeams={presentation.highlightTeams}
        />
      </FadeIn>
    </AnimatedScrollView>
  );
};

export default MatchDetailsContent;

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing[5],
    paddingHorizontal: spacing[1],
  },
});
