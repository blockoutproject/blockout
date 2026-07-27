import React, { memo } from "react";
import {
  type DimensionValue,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import {
  borderWidth as borderWidths,
  gradients as designGradients,
  radius,
  spacing,
  stateOpacity,
  touchTarget,
  typography,
  useAppTheme,
} from "@/src/shared/theme";

export type PillSize = "sm" | "md" | "lg";

type PillContentProps = {
  label?: string;
  size: PillSize;
  maxWidth?: DimensionValue;
  leftIcon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  rightIcon?: React.ComponentProps<typeof Ionicons>["name"];
  textColor: string;
  iconColor: string;
  labelStyle?: StyleProp<TextStyle>;
  showRedDot: boolean;
  redDotColor: string;
};

export type PillProps = Omit<
  PillContentProps,
  "size" | "textColor" | "iconColor" | "showRedDot" | "redDotColor"
> & {
  size?: PillSize;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  borderWidth?: number;
  textColor?: string;
  iconColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  showRedDot?: boolean;
};

export type GradientPillProps = PillProps & {
  gradient?: readonly [string, string, ...string[]];
  treatment?: "border" | "filled";
};

const pillMetrics = {
  sm: {
    height: 22,
    paddingHorizontal: spacing[2],
    iconSize: 12,
    dotSize: 6,
    text: typography.micro,
  },
  md: {
    height: 28,
    paddingHorizontal: spacing[3],
    iconSize: 14,
    dotSize: 7,
    text: typography.metadataStrong,
  },
  lg: {
    height: 34,
    paddingHorizontal: spacing[3],
    iconSize: 16,
    dotSize: 9,
    text: typography.label,
  },
} as const;

/**
 * Renders the canonical solid pill for compact metadata and finite filters.
 */
export const Pill = memo(function Pill({
  label,
  size = "md",
  onPress,
  disabled,
  accessibilityLabel,
  testID,
  borderWidth = borderWidths.thin,
  maxWidth,
  leftIcon,
  rightIcon,
  textColor,
  iconColor,
  backgroundColor,
  borderColor,
  style,
  labelStyle,
  showRedDot = false,
}: PillProps) {
  const theme = useAppTheme();
  const foreground = textColor ?? theme.text;

  return (
    <PillSurface
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      size={size}
      style={[
        styles.surface,
        {
          height: pillMetrics[size].height,
          borderWidth,
          borderColor: borderColor ?? theme.border,
          backgroundColor: backgroundColor ?? theme.surface,
        },
        style,
      ]}
    >
      <PillContent
        label={label}
        size={size}
        maxWidth={maxWidth}
        leftIcon={leftIcon}
        rightIcon={rightIcon}
        textColor={foreground}
        iconColor={iconColor ?? foreground}
        labelStyle={labelStyle}
        showRedDot={showRedDot}
        redDotColor={theme.error}
      />
    </PillSurface>
  );
});

/**
 * Renders the canonical gradient pill as either a filled control or a gradient border.
 */
export const GradientPill = memo(function GradientPill({
  label,
  gradient = designGradients.action,
  treatment = "border",
  size = "md",
  onPress,
  disabled,
  accessibilityLabel,
  testID,
  borderWidth = borderWidths.thin,
  maxWidth,
  leftIcon,
  rightIcon,
  textColor,
  iconColor,
  backgroundColor,
  style,
  labelStyle,
  showRedDot = false,
}: GradientPillProps) {
  const theme = useAppTheme();
  const foreground = textColor ?? theme.text;
  const content = (
    <PillContent
      label={label}
      size={size}
      maxWidth={maxWidth}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      textColor={foreground}
      iconColor={iconColor ?? foreground}
      labelStyle={labelStyle}
      showRedDot={showRedDot}
      redDotColor={theme.error}
    />
  );

  if (treatment === "filled") {
    return (
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.surface, { height: pillMetrics[size].height }, style]}
      >
        <PillSurface
          onPress={onPress}
          disabled={disabled}
          accessibilityLabel={accessibilityLabel ?? label}
          testID={testID}
          size={size}
          style={styles.transparentSurface}
        >
          {content}
        </PillSurface>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.surface,
        { height: pillMetrics[size].height, padding: borderWidth },
        style,
      ]}
    >
      <PillSurface
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel ?? label}
        testID={testID}
        size={size}
        style={[
          styles.borderedContent,
          {
            height: pillMetrics[size].height - borderWidth * 2,
            backgroundColor: backgroundColor ?? theme.surface,
          },
        ]}
      >
        {content}
      </PillSurface>
    </LinearGradient>
  );
});

type PillSurfaceProps = Pick<
  PressableProps,
  "accessibilityLabel" | "disabled" | "onPress" | "testID"
> & {
  children: React.ReactNode;
  size: PillSize;
  style: StyleProp<ViewStyle>;
};

/**
 * Preserves one native interaction boundary without changing the pill's visual height.
 */
function PillSurface({
  children,
  size,
  style,
  onPress,
  disabled,
  accessibilityLabel,
  testID,
}: PillSurfaceProps) {
  const hitSlop = (touchTarget.minimum - pillMetrics[size].height) / 2;

  if (!onPress) {
    return <View style={style}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={onPress}
      style={({ pressed }) => [style, pressed ? styles.pressed : undefined]}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}

/**
 * Keeps the bounded icon, label, and indicator anatomy identical across both pill families.
 */
function PillContent({
  label,
  size,
  maxWidth,
  leftIcon,
  rightIcon,
  textColor,
  iconColor,
  labelStyle,
  showRedDot,
  redDotColor,
}: PillContentProps) {
  const metrics = pillMetrics[size];

  return (
    <View
      style={[
        styles.content,
        {
          maxWidth,
          paddingHorizontal: metrics.paddingHorizontal,
        },
      ]}
    >
      {leftIcon ? (
        <MaterialCommunityIcons
          name={leftIcon}
          size={metrics.iconSize}
          color={iconColor}
        />
      ) : null}
      {label ? (
        <Text
          numberOfLines={1}
          style={[metrics.text, { color: textColor }, labelStyle]}
        >
          {label}
        </Text>
      ) : null}
      {rightIcon ? (
        <Ionicons name={rightIcon} size={metrics.iconSize} color={iconColor} />
      ) : null}
      {showRedDot ? (
        <View
          style={{
            width: metrics.dotSize,
            height: metrics.dotSize,
            borderRadius: metrics.dotSize / 2,
            backgroundColor: redDotColor,
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  transparentSurface: {
    height: "100%",
    backgroundColor: "transparent",
  },
  borderedContent: {
    borderRadius: radius.full,
    borderCurve: "continuous",
  },
  content: {
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[1],
  },
  pressed: {
    opacity: stateOpacity.pressed,
  },
});
