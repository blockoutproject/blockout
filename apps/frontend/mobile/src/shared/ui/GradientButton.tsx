import React, {useCallback} from "react";
import {ActivityIndicator, GestureResponderEvent, Pressable, StyleSheet, Text, View, ViewStyle,} from "react-native";
import {LinearGradient} from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {useAnimatedStyle, useSharedValue, withSpring} from "react-native-reanimated";
import {CTA_GRADIENT} from "@/src/shared/theme/tokens";

export type GradientButtonProps = {
  onPress: () => Promise<void> | void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
  loadingLabel?: string;
  leftIcon?: React.ReactNode;
  showLeftIconWhenLoading?: boolean;
  style?: ViewStyle;
  textColor?: string;
  fullWidth?: boolean;
  gradient?: [string, string, string];
  accessibilityLabel?: string;
  testID?: string;
};

export const GOLD_GRADIENT: [string, string, string] = ["#fedc84", "#CFAE70", "#9E844C"];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const GradientButton: React.FC<GradientButtonProps> = ({
                                                                onPress,
                                                                disabled,
                                                                loading,
                                                                label,
                                                                loadingLabel,
                                                                leftIcon,
                                                                showLeftIconWhenLoading = false,
                                                                style,
                                                                textColor = "#000000",
                                                                fullWidth,
                                                                gradient = CTA_GRADIENT,
                                                                accessibilityLabel,
                                                                testID,
                                                              }) => {
  const scale = useSharedValue(1);

  const isDisabled = !!disabled || !!loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const handlePressIn = useCallback(
    (_e: GestureResponderEvent) => {
      if (!isDisabled) scale.value = withSpring(0.98, {damping: 20, stiffness: 250});
    },
    [isDisabled, scale]
  );

  const handlePressOut = useCallback(
    (_e: GestureResponderEvent) => {
      scale.value = withSpring(1, {damping: 20, stiffness: 250});
    },
    [scale]
  );

  const handlePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    await onPress();
  }, [onPress]);

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[styles.pressable, fullWidth ? styles.fullWidth : null, animatedStyle, style]}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{disabled: isDisabled, busy: !!loading}}
      testID={testID}
    >
      <LinearGradient
        colors={gradient}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={[styles.button, loading && styles.buttonLoading, fullWidth && styles.buttonFull]}
      >
        <View style={styles.innerRow}>
          {leftIcon && (showLeftIconWhenLoading || !loading) ? (
            <View style={styles.leftIcon}>{leftIcon}</View>
          ) : null}

          {loading ? (
            <>
              <ActivityIndicator size="small" color={textColor}/>
              <Text style={[styles.text, {color: textColor}]}>{loadingLabel ?? label}</Text>
            </>
          ) : (
            <Text style={[styles.text, {color: textColor}]}>{label}</Text>
          )}
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    alignSelf: "center",
    borderRadius: 999,
    overflow: "hidden",
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  button: {
    height: 54,
    minWidth: 140,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 8},
  },
  buttonLoading: {
    opacity: 0.75,
  },
  buttonFull: {
    width: "100%",
  },
  innerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  leftIcon: {
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});

export default GradientButton;
