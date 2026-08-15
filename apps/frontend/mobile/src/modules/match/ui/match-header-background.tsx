import React from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/src/shared/theme";

export type MatchHeaderBackgroundProps = {
  androidTint: string;
  backgroundColor: string;
  opacity: Animated.AnimatedInterpolation<number>;
};

/**
 * Renders the platform-specific collapsing header backdrop.
 */
const MatchHeaderBackground = ({
  androidTint,
  backgroundColor,
  opacity,
}: MatchHeaderBackgroundProps) => (
  <Animated.View
    style={[
      StyleSheet.absoluteFill,
      {
        opacity,
        zIndex: 0,
      },
    ]}
    pointerEvents="none"
  >
    {Platform.OS === "ios" ? (
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
    ) : (
      <>
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: androidTint,
            },
          ]}
        />
        <LinearGradient
          colors={[androidTint, colors.transparent]}
          start={{ x: 0, y: 0.35 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </>
    )}
    <LinearGradient
      colors={[backgroundColor, colors.transparent]}
      start={{ x: 0, y: 0.35 }}
      end={{ x: 0, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  </Animated.View>
);

export default MatchHeaderBackground;
