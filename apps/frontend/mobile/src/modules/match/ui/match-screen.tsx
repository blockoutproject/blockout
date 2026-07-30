import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, View } from "react-native";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";

import { useAppTheme } from "@/src/shared/theme";
import { useMatchById } from "@/src/modules/match/hooks/use-match-by-id";
import { useMatchRefresh } from "@/src/modules/match/hooks/use-match-refresh";

import MatchSkeleton from "@/src/modules/match/ui/match-skeleton";
import MatchHeader from "@/src/modules/match/ui/match-header";
import MatchDetailsContent from "@/src/modules/match/ui/match-details-content";
import ErrorState from "@/src/shared/ui/feedback/error-state";

import { ReportTypeEnum } from "@/src/shared/generated/models";
import { createMatchScreenPresentation } from "@/src/modules/match/view-models/match-screen-presentation";

import ReportFormSheet from "@/src/modules/report/ui/report-form-sheet";
import useHasScopes from "@/src/modules/user/hooks/use-has-scopes";
import GuestPromptSheet, {
  GuestPromptSheetRef,
} from "@/src/modules/session/ui/guest-prompt-sheet";
import { useSessionState } from "@/src/modules/session/providers/session-context";

const MatchScreen: React.FC = () => {
  const { id } = useLocalSearchParams();
  const theme = useAppTheme();
  const { isGuest } = useSessionState();

  const { data: match, isLoading, error, refetch } = useMatchById(Number(id));

  const { allowed: canCreateLiveLinkScope } = useHasScopes([
    "create:match_live_link",
  ]);

  const reportSheetRef = useRef<BottomSheetModal>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const guestSheetRef = useRef<GuestPromptSheetRef>(null);
  const { isRefreshing, refresh } = useMatchRefresh(refetch);

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

  const presentation = useMemo(
    () =>
      match
        ? createMatchScreenPresentation(match, theme, canCreateLiveLinkScope)
        : null,
    [canCreateLiveLinkScope, match, theme],
  );

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
  } else if (presentation) {
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
            timeText: presentation.timeText,
            poolCode: match.pool.poolCode,
            leagueCode: match.pool.leagueCode,
            season: match.pool.season,
          }}
          headerGradient={presentation.gradient}
        />

        <MatchDetailsContent
          match={match}
          presentation={presentation}
          isRefreshing={isRefreshing}
          onRefresh={refresh}
          onRequireAuthForLiveLink={handleRequireAuthForLiveLink}
          refetch={refetch}
          scrollY={scrollY}
        />

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
