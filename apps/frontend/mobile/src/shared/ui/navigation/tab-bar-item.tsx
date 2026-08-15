import React from "react";
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import { colors, touchTarget } from "@/src/shared/theme";

const SPRING = { damping: 25, stiffness: 340, mass: 0.8 };

export type TabBarItemProps = {
  options: BottomTabNavigationOptions;
  index: number;
  isFocused: boolean;
  color: string;
  size: number;
  activeIndex: SharedValue<number>;
  onPress: () => void;
  onLongPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
  style?: ViewStyle;
};

/** Renders one accessible destination inside the application tab bar. */
export function TabBarItem({
  options,
  index,
  isFocused,
  color,
  size,
  activeIndex,
  onPress,
  onLongPress,
  onLayout,
  style,
}: TabBarItemProps) {
  const iconAnimatedStyle = useAnimatedStyle(() => {
    const selected = activeIndex.value === index;
    return {
      transform: [
        {
          scale: withSpring(selected ? 1.06 : 1, {
            ...SPRING,
            damping: 14,
          }),
        },
      ],
      opacity: withSpring(selected ? 1 : 0.9),
    };
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onLayout={onLayout}
      style={[styles.item, style]}
      android_ripple={{
        color: colors.overlay.navigationPress,
        borderless: true,
      }}
      accessibilityRole="tab"
      accessibilityLabel={options.tabBarAccessibilityLabel ?? options.title}
      accessibilityState={{ selected: isFocused }}
      testID={options.tabBarButtonTestID}
    >
      <Animated.View style={[styles.icon, iconAnimatedStyle]}>
        {options.tabBarIcon
          ? options.tabBarIcon({ focused: isFocused, color, size })
          : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    width: 74,
    height: touchTarget.minimum,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
