import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  type LayoutRectangle,
  type ScrollViewInstance,
} from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { solidForeground } from "@/shared/theme/solid-foreground";

interface NavigationTabBarProps {
  tabs: readonly { id: string; label: string }[];
  selected: number;
  position: SharedValue<number>;
  onTabPress: (index: number) => void;
  reducedMotion: boolean;
  contextColor?: string;
}

/** The indicator and ink follow the same native offset; accessible selection follows settlement. */
export function NavigationTabBar({
  tabs,
  selected,
  position,
  onTabPress,
  reducedMotion,
  contextColor,
}: Readonly<NavigationTabBarProps>) {
  const { colors, membership } = useTheme();
  const selection = contextColor
    ? { fill: contextColor, content: solidForeground(contextColor) }
    : membership;
  const rail = useRef<ScrollViewInstance>(null);
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});
  const [width, setWidth] = useState(0);
  const rectangles = tabs.map(({ id }) => layouts[id]);
  const target = rectangles[selected];
  useEffect(() => {
    if (target && width > 0) {
      rail.current?.scrollTo({
        x: Math.max(0, target.x + (target.width - width) / 2),
        animated: !reducedMotion,
      });
    }
  }, [reducedMotion, target, width]);

  const indicator = useAnimatedStyle(() => {
    const page = reducedMotion ? selected : position.get();
    const index = Math.floor(page);
    const from = rectangles[index] ?? target;
    const to = rectangles[index + 1] ?? from;
    if (!from || !to) {
      return { opacity: 0 };
    }
    const fraction = page - index;
    return {
      opacity: 1,
      left: from.x + (to.x - from.x) * fraction,
      top: from.y + (to.y - from.y) * fraction,
      width: from.width + (to.width - from.width) * fraction,
      height: from.height + (to.height - from.height) * fraction,
    };
  });

  return (
    <ScrollView
      horizontal
      ref={rail}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.rail}
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
    >
      <Animated.View
        accessible={false}
        pointerEvents="none"
        style={[
          styles.indicator,
          { backgroundColor: selection.fill },
          indicator,
        ]}
      />
      {tabs.map(({ id, label }, index) => (
        <Pressable
          key={id}
          accessibilityRole="tab"
          accessibilityLabel={label}
          accessibilityState={{ selected: selected === index }}
          onPress={() => onTabPress(index)}
          onLayout={({ nativeEvent }) => {
            const layout = nativeEvent.layout;
            setLayouts((current) => {
              const prior = current[id];
              return prior?.x === layout.x &&
                prior.y === layout.y &&
                prior.width === layout.width &&
                prior.height === layout.height
                ? current
                : { ...current, [id]: layout };
            });
          }}
          style={({ pressed }) => [
            styles.tab,
            { opacity: pressed ? tokens.opacity.pressed : 1 },
          ]}
        >
          <NavigationTabLabel
            index={index}
            page={reducedMotion ? selected : position}
            focused={selected === index}
            activeColor={selection.content}
            inactiveColor={colors.secondaryText}
          >
            {label}
          </NavigationTabLabel>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function NavigationTabLabel({
  index,
  page,
  focused,
  activeColor,
  inactiveColor,
  children,
}: Readonly<{
  index: number;
  page: number | SharedValue<number>;
  focused: boolean;
  activeColor: string;
  inactiveColor: string;
  children: string;
}>) {
  const appearance = useAnimatedStyle(() => ({
    color: interpolateColor(
      Math.min(
        1,
        Math.abs((typeof page === "number" ? page : page.get()) - index),
      ),
      [0, 1],
      [activeColor, inactiveColor],
    ),
  }));
  return (
    <Animated.Text
      style={[
        tokens.typography.label,
        { fontWeight: focused ? "600" : "400" },
        appearance,
      ]}
    >
      {children}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  rail: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.screen,
  },
  tab: {
    minHeight: tokens.touch.minimum,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xs,
    justifyContent: "center",
  },
  indicator: { position: "absolute", borderRadius: tokens.radius.control },
});
