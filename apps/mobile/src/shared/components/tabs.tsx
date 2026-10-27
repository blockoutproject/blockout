import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type ScrollViewInstance,
  View,
} from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
/** Exact tab identities and full accessible labels; each visible label fits within the native rail. */
export interface TabsProps {
  items: readonly { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
  /** Home uses the UI Library compact pill inside a separate platform-sized interaction target. */
  size?: "regular" | "compact";
}

/** Native scrollable tab rail; compact Home labels stay on one line and the selected destination stays reachable. */
export function Tabs({
  items,
  selected,
  onSelect,
  size = "regular",
}: TabsProps) {
  const { colors, membership } = useTheme();
  const rail = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState<number>();
  const positions = useRef<Record<string, number>>({});
  useEffect(() => {
    rail.current?.scrollTo({
      x: positions.current[selected] ?? 0,
      animated: false,
    });
  }, [selected]);
  return (
    <ScrollView
      horizontal
      ref={rail}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabs}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="tab"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: selected === item.id }}
          onLayout={(event) => {
            positions.current[item.id] = event.nativeEvent.layout.x;
            if (selected === item.id)
              rail.current?.scrollTo({
                x: event.nativeEvent.layout.x,
                animated: false,
              });
          }}
          onPress={() => onSelect(item.id)}
          style={({ pressed }) => [
            size === "compact" ? styles.compactTarget : styles.tab,
            {
              maxWidth: size === "compact" ? undefined : width,
              opacity: pressed ? tokens.opacity.pressed : 1,
              backgroundColor:
                selected === item.id && size === "regular"
                  ? membership.fill
                  : "transparent",
            },
          ]}
        >
          <View
            style={
              size === "compact"
                ? [
                    styles.compactPill,
                    {
                      backgroundColor:
                        selected === item.id ? membership.fill : "transparent",
                    },
                  ]
                : undefined
            }
          >
            <Text
              numberOfLines={size === "compact" ? 1 : 2}
              ellipsizeMode="tail"
              style={[
                styles.tabLabel,
                {
                  color:
                    selected === item.id
                      ? membership.content
                      : colors.secondaryText,
                },
              ]}
            >
              {item.label}
            </Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: tokens.spacing.md },
  compactTarget: { minHeight: tokens.touch.minimum, justifyContent: "center" },
  compactPill: {
    overflow: "hidden",
    minHeight: 38,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.control,
    justifyContent: "center",
  },
  tab: {
    minHeight: tokens.touch.minimum,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.control,
    justifyContent: "center",
  },
  tabLabel: { ...tokens.typography.label, flexShrink: 1 },
});
