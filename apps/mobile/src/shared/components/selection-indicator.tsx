import type { ComponentProps } from "react";
import { StyleSheet } from "react-native";
import Animated, { type DerivedValue } from "react-native-reanimated";
import { tokens } from "@/shared/theme/tokens";

interface SelectionIndicatorProps {
  /** The control owns the geometry and supplies it once its bounds are available. */
  style?: ComponentProps<typeof Animated.View>["style"];
  fill: string | DerivedValue<string>;
  radius?: number;
}

/** Decorative selection surface shared by the navigation capsule and standings controls. */
export function SelectionIndicator({
  style,
  fill,
  radius = tokens.radius.panelInset,
}: Readonly<SelectionIndicatorProps>) {
  if (!style) {
    return null;
  }
  return (
    <Animated.View
      accessible={false}
      pointerEvents="none"
      style={[
        styles.indicator,
        { backgroundColor: fill, borderRadius: radius },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  indicator: { position: "absolute" },
});
