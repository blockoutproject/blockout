import { StyleSheet, type LayoutRectangle } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
  type DerivedValue,
} from "react-native-reanimated";
import { tokens } from "@/shared/theme/tokens";

/** The owner supplies a selected child's native rectangle in the same borderless coordinate space. */
interface SelectionIndicatorProps {
  layout?: LayoutRectangle;
  reducedMotion: boolean;
  /** A shared fill animates paint independently of the indicator bounds. */
  fill: DerivedValue<string>;
}

/** Animates measured bounds directly on the UI thread on both platforms; reduced motion settles immediately. */
export function SelectionIndicator({
  layout,
  reducedMotion,
  fill,
}: Readonly<SelectionIndicatorProps>) {
  const animated = useAnimatedStyle(() => {
    if (!layout) {
      return {};
    }
    const timing = {
      duration: reducedMotion ? 0 : tokens.motion.navigation.duration,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.Never,
    };
    return {
      left: withTiming(layout.x, timing),
      top: withTiming(layout.y, timing),
      width: withTiming(layout.width, timing),
      height: withTiming(layout.height, timing),
    };
  });
  if (!layout) {
    return null;
  }
  return (
    <Animated.View
      accessible={false}
      pointerEvents="none"
      style={[styles.indicator, { backgroundColor: fill }, animated]}
    />
  );
}

const styles = StyleSheet.create({
  indicator: { position: "absolute", borderRadius: tokens.radius.panelInset },
});
