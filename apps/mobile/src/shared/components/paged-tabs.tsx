import { BlurTargetView } from "expo-blur";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import {
  Tabs,
  DefaultTabBar,
  useActiveTabScrollY,
  useCollapsingTabsContext,
  useHeaderScrollY,
  type CollapsingTabsRef,
  type TabBarRenderProps,
} from "react-native-collapsible-tab";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme-provider";
import { useReducedMotion } from "../theme/use-reduced-motion";
import { tokens } from "../theme/tokens";
import { ScrollBackdrop, type ScrollBlurTarget } from "./scroll-backdrop";

/** Stable feature identities and their explicitly composed content; data stays with each feature. */
export interface PagedTab {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * One native pager with retained lazy pages, measured chrome and official scroll adapters.
 * Compose inside Page without its top edge: this pattern owns the top inset and fixed header.
 * Header is the pinned navigation; collapsibleHeader is optional content that leaves beneath it.
 */
export interface PagedTabsProps {
  /** Object ref exposes RNCT native commands for feature-owned context changes, without another scroll owner. */
  ref?: RefObject<CollapsingTabsRef | null>;
  tabs: readonly PagedTab[];
  selected: string;
  onSelect: (id: string) => void;
  header?: ReactNode;
  collapsibleHeader?: ReactNode;
  renderTabBar?: (props: TabBarRenderProps) => ReactNode;
}

/** Bridges caller-owned tab identities to RNCT's public ref, without owning selection or scroll offsets. */
export function PagedTabs({
  ref: nativePager,
  tabs,
  selected,
  onSelect,
  header,
  collapsibleHeader,
  renderTabBar,
}: PagedTabsProps) {
  const internalPager = useRef<CollapsingTabsRef>(null);
  const pager = nativePager ?? internalPager;
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [pinnedHeight, setPinnedHeight] = useState(insets.top);
  const [targets, setTargets] = useState<
    Record<string, ComponentRef<typeof View> | null>
  >({});
  const registerTarget = useCallback(
    (id: string, target: ComponentRef<typeof View> | null) => {
      setTargets((current) => {
        if (current[id] === target) return current;
        if (target) return { ...current, [id]: target };
        const next = { ...current };
        delete next[id];
        return next;
      });
    },
    [],
  );
  const target: ScrollBlurTarget = useMemo(
    () => (targets[selected] ? { current: targets[selected] } : undefined),
    [selected, targets],
  );
  useEffect(() => {
    if (
      tabs.some((tab) => tab.id === selected) &&
      pager.current?.getFocusedTab() !== selected
    )
      pager.current?.jumpToTab(selected, !reducedMotion);
  }, [selected, tabs, reducedMotion, pager]);
  return (
    <Tabs.Container
      ref={pager}
      lazy
      initialTabName={selected}
      minHeaderHeight={pinnedHeight}
      headerBackgroundColor="transparent"
      pagerProps={{
        testID: "native-tabs-pager",
        keyboardDismissMode: "on-drag",
      }}
      onTabChange={({ tabName }) => {
        if (tabName !== selected) onSelect(tabName);
      }}
      renderHeader={() => (
        <PagedHeader
          target={target}
          pinnedHeight={pinnedHeight}
          onPinnedHeight={setPinnedHeight}
          header={header}
          collapsibleHeader={collapsibleHeader}
        />
      )}
      renderTabBar={(props) => {
        const presentation = {
          ...props,
          onTabPress: (name: string) =>
            pager.current?.jumpToTab(name, !reducedMotion),
        };
        return renderTabBar ? (
          renderTabBar(presentation)
        ) : (
          <PagerTabBar {...presentation} />
        );
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Tab key={tab.id} name={tab.id} label={tab.label}>
          <TabContent
            id={tab.id}
            active={selected === tab.id}
            registerTarget={registerTarget}
          >
            {tab.content}
          </TabContent>
        </Tabs.Tab>
      ))}
    </Tabs.Container>
  );
}

