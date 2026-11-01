import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutRectangle,
  type ScrollViewInstance,
} from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../theme/theme-provider";
import { useReducedMotion } from "../theme/use-reduced-motion";
import { tokens } from "../theme/tokens";
import { SelectionIndicator } from "./selection-indicator";

/** Content choices keep settled caller selection and full labels in a horizontally scrolling rail. */
export interface TabsProps {
  items: readonly { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
  /** Home retains its approved compact visual inside a platform-sized touch target. */
  size?: "regular" | "compact";
}

/** Shared content tabs decorate settled selection without tracking the native page trajectory. */
export function Tabs({
  items,
  selected,
  onSelect,
  size = "regular",
}: TabsProps) {
  const rail = useRef<ScrollViewInstance>(null);
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});
  const reducedMotion = useReducedMotion();
  const target = layouts[selected];
  useEffect(() => {
    if (target)
      rail.current?.scrollTo({ x: target.x, animated: !reducedMotion });
  }, [target, reducedMotion]);
  return (
    <ScrollView
      horizontal
      ref={rail}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabs}
    >
      <SelectionIndicator layout={target} reducedMotion={reducedMotion} />
      {items.map((item) => (
        <StandaloneTab
          key={item.id}
          label={item.label}
          selected={selected === item.id}
          compact={size === "compact"}
          reducedMotion={reducedMotion}
          onSelect={() => onSelect(item.id)}
          onMeasure={(layout) =>
            setLayouts((current) => {
              const previous = current[item.id];
              return previous?.x === layout.x &&
                previous.y === layout.y &&
                previous.width === layout.width &&
                previous.height === layout.height
                ? current
                : { ...current, [item.id]: layout };
            })
          }
        />
      ))}
    </ScrollView>
  );
}

/** The unbounded horizontal label keeps its full text; the visual pill retains its native touch target. */
function StandaloneTab({
  label,
  selected,
  compact,
  reducedMotion,
  onSelect,
  onMeasure,
}: {
  label: string;
  selected: boolean;
  compact: boolean;
  reducedMotion: boolean;
  onSelect: () => void;
  onMeasure: (layout: LayoutRectangle) => void;
}) {
  const outer = useRef<LayoutRectangle | undefined>(undefined);
  const inner = useRef<LayoutRectangle | undefined>(undefined);
  const { colors, membership } = useTheme();
  const focus = useDerivedValue(() =>
    withTiming(selected ? 1 : 0, {
      duration: reducedMotion ? 0 : tokens.motion.navigation.duration,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    }),
  );
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      focus.value,
      [0, 1],
      [colors.secondaryText, membership.content],
    ),
  }));
  /** Both native rectangles share the rail's local coordinate system after adding the pill inset. */
  function publishLayout() {
    if (outer.current && inner.current)
      onMeasure({
        x: outer.current.x + inner.current.x,
        y: outer.current.y + inner.current.y,
        width: inner.current.width,
        height: inner.current.height,
      });
  }
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onSelect}
      onLayout={({ nativeEvent }) => {
        outer.current = nativeEvent.layout;
        publishLayout();
      }}
      style={({ pressed }) => [
        styles.target,
        { opacity: pressed ? tokens.opacity.pressed : 1 },
      ]}
    >
      <View
        onLayout={({ nativeEvent }) => {
          inner.current = nativeEvent.layout;
          publishLayout();
        }}
        style={[styles.pill, compact ? styles.compact : styles.regular]}
      >
        <Animated.Text style={[styles.label, labelStyle]}>
          {label}
        </Animated.Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: tokens.spacing.md },
  target: { minHeight: tokens.touch.minimum, justifyContent: "center" },
  pill: {
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.control,
  },
  compact: { minHeight: 38 },
  regular: { minHeight: tokens.touch.minimum },
  label: { ...tokens.typography.label, flexShrink: 1 },
});
