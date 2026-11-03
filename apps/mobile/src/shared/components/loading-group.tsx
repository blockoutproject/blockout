import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

/** One pending announcement; callers own content geometry and supply only decorative, noninteractive shapes. */
export interface LoadingGroupProps {
  label: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Groups shared skeleton primitives without introducing spacing, placement or another scroll owner. */
export function LoadingGroup({ label, children, style }: LoadingGroupProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={style}
    >
      {children}
    </View>
  );
}
