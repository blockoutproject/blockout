import { StyleSheet, type LayoutRectangle } from "react-native";
import Animated, {
  Easing,
  LinearTransition,
  ReduceMotion,
} from "react-native-reanimated";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";

/** The owner supplies a selected child's native rectangle in the same borderless coordinate space. */
export interface SelectionIndicatorProps {
  layout?: LayoutRectangle;
  reducedMotion: boolean;
  radius?: number;
}

const transition = LinearTransition.duration(tokens.motion.navigation.duration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);

/** Decorative selection follows native layout; reduced motion also cancels a transition already in progress. */
export function SelectionIndicator({
  layout,
  reducedMotion,
  radius = tokens.radius.control,
}: SelectionIndicatorProps) {
  const { membership } = useTheme();
  if (!layout) return null;
  return (
    <Animated.View
      key={reducedMotion ? "static" : "animated"}
      accessible={false}
      pointerEvents="none"
      layout={reducedMotion ? undefined : transition}
      style={[
        styles.indicator,
        {
          backgroundColor: membership.fill,
          borderRadius: radius,
          left: layout.x,
          top: layout.y,
          width: layout.width,
          height: layout.height,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  indicator: { position: "absolute" },
});
