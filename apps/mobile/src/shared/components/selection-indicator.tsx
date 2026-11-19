import { StyleSheet, type LayoutRectangle } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
  type DerivedValue,
  type WithTimingConfig,
} from "react-native-reanimated";
import { tokens } from "@/shared/theme/tokens";

/** The owner supplies a selected child's native rectangle in the same borderless coordinate space. */
interface SelectionIndicatorProps {
  layout?: LayoutRectangle;
  reducedMotion: boolean;
  /** A shared fill animates paint independently of the indicator bounds. */
  fill: string | DerivedValue<string>;
  radius?: number;
  timing?: Pick<WithTimingConfig, "duration" | "easing">;
}

/** Animates the supplied bounds on the UI thread; reduced motion settles immediately. */
export function SelectionIndicator({
  layout,
  reducedMotion,
  fill,
  radius = tokens.radius.panelInset,
  timing,
}: Readonly<SelectionIndicatorProps>) {
  const animated = useAnimatedStyle(() => {
    if (!layout) {
      return {};
    }
    const transition = {
      duration: reducedMotion
        ? 0
        : (timing?.duration ?? tokens.motion.navigation.duration),
      easing: timing?.easing ?? Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.Never,
    };
    return {
      left: withTiming(layout.x, transition),
      top: withTiming(layout.y, transition),
      width: withTiming(layout.width, transition),
      height: withTiming(layout.height, transition),
    };
  });
  if (!layout) {
    return null;
  }
  return (
    <Animated.View
      accessible={false}
      pointerEvents="none"
      style={[
        styles.indicator,
        { backgroundColor: fill, borderRadius: radius },
        animated,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  indicator: { position: "absolute" },
});
