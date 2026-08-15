import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";

import type { PoolResponse } from "@/src/shared/generated/models";
import FollowButton from "@/src/shared/ui/follow/follow-button";
import FollowersCounter from "@/src/shared/ui/follow/followers-count";
import { usePoolFollowState } from "@/src/modules/pool/hooks/use-pool-follow-state";
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
import { toPoolProfilePresentation } from "@/src/modules/pool/view-models/pool-profile-presentation";
import type { EntityPillPresentation } from "@/src/shared/model/entity-pill-presentation";

export type PoolProfileProps = {
  enrichedPool: PoolResponse;
};

const PoolProfile: React.FC<PoolProfileProps> = ({ enrichedPool }) => {
  const { isFollowing, isProcessing, followersCount, onToggleFollow } =
    usePoolFollowState(enrichedPool);
  const { isGuest } = useSessionState();
  const guestSheetRef = useRef<GuestPromptSheetRef>(null);
  const theme = useAppTheme();

  const presentation = toPoolProfilePresentation(enrichedPool, {
    female: theme.female,
    male: theme.male,
    mixed: theme.textSecondary,
    neutral: theme.textInactive,
  });

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
    <View style={styles.container} testID="pool-profile">
      <MaskedImage
        uri={presentation.imageUri}
        size={layout.logoHero}
        radius={radius.lg}
        shadow
      />

      <View style={styles.content}>
        <View style={styles.pillsRow}>
          {presentation.pills.map((pill, index) =>
            renderPill(pill, `pill-${index}`),
          )}
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
    gap: spacing.tight,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.tight,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
});
