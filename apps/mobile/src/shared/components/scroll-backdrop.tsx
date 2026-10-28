import { BlurView } from "expo-blur";
import type { ComponentRef, RefObject } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { useTheme } from "../theme/theme-provider";

/** Mounted native content, excluding the header itself, supplies Android's backdrop source. */
export type ScrollBlurTarget =
  RefObject<ComponentRef<typeof View> | null> | undefined;

/** The scroll owner supplies native geometry and progress; the backdrop owns no scroll or request state. */
export interface ScrollBackdropProps {
  target: ScrollBlurTarget;
  scrollY: SharedValue<number>;
  height: number;
}

/** Reveals the approved thick material after scrolling; an unavailable target retains an opaque canvas. */
export function ScrollBackdrop({
  target,
  scrollY,
  height,
}: ScrollBackdropProps) {
  const { colors, scheme } = useTheme();
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
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", left: 0, right: 0, top: 0 },
});
