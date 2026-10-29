import { BlurView } from "expo-blur";
import { useId, type ComponentRef, type RefObject } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";

/** Mounted native content, excluding the header itself, supplies Android's backdrop source. */
export type ScrollBlurTarget =
  RefObject<ComponentRef<typeof View> | null> | undefined;

/** The scroll owner supplies native geometry and progress; the backdrop owns no scroll or request state. */
export interface ScrollBackdropProps {
  target: ScrollBlurTarget;
  scrollY: SharedValue<number>;
  height: number;
}

/** Reveals thick material with canvas-blended edges on every layout; unavailable targets retain an opaque canvas. */
export function ScrollBackdrop({
  target,
  scrollY,
  height,
}: ScrollBackdropProps) {
  const { colors, scheme } = useTheme();
  const gradientId = useId();
  const ready = target !== undefined;
  const opaque = useAnimatedStyle(() => ({
    opacity: ready ? 1 - Math.min(1, Math.max(0, scrollY.value) / 64) : 1,
  }));
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={[styles.backdrop, { height }]}
    >
      {target && (
        <BlurView
          blurTarget={target}
          blurMethod="dimezisBlurView"
          intensity={100}
          tint={
            scheme === "dark"
              ? "systemThickMaterialDark"
              : "systemThickMaterialLight"
          }
          style={StyleSheet.absoluteFill}
        />
      )}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.canvas },
          opaque,
        ]}
      />
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        accessible={false}
      >
        <Defs>
          <LinearGradient id={`${gradientId}-left`}>
            <Stop offset="0" stopColor={colors.canvas} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.canvas} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={`${gradientId}-right`}>
            <Stop offset="0" stopColor={colors.canvas} stopOpacity={0} />
            <Stop offset="1" stopColor={colors.canvas} stopOpacity={1} />
          </LinearGradient>
          <LinearGradient
            id={`${gradientId}-bottom`}
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <Stop offset="0" stopColor={colors.canvas} stopOpacity={0} />
            <Stop offset="1" stopColor={colors.canvas} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect
          width={tokens.spacing.lg}
          height="100%"
          fill={`url(#${gradientId}-left)`}
        />
        <Rect
          x="100%"
          width={tokens.spacing.lg}
          height="100%"
          transform={`translate(-${tokens.spacing.lg}, 0)`}
          fill={`url(#${gradientId}-right)`}
        />
        <Rect
          y="100%"
          width="100%"
          height={tokens.spacing.lg}
          transform={`translate(0, -${tokens.spacing.lg})`}
          fill={`url(#${gradientId}-bottom)`}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", left: 0, right: 0, top: 0 },
});
