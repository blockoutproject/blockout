import React, { useEffect, useRef } from "react";
import { Animated, DimensionValue, StyleSheet, ViewStyle } from "react-native";
import { radius, useAppTheme } from "@/src/shared/theme";

/** Composant skeleton animé. */
export type SkeletonProps = {
  /** Largeur (par défaut "100%"). */
  width?: DimensionValue;
  /** Hauteur (par défaut 100). */
  height?: number;
  /** Styles additionnels. */
  style?: ViewStyle;
  /** Forme : coins arrondis ou rayon constant. */
  variant?: "default" | "rounded";
};

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 100,
  style,
  variant = "default",
}) => {
  const theme = useAppTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width,
          height,
          backgroundColor: theme.muted,
          borderRadius: variant === "default" ? radius.full : radius.xl,
          opacity,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
