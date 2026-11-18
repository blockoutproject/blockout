import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutRectangle,
  type ScrollViewInstance,
} from "react-native";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { SelectionIndicator } from "./selection-indicator";

/** Local selections supply their paired paint; ordinary tabs use membership colors. */
export interface TabSelection {
  fill: string;
  content: string;
  borderColor?: string;
}

/** Content choices keep settled caller selection and full labels in a horizontally scrolling rail. */
export interface TabsProps {
  items: readonly { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
  selection?: TabSelection;
}

/** The reduced-motion rail brings the selected tab into view immediately. */
export function Tabs({
  items,
  selected,
  onSelect,
  selection,
}: Readonly<TabsProps>) {
  const { colors, membership } = useTheme();
  const activeSelection: TabSelection = selection ?? membership;
  const rail = useRef<ScrollViewInstance>(null);
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});
  const target = layouts[selected];
  useEffect(() => {
    if (target) {
      rail.current?.scrollTo({
        x: Math.max(0, target.x - tokens.spacing.screen),
        animated: false,
      });
    }
  }, [target]);
  return (
    <ScrollView
      horizontal
      ref={rail}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabs}
    >
      <SelectionIndicator
        layout={target}
        reducedMotion
        fill={activeSelection.fill}
        borderColor={activeSelection.borderColor}
      />
      {items.map((item) => (
        <StandaloneTab
          key={item.id}
          label={item.label}
          selected={selected === item.id}
          color={
            selected === item.id
              ? activeSelection.content
              : colors.secondaryText
          }
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
  color,
  onSelect,
  onMeasure,
}: Readonly<{
  label: string;
  selected: boolean;
  color: string;
  onSelect: () => void;
  onMeasure: (layout: LayoutRectangle) => void;
}>) {
  const outer = useRef<LayoutRectangle | undefined>(undefined);
  const inner = useRef<LayoutRectangle | undefined>(undefined);

  /** Both native rectangles share the rail's local coordinate system after adding the pill inset. */
  function publishLayout() {
    if (outer.current && inner.current) {
      onMeasure({
        x: outer.current.x + inner.current.x,
        y: outer.current.y + inner.current.y,
        width: inner.current.width,
        height: inner.current.height,
      });
    }
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
        style={styles.pill}
      >
        <Text style={[styles.label, { color }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.screen,
  },
  target: { minHeight: tokens.touch.minimum, justifyContent: "center" },
  pill: {
    minHeight: tokens.touch.minimum,
    justifyContent: "center",
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.control,
  },
  label: { ...tokens.typography.label, flexShrink: 1 },
});
