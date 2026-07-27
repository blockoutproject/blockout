import React, { useCallback } from "react";
import {
  ActivityIndicator,
  type GestureResponderEvent,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import {
  colors,
  borderWidth,
  elevation,
  gradients,
  radius,
  spacing,
  stateOpacity,
  typography,
  useAppTheme,
} from "@/src/shared/theme";

export type ActionVariant =
  "primary" | "secondary" | "destructive" | "destructiveOutline";

export type ActionProps = {
  onPress: () => Promise<void> | void;
  label: string;
  variant?: ActionVariant;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  leftIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
  fullWidth?: boolean;
  gradient?: readonly [string, string, string];
  accessibilityLabel?: string;
  testID?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Renders the canonical primary action while preserving native feedback and accessibility.
 */
export function Action({
  onPress,
  label,
  variant = "primary",
  disabled,
  loading,
  loadingLabel,
  leftIcon,
  style,
  textColor,
  fullWidth,
  gradient = gradients.action,
  accessibilityLabel,
  testID,
}: ActionProps) {
  const theme = useAppTheme();
  const scale = useSharedValue(1);
  const isDisabled = Boolean(disabled || loading);
  const foreground =
    textColor ??
    (variant === "primary"
      ? theme.onPrimary
      : variant === "destructiveOutline"
        ? theme.error
        : theme.text);
  const opacity = disabled
    ? stateOpacity.disabled
    : loading
      ? stateOpacity.loading
      : 1;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (_event: GestureResponderEvent) => {
      if (!isDisabled) {
        scale.value = withSpring(0.98, { damping: 20, stiffness: 250 });
      }
    },
    [isDisabled, scale],
  );

  const handlePressOut = useCallback(
    (_event: GestureResponderEvent) => {
      scale.value = withSpring(1, { damping: 20, stiffness: 250 });
    },
    [scale],
  );

  const handlePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => undefined,
    );
    await onPress();
  }, [onPress]);

  const content = (
    <View style={styles.content}>
      {leftIcon && !loading ? leftIcon : null}
      {loading ? <ActivityIndicator size="small" color={foreground} /> : null}
      <Text style={[styles.label, { color: foreground }]}>
        {loading ? (loadingLabel ?? label) : label}
      </Text>
    </View>
  );

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[
        styles.pressable,
        fullWidth ? styles.fullWidth : undefined,
        animatedStyle,
        style,
        { opacity },
      ]}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      testID={testID}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.action, fullWidth ? styles.fullWidth : undefined]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.action,
            variant === "secondary"
              ? { backgroundColor: theme.surfaceSecondary }
              : variant === "destructive"
                ? { backgroundColor: theme.error }
                : {
                    backgroundColor: "transparent",
                    borderColor: theme.error,
                    borderWidth: borderWidth.thin,
                  },
            fullWidth ? styles.fullWidth : undefined,
          ]}
        >
          {content}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: "center",
    minWidth: 180,
    height: 54,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  action: {
    ...elevation.action,
    alignItems: "center",
    justifyContent: "center",
    minWidth: "100%",
    height: "100%",
    paddingHorizontal: spacing[5],
    borderRadius: radius.full,
    borderCurve: "continuous",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
  },
  label: {
    ...typography.control,
    color: colors.text.onPrimary,
  },
  fullWidth: {
    alignSelf: "stretch",
    width: "100%",
  },
});
