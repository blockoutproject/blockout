import React from "react";
import * as Haptics from "expo-haptics";

import { borderWidth, colors, useAppTheme } from "@/src/shared/theme";
import { GradientPill } from "@/src/shared/ui/pill";

export type FollowButtonProps = {
  isFollowing: boolean;
  onPress: () => void;
  disabled?: boolean;
  gradient: readonly [string, string, ...string[]];
};

/**
 * Composes follow state through the canonical interactive gradient pill.
 */
export default function FollowButton({
  isFollowing,
  onPress,
  disabled,
  gradient,
}: FollowButtonProps) {
  const theme = useAppTheme();

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => undefined,
    );
    onPress();
  };

  return (
    <GradientPill
      accessibilityLabel={isFollowing ? "Ne plus suivre" : "Suivre"}
      label={isFollowing ? "Suivie" : "Suivre"}
      size="lg"
      treatment={isFollowing ? "border" : "filled"}
      gradient={gradient}
      borderWidth={borderWidth.medium}
      backgroundColor={isFollowing ? theme.background : undefined}
      textColor={isFollowing ? theme.text : colors.text.primary}
      onPress={handlePress}
      disabled={disabled}
    />
  );
}