/** A mounted scene publishes its own backdrop target; inactive content stays out of the accessibility tree. */
function TabContent({
  id,
  active,
  registerTarget,
  children,
}: {
  id: string;
  active: boolean;
  registerTarget: (id: string, node: ComponentRef<typeof View> | null) => void;
  children: ReactNode;
}) {
  const ref = useCallback(
    (node: ComponentRef<typeof View> | null) => registerTarget(id, node),
    [id, registerTarget],
  );
  return (
    <BlurTargetView
      ref={ref}
      style={styles.fill}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
    >
      {children}
    </BlurTargetView>
  );
}

/** Native clipping preserves one natural header layout while RNCT alone owns its collapse and gestures. */
function PagedHeader({
  target,
  pinnedHeight,
  onPinnedHeight,
  header,
  collapsibleHeader,
}: {
  target: ScrollBlurTarget;
  pinnedHeight: number;
  onPinnedHeight: (height: number) => void;
  header: ReactNode;
  collapsibleHeader: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { headerHeight, tabBarHeight } = useCollapsingTabsContext();
  const collapse = useHeaderScrollY();
  const scrollY = useActiveTabScrollY();
  const pinned = useAnimatedStyle(() => ({
    transform: [{ translateY: collapse.value }],
  }));
  const scrolling = useAnimatedStyle(() => ({
    transform: [{ translateY: -collapse.value }],
  }));
  return (
    <View style={{ paddingTop: pinnedHeight }}>
      <ScrollBackdrop
        target={target}
        height={headerHeight + tabBarHeight}
        scrollY={scrollY}
      />
      <Animated.View style={[styles.clip, pinned]}>
        <Animated.View style={scrolling}>{collapsibleHeader}</Animated.View>
      </Animated.View>
      <Animated.View pointerEvents="box-none" style={[styles.pinned, pinned]}>
        <View
          style={{ paddingTop: insets.top }}
          onLayout={({ nativeEvent }) =>
            onPinnedHeight(nativeEvent.layout.height)
          }
        >
          {header}
        </View>
      </Animated.View>
    </View>
  );
}

/** Stock RNCT geometry drives the pill and the same continuous label-color progress during taps and swipes. */
export function PagerTabBar(props: TabBarRenderProps) {
  const { colors, membership } = useTheme();
  return (
    <DefaultTabBar
      {...props}
      backgroundColor="transparent"
      activeColor={membership.content}
      inactiveColor={colors.secondaryText}
      indicatorColor={membership.fill}
      style={styles.bar}
      tabStyle={styles.tab}
      indicatorStyle={styles.indicator}
      renderLabel={({ label, index }) => (
        <PagerLabel label={label} index={index} position={props.indexDecimal} />
      )}
    />
  );
}

/** Large labels wrap inside the viewport; color follows the library position without React frame updates. */
function PagerLabel({
  label,
  index,
  position,
}: {
  label: string;
  index: number;
  position: SharedValue<number>;
}) {
  const { colors, membership } = useTheme();
  const { width } = useWindowDimensions();
  const animated = useAnimatedStyle(() => ({
    color: interpolateColor(
      Math.max(0, 1 - Math.abs(position.value - index)),
      [0, 1],
      [colors.secondaryText, membership.content],
    ),
  }));
  return (
    <Animated.Text
      numberOfLines={2}
      style={[
        styles.label,
        { maxWidth: width - 2 * tokens.spacing.screen },
        animated,
      ]}
    >
      {label}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  clip: { overflow: "hidden" },
  pinned: { position: "absolute", left: 0, right: 0, top: 0, zIndex: 1 },
  // RNCT supplies 12 points inside the rail; four more retain the shared 16-point page edge.
  bar: { borderBottomWidth: 0, paddingHorizontal: tokens.spacing.xs },
  tab: {
    minHeight: tokens.touch.minimum,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    marginRight: tokens.spacing.md,
    zIndex: 1,
  },
  indicator: { height: "100%", borderRadius: tokens.radius.control },
  label: { ...tokens.typography.label, textAlign: "center" },
});
