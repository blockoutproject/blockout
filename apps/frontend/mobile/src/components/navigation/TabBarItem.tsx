import React from "react";
import {LayoutChangeEvent, Pressable, StyleSheet, ViewStyle,} from "react-native";
import Animated, {SharedValue, useAnimatedStyle, withSpring,} from "react-native-reanimated";

const SPRING = {damping: 25, stiffness: 340, mass: 0.8};

export type TabBarItemProps = {
  options: any;
  index: number;
  isFocused: boolean;
  color: string;
  size: number;
  activeIndex: SharedValue<number>;
  onPress: () => void;
  onLongPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
  style?: ViewStyle;
};

export const TabBarItem: React.FC<TabBarItemProps> = ({
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
                                                      }) => {
  const iconAnimatedStyle = useAnimatedStyle(() => {
    const selected = activeIndex.value === index;
    return {
      transform: [
        {translateY: withSpring(0, SPRING)},
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
      android_ripple={{color: "rgba(255,255,255,0.05)", borderless: true}}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityState={isFocused ? {selected: true} : {}}
    >
      <Animated.View style={[styles.iconWrap, iconAnimatedStyle]}>
        {options.tabBarIcon
          ? options.tabBarIcon({focused: isFocused, color, size})
          : null}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  iconWrap: {
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
