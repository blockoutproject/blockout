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
  /** A derived x lets a fixed control drive both its indicator and icon colors. */
  layout?: Omit<LayoutRectangle, "x"> & { x: number | DerivedValue<number> };
  reducedMotion: boolean;
  /** A shared fill animates paint independently of the indicator bounds. */
  fill: string | DerivedValue<string>;
  radius?: number;
}

/** Animates the supplied bounds on the UI thread; reduced motion settles immediately. */
export function SelectionIndicator({
  layout,
  reducedMotion,
  fill,
  radius = tokens.radius.panelInset,
}: Readonly<SelectionIndicatorProps>) {
  const animated = useAnimatedStyle(() => {
    if (!layout) {
      return {};
    }
    const transition = {
      duration: reducedMotion ? 0 : tokens.motion.navigation.duration,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.Never,
    };
    return {
      left:
        typeof layout.x === "number"
          ? withTiming(layout.x, transition)
          : layout.x.value,
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
