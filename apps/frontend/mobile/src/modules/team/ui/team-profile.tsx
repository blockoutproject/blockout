import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import type { TeamResponse } from "@/src/shared/generated/models";
import { useTeamFollowState } from "@/src/modules/team/hooks/use-team-follow-state";
import FollowButton from "@/src/shared/ui/follow/follow-button";
import FollowersCounter from "@/src/shared/ui/follow/followers-count";
import {
  GenderEnum,
  GenderLabels,
} from "@/src/shared/view-models/gender-labels";
import { FormatLabels } from "@/src/shared/view-models/format-labels";
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

import { useAdvertising } from "@/src/modules/advertising/providers/advertising-provider";

export type TeamProfileProps = {
  enrichedTeam: TeamResponse;
};

type PillConfig = {
  label: string;
  borderColor?: string;
  backgroundColor?: string;
};

const TeamProfile: React.FC<TeamProfileProps> = ({ enrichedTeam }) => {
  const router = useRouter();
  const { handleNavigationWithAd } = useAdvertising();
  const { isFollowing, isProcessing, followersCount, onToggleFollow } =
    useTeamFollowState(enrichedTeam);
  const { isGuest } = useSessionState();
  const guestSheetRef = useRef<GuestPromptSheetRef>(null);
  const theme = useAppTheme();

  const gradient = [
    enrichedTeam.division.firstGradientColor,
    enrichedTeam.division.secondGradientColor,
    enrichedTeam.division.thirdGradientColor,
  ] as const;

  const pills: PillConfig[] = useMemo(() => {
    const arr: PillConfig[] = [];

    if (enrichedTeam.division.name) {
      const divColor = enrichedTeam.division.mainColor ?? theme.textSecondary;
      arr.push({
        label: enrichedTeam.division.name,
        borderColor: divColor,
        backgroundColor: withAlpha(divColor, 0.12),
      });
    }

    if (enrichedTeam.gender) {
      let genderColor: string;
      switch (enrichedTeam.gender) {
        case GenderEnum.M:
          genderColor = theme.male;
          break;
        case GenderEnum.F:
          genderColor = theme.female;
          break;
        case GenderEnum.O:
        default:
          genderColor = theme.textSecondary;
          break;
      }

      arr.push({
        label: GenderLabels[enrichedTeam.gender],
        borderColor: genderColor,
        backgroundColor: withAlpha(genderColor, 0.12),
      });
    }

    if (enrichedTeam.format) {
      arr.push({
        label: FormatLabels[enrichedTeam.format],
        borderColor: theme.textInactive,
        backgroundColor: withAlpha(theme.textInactive, 0.12),
      });
    }

    if (enrichedTeam.season) {
      arr.push({
        label: enrichedTeam.season,
        borderColor: theme.textInactive,
        backgroundColor: withAlpha(theme.textInactive, 0.12),
      });
    }

    return arr;
  }, [
    enrichedTeam.division.name,
    enrichedTeam.division.mainColor,
    enrichedTeam.gender,
    enrichedTeam.format,
    enrichedTeam.season,
    theme.male,
    theme.female,
    theme.textSecondary,
    theme.textInactive,
  ]);

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

  const renderPill = (pill: PillConfig, key: string | number) => {
    const baseBorder = withAlpha(theme.text, 0.12);
    const baseBg = withAlpha(theme.surface, 0.95);

    return (
      <Pill
        key={key}
        label={pill.label}
        size="md"
        borderWidth={borderWidth.thin}
        backgroundColor={pill.backgroundColor ?? baseBg}
        borderColor={pill.borderColor ?? baseBorder}
        textColor={theme.textSecondary}
      />
    );
  };

  return (
    <View testID="team-profile">
      <View style={styles.container}>
        <MaskedImage
          uri={enrichedTeam.logoUrl}
          size={layout.logoHero}
          radius={radius.lg}
        />

        <View style={styles.content}>
          <View style={styles.pillsRow}>
            {pills.map((pill, index) => renderPill(pill, `pill-${index}`))}
            <GradientPill
              accessibilityLabel="Ouvrir le club"
              leftIcon="home"
              size="md"
              rightIcon="chevron-forward-outline"
              treatment="filled"
              gradient={gradient}
              onPress={() => handleClubPress(enrichedTeam.clubId)}
            />
          </View>

          <View style={styles.actionsRow}>
            <FollowButton
              isFollowing={isFollowing}
              onPress={handleFollow}
              disabled={isProcessing}
              gradient={gradient}
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
