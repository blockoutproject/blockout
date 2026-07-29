import React, { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import type { TeamResponse } from "@/src/shared/generated/models";
import { useTeamFollowState } from "@/src/modules/team/hooks/use-team-follow-state";
import FollowButton from "@/src/shared/ui/follow/follow-button";
import FollowersCounter from "@/src/shared/ui/follow/followers-count";
import {
  borderWidth,
  layout,
  radius,
  spacing,
  useAppTheme,
  withAlpha,
} from "@/src/shared/theme";
import MaskedImage from "@/src/shared/ui/images/masked-image";
import { GradientPill, Pill } from "@/src/shared/ui/pill";
import { useSessionState } from "@/src/modules/session/providers/session-context";
import GuestPromptSheet, {
  GuestPromptSheetRef,
} from "@/src/modules/session/ui/guest-prompt-sheet";

import { useNavigationInterstitial } from "@/src/modules/advertising/hooks/use-navigation-interstitial";
import { toTeamProfilePresentation } from "@/src/modules/team/view-models/team-profile-presentation";
import type { EntityPillPresentation } from "@/src/shared/model/entity-pill-presentation";

export type TeamProfileProps = {
  enrichedTeam: TeamResponse;
};

const TeamProfile: React.FC<TeamProfileProps> = ({ enrichedTeam }) => {
  const router = useRouter();
  const { handleNavigationWithAd } = useNavigationInterstitial();
  const { isFollowing, isProcessing, followersCount, onToggleFollow } =
    useTeamFollowState(enrichedTeam);
  const { isGuest } = useSessionState();
  const guestSheetRef = useRef<GuestPromptSheetRef>(null);
  const theme = useAppTheme();

  const presentation = toTeamProfilePresentation(enrichedTeam, {
    female: theme.female,
    male: theme.male,
    mixed: theme.textSecondary,
    neutral: theme.textInactive,
  });

  const handleClubPress = useCallback(
    async (clubId: string) => {
      await Haptics.selectionAsync();

      handleNavigationWithAd(() => {
        router.push(`/club/${clubId}`);
      });
    },
    [router, handleNavigationWithAd],
  );

  const handleFollow = () => {
    if (isGuest) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      guestSheetRef.current?.present();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onToggleFollow();
    }
  };

  useEffect(() => {
    if (!isGuest) {
      guestSheetRef.current?.dismiss();
    }
  }, [isGuest]);

  const renderPill = (pill: EntityPillPresentation, key: string | number) => {
    return (
      <Pill
        key={key}
        label={pill.label}
        size="md"
        borderWidth={borderWidth.thin}
        backgroundColor={withAlpha(pill.color, 0.12)}
        borderColor={pill.color}
        textColor={theme.textSecondary}
      />
    );
  };

  return (
    <View testID="team-profile">
      <View style={styles.container}>
        <MaskedImage
          uri={presentation.imageUri}
          size={layout.logoHero}
          radius={radius.lg}
        />

        <View style={styles.content}>
          <View style={styles.pillsRow}>
            {presentation.pills.map((pill, index) =>
              renderPill(pill, `pill-${index}`),
            )}
            <GradientPill
              accessibilityLabel="Ouvrir le club"
              leftIcon="home"
              size="md"
              rightIcon="chevron-forward-outline"
              treatment="filled"
              gradient={presentation.gradient}
              onPress={() => handleClubPress(presentation.clubId)}
            />
          </View>

          <View style={styles.actionsRow}>
            <FollowButton
              isFollowing={isFollowing}
              onPress={handleFollow}
              disabled={isProcessing}
              gradient={presentation.gradient}
            />
            <FollowersCounter count={followersCount} />
          </View>
        </View>
      </View>

      <GuestPromptSheet ref={guestSheetRef} />
    </View>
  );
};

export default TeamProfile;

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing[1],
    paddingHorizontal: spacing[3],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  content: {
    flex: 1,
    gap: 6,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
});
