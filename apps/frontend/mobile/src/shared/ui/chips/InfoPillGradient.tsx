import React, {memo} from "react";
import {DimensionValue, StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle,} from "react-native";
import {Ionicons, MaterialCommunityIcons} from "@expo/vector-icons";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {CORNERS} from "@/src/shared/theme/tokens";
import GradientBorderView from "@/src/shared/ui/GradientBorderView";
import GradientView from "@/src/shared/ui/GradientView";

export type PillSize = "sm" | "md" | "lg";
type Variant = "border" | "filled";

export type InfoPillGradientProps = {
  label?: string;
  gradient?: readonly [string, string, ...string[]];
  variant?: Variant;
  size?: PillSize;
  onPress?: () => void;
  disabled?: boolean;
  borderWidth?: number;
  maxWidth?: DimensionValue;
  leftIcon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  rightIcon?: React.ComponentProps<typeof Ionicons>["name"];
  textColor?: string;
  iconColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  showRedDot?: boolean;
  redDotSize?: number;
  redDotColor?: string;
};

const GAP = 6;

const PILL_SIZES: Record<
  PillSize,
  { padV: number; padH: number; fontSize: number; fontWeight: "600" | "700"; iconSize: number }
> = {
  sm: {padV: 3, padH: 6, fontSize: 10, fontWeight: "600", iconSize: 12},
  md: {padV: 6, padH: 10, fontSize: 12, fontWeight: "700", iconSize: 14},
  lg: {padV: 8, padH: 12, fontSize: 13, fontWeight: "700", iconSize: 16},
};

const InfoPillGradient: React.FC<InfoPillGradientProps> = ({
                                                             label,
                                                             gradient,
                                                             variant = "border",
                                                             size = "md",
                                                             onPress,
                                                             disabled,
                                                             borderWidth = 1,
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
                                                             redDotSize,
                                                             redDotColor,
                                                           }) => {
  const theme = useAppTheme();
  const cfg = PILL_SIZES[size];

  const flattenedLabel = StyleSheet.flatten(labelStyle);
  const effectiveTextColor =
    flattenedLabel?.color ?? textColor ?? theme.text;
  const effectiveIconColor = iconColor ?? effectiveTextColor;

  const hasGradient = !!gradient;

  const baseBorderColor = borderColor ?? theme.border;
  const baseBackgroundColor =
    backgroundColor ??
    (variant === "filled" ? theme.surface : theme.surface); // on garde un fond par défaut, plus jamais "transparent"

  const dotColor = redDotColor ?? theme.error;
  const baseDotSize =
    redDotSize ?? (size === "sm" ? 6 : size === "lg" ? 9 : 7);
  const dotSize = Math.max(3, baseDotSize);

  const content = (
    <View
      style={[
        styles.inner,
        {
          paddingVertical: cfg.padV,
          paddingHorizontal: cfg.padH,
          borderRadius: CORNERS,
          maxWidth,
        },
      ]}
    >
      {leftIcon ? (
        <MaterialCommunityIcons
          name={leftIcon}
          size={cfg.iconSize}
          color={effectiveIconColor}
        />
      ) : null}

      {label ? (
        <Text
          style={[
            styles.text,
            {
              color: effectiveTextColor,
              fontSize: cfg.fontSize,
              fontWeight: cfg.fontWeight,
            },
            labelStyle,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      ) : null}

      {rightIcon ? (
        <Ionicons
          name={rightIcon}
          size={cfg.iconSize}
          color={effectiveIconColor}
        />
      ) : null}

      {showRedDot ? (
        <View
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: dotColor,
          }}
        />
      ) : null}
    </View>
  );

  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress
    ? {activeOpacity: 0.9, onPress, disabled}
    : {};

  // === CAS AVEC GRADIENT ===
  if (hasGradient) {
    if (variant === "filled") {
      return (
        <GradientView
          gradient={gradient!}
          style={[styles.outer, {borderRadius: CORNERS}, style]}
        >
          <Wrapper {...(wrapperProps as any)}>{content}</Wrapper>
        </GradientView>
      );
    }

    // border + gradient : bord en gradient, intérieur avec baseBackgroundColor
    return (
      <GradientBorderView
        gradient={gradient!}
        borderRadius={CORNERS}
        borderWidth={borderWidth}
        style={[styles.outer, style]}
      >
        <Wrapper {...(wrapperProps as any)}>
          <View
            style={{
              borderRadius: CORNERS - Math.min(
                CORNERS / 2,
                borderWidth,
              ),
              backgroundColor: baseBackgroundColor,
            }}
          >
            {content}
          </View>
        </Wrapper>
      </GradientBorderView>
    );
  }

  // === CAS SANS GRADIENT -> BASIC PILL ===
  const basicBorderStyle = {
    borderWidth,
    borderColor: baseBorderColor,
    backgroundColor: baseBackgroundColor, // ✅ plus jamais forcé à transparent
  };

  return (
    <View
      style={[
        styles.outer,
        {
          borderRadius: CORNERS,
        },
        basicBorderStyle,
        style,
      ]}
    >
      <Wrapper
        {...(wrapperProps as any)}
        style={{borderRadius: CORNERS}}
      >
        {content}
      </Wrapper>
    </View>
  );
};

export default memo(InfoPillGradient);

const styles = StyleSheet.create({
  outer: {
    borderRadius: CORNERS,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GAP,
  },
  text: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
  },
});
