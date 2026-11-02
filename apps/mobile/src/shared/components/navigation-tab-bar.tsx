import type { ComponentProps } from "react";
import { StyleSheet, Text } from "react-native";
import { DefaultTabBar } from "react-native-collapsible-tab";
import { tokens } from "../theme/tokens";
import { useTheme } from "../theme/theme-provider";
import { useReducedMotion } from "../theme/use-reduced-motion";
import { Tabs } from "./tabs";

/** Every pager uses the library bar and its native fractional position with shared presentation tokens. */
export function NavigationTabBar(props: ComponentProps<typeof DefaultTabBar>) {
  const { colors, membership } = useTheme();
  const reducedMotion = useReducedMotion();
  // RNCT 0.1.3 always animates its rail's auto-centering. Its public renderTabBar
  // slot reuses our existing static rail when the platform requests reduced motion.
  if (reducedMotion)
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
  return (
    <DefaultTabBar
      {...props}
      activeColor={membership.content}
      inactiveColor={colors.secondaryText}
      indicatorColor={membership.fill}
      style={styles.bar}
      tabStyle={styles.tab}
      indicatorStyle={styles.indicator}
      renderLabel={({ label, color }) => (
        <Text style={[tokens.typography.label, { color }]}>{label}</Text>
      )}
    />
  );
}

const styles = StyleSheet.create({
  bar: {
    // DefaultTabBar's public wrapper cancels its built-in 12-point content inset.
    marginHorizontal: -tokens.spacing.md,
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
    marginRight: tokens.spacing.md,
  },
  indicator: {
    height: "100%",
    borderRadius: tokens.radius.control,
    zIndex: -1,
  },
});
