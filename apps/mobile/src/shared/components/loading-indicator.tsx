import { LoaderCircle } from "lucide-react-native";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
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
import { useReducedMotion } from "../theme/use-reduced-motion";

/** Keeps the approved action glyph static whenever the current native reduced-motion setting is enabled. */
export function LoadingIndicator({ color }: { color: string }) {
  const reducedMotion = useReducedMotion();
  const rotation = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

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
        size={tokens.size.icon.md}
        color={color}
        nonScalingStroke
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: { width: tokens.size.icon.md, height: tokens.size.icon.md },
});
