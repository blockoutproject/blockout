import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";

import type { PoolResponse } from "@/src/shared/generated/models";
import FollowButton from "@/src/shared/ui/follow/follow-button";
import FollowersCounter from "@/src/shared/ui/follow/followers-count";
import { usePoolFollowState } from "@/src/modules/pool/hooks/use-pool-follow-state";
import {
  GenderEnum,
  GenderLabels,
} from "@/src/shared/view-models/gender-labels";
import {
  borderWidth,
  layout,
  radius,
  spacing,
  useAppTheme,
  withAlpha,
} from "@/src/shared/theme";
import MaskedImage from "@/src/shared/ui/images/masked-image";
import { useSessionState } from "@/src/modules/session/providers/session-context";

import { Pill } from "@/src/shared/ui/pill";
import GuestPromptSheet, {
  GuestPromptSheetRef,
} from "@/src/modules/session/ui/guest-prompt-sheet";

export type PoolProfileProps = {
  enrichedPool: PoolResponse;
};

type PillConfig = {
  label: string;
  borderColor?: string;
  backgroundColor?: string;
};

const PoolProfile: React.FC<PoolProfileProps> = ({ enrichedPool }) => {
  const { isFollowing, isProcessing, followersCount, onToggleFollow } =
    usePoolFollowState(enrichedPool);
  const { isGuest } = useSessionState();
  const guestSheetRef = useRef<GuestPromptSheetRef>(null);
  const theme = useAppTheme();

  const division = enrichedPool.division;
  const gradient = [
    division.firstGradientColor,
    division.secondGradientColor,
    division.thirdGradientColor,
  ] as const;

  const pillsData: PillConfig[] = useMemo(() => {
    const pills: PillConfig[] = [];

    if (enrichedPool.leagueName) {
      pills.push({
        label: enrichedPool.leagueName,
        borderColor: theme.textInactive,
        backgroundColor: withAlpha(theme.textInactive, 0.12),
      });
    }

    if (division.name) {
      const divColor = division.mainColor ?? theme.textSecondary;
      pills.push({
        label: division.name,
        borderColor: divColor,
        backgroundColor: withAlpha(divColor, 0.12),
      });
    }

    if (enrichedPool.gender) {
      let genderColor: string;
      switch (enrichedPool.gender) {
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

      pills.push({
        label: GenderLabels[enrichedPool.gender],
        borderColor: genderColor,
        backgroundColor: withAlpha(genderColor, 0.12),
      });
    }

    if (enrichedPool.season) {
      pills.push({
        label: enrichedPool.season,
        borderColor: theme.textInactive,
        backgroundColor: withAlpha(theme.textInactive, 0.12),
      });
    }

    return pills;
  }, [
    enrichedPool.leagueName,
    enrichedPool.gender,
    enrichedPool.season,
    division.name,
    division.mainColor,
    theme.male,
    theme.female,
    theme.textSecondary,
    theme.textInactive,
  ]);

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
    <View style={styles.container} testID="pool-profile">
      <MaskedImage
        uri={division.logoUrl}
        size={layout.logoHero}
        radius={radius.lg}
        shadow
      />

      <View style={styles.content}>
        <View style={styles.pillsRow}>
          {pillsData.map((pill, index) => renderPill(pill, `pill-${index}`))}
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

      <GuestPromptSheet ref={guestSheetRef} />
    </View>
  );
};

export default PoolProfile;

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
