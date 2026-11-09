import type { ComponentProps } from "react";
import { StyleSheet } from "react-native";
import { DefaultTabBar } from "react-native-collapsible-tab";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { tokens } from "../theme/tokens";
import { useTheme } from "../theme/theme-provider";
import { Tabs } from "./tabs";

/** Every pager keeps library navigation and binds only label color to its existing native progress. */
export function NavigationTabBar({
  reducedMotion,
  ...props
}: Readonly<
  ComponentProps<typeof DefaultTabBar> & {
    /** The shared pager owns one native preference for page commands and the existing static fallback. */
    reducedMotion: boolean;
  }
>) {
  const { colors, membership } = useTheme();
  // RNCT 0.1.3 always animates its rail's auto-centering. Its public renderTabBar
  // slot reuses our existing static rail when the platform requests reduced motion.
  if (reducedMotion) {
    return (
      <Tabs
        items={props.tabNames.map((id) => ({
          id,
          label: props.tabLabels?.[id] ?? id,
        }))}
        selected={props.tabNames[props.activeIndex] ?? ""}
        onSelect={props.onTabPress}
      />
    );
  }
  return (
    <DefaultTabBar
      {...props}
      activeColor={membership.content}
      inactiveColor={colors.secondaryText}
      indicatorColor={membership.fill}
      style={styles.bar}
      tabStyle={styles.tab}
      indicatorStyle={styles.indicator}
      renderLabel={({ label, index, focused }) => (
        <NavigationTabLabel
          label={label}
          index={index}
          focused={focused}
          position={props.indexDecimal}
          activeColor={membership.content}
          inactiveColor={colors.secondaryText}
        />
      )}
    />
  );
}

/** Colors the label from the library's shared position, preserving its settled font-weight behavior. */
function NavigationTabLabel({
  label,
  index,
  focused,
  position,
  activeColor,
  inactiveColor,
}: Readonly<{
  label: string;
  index: number;
  focused: boolean;
  position: SharedValue<number>;
  activeColor: string;
  inactiveColor: string;
}>) {
  const appearance = useAnimatedStyle(() => ({
    color: interpolateColor(
      Math.min(1, Math.abs(position.get() - index)),
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
      {label}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: "transparent",
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  tab: {
    width: "auto",
    minHeight: tokens.touch.minimum,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xs,
    // The library's 12-point content inset plus this margin yields 16 at rest and 8 between tabs.
    marginHorizontal: tokens.spacing.xs,
  },
  indicator: {
    height: "100%",
    borderRadius: tokens.radius.control,
    zIndex: -1,
  },
});
