import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import type { AppTheme } from "@/src/shared/theme";
import { layout } from "@/src/shared/theme";
import MaskedImage from "@/src/shared/ui/images/masked-image";
import GradientBorderView from "@/src/shared/ui/gradient-border-view";
import { GradientPill } from "@/src/shared/ui/pill";
import type { MatchHeaderContent } from "@/src/modules/match/view-models/match-header-presentation";

const LOGO_SIZE = 28;
const LOGO_RADIUS = 8;

export type MatchHeaderCenterProps = {
  centerScale: Animated.AnimatedInterpolation<number>;
  content: MatchHeaderContent;
  contentOpacity: Animated.AnimatedInterpolation<number>;
  gradient: readonly [string, string, ...string[]];
  leftTranslateX: Animated.AnimatedInterpolation<number>;
  rightTranslateX: Animated.AnimatedInterpolation<number>;
  theme: AppTheme;
};

/**
 * Renders the compact score and team identity revealed while scrolling.
 */
const MatchHeaderCenter = ({
  centerScale,
  content,
  contentOpacity,
  gradient,
  leftTranslateX,
  rightTranslateX,
  theme,
}: MatchHeaderCenterProps) => (
  <Animated.View
    pointerEvents="none"
    needsOffscreenAlphaCompositing
    renderToHardwareTextureAndroid
    style={[
      styles.centerWrap,
      {
        opacity: contentOpacity,
        transform: [{ scale: centerScale }],
        zIndex: 2,
      },
    ]}
  >
    <Animated.View style={{ transform: [{ translateX: leftTranslateX }] }}>
      <MaskedImage
        uri={content.teamALogo}
        size={LOGO_SIZE}
        radius={LOGO_RADIUS}
      />
    </Animated.View>

    <View style={styles.centerBlock}>
      {content.scoreText ? (
        <GradientBorderView
          gradient={gradient}
          borderRadius={12}
          borderWidth={2}
          style={[
            styles.finalScoreBox,
            {
              backgroundColor: theme.background,
            },
          ]}
        >
          <Text style={[styles.finalScoreText, { color: theme.text }]}>
            {content.scoreText}
          </Text>
        </GradientBorderView>
      ) : (
        <GradientPill label={content.timeText || ""} gradient={gradient} />
      )}
    </View>

    <Animated.View style={{ transform: [{ translateX: rightTranslateX }] }}>
      <MaskedImage
        uri={content.teamBLogo}
        size={LOGO_SIZE}
        radius={LOGO_RADIUS}
      />
    </Animated.View>
  </Animated.View>
);

export default MatchHeaderCenter;

const styles = StyleSheet.create({
  centerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    height: layout.header,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 56,
  },
  centerBlock: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  finalScoreBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  finalScoreText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
