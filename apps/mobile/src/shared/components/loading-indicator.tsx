import { LoaderCircle } from "lucide-react-native";
import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { tokens } from "../theme/tokens";

/** Keeps the approved action glyph static whenever the current native reduced-motion setting is enabled. */
export function LoadingIndicator({ color }: { color: string }) {
  const [reducedMotion, setReducedMotion] = useState(true);
  const rotation = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion,
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    rotation.value = 0;
    if (reducedMotion) return;

    rotation.value = withRepeat(
      withTiming(360, {
        duration: tokens.motion.slow,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
      false,
      undefined,
      ReduceMotion.Never,
    );
    return () => cancelAnimation(rotation);
  }, [reducedMotion, rotation]);

  return (
    <Animated.View style={[styles.slot, style]} accessible={false}>
      <LoaderCircle
        accessible={false}
        size={tokens.size.loading}
        color={color}
        nonScalingStroke
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: { width: tokens.size.loading, height: tokens.size.loading },
});
