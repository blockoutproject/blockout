import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform, StyleSheet, View } from "react-native";
import PagerView from "react-native-pager-view";
import { useTheme } from "../theme/theme-provider";
import { useReducedMotion } from "../theme/use-reduced-motion";
import { tokens } from "../theme/tokens";
import { Tabs, type TabsProps } from "./tabs";

/** Stable feature identities and their explicitly composed scenes; data remains feature-owned. */
export interface PagedTab {
  id: string;
  label: string;
  content: ReactNode;
}

/** Fixed opaque controls above independently scrolling native scenes; Page owns the safe areas. */
export interface PagedTabsProps {
  tabs: readonly PagedTab[];
  selected: string;
  onSelect: (id: string) => void;
  header?: ReactNode;
  /** Wraps the existing choices with feature controls, without exposing the native command. */
  renderTabBar?: (tabBar: ReactNode) => ReactNode;
}

/** Adapts settled native pages to feature identities without shared vertical geometry or progress. */
export function PagedTabs({
  tabs,
  selected,
  onSelect,
  header,
  renderTabBar,
}: PagedTabsProps) {
  const pager = useRef<PagerView>(null);
  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === selected),
  );
  const reported = useRef(index);
  const terminal = useRef(index);
  const instantTarget = useRef<number | null>(null);
  const controlled = useRef(index);
  const reducedMotion = useReducedMotion();
  const { colors } = useTheme();

  /** iOS's animated selected event is early; only an explicit nonanimated command uses it. */
  const move = useCallback(
    (position: number) => {
      instantTarget.current = reducedMotion ? position : null;
      if (reducedMotion) pager.current?.setPageWithoutAnimation(position);
      else pager.current?.setPage(position);
    },
    [reducedMotion],
  );

  /** Suppresses duplicate native confirmations while leaving selected business scope with the feature. */
  function settle(position: number) {
    const tab = tabs[position];
    if (!tab || reported.current === position) return;
    reported.current = position;
    if (tab.id !== selected) onSelect(tab.id);
  }

  useEffect(() => {
    // A content rerender or preference change must not replay the old prop during an in-flight tap.
    if (controlled.current === index) return;
    controlled.current = index;
    if (reported.current === index) return;
    move(index);
  }, [index, move]);

  const choices: TabsProps = {
    items: tabs,
    selected,
    onSelect: (id) => {
      const position = tabs.findIndex((tab) => tab.id === id);
      if (position >= 0) move(position);
    },
  };
  const choicesNode = <Tabs {...choices} />;
  const tabBar = renderTabBar ? (
    renderTabBar(choicesNode)
  ) : (
    <View style={styles.rail}>{choicesNode}</View>
  );
  return (
    <View style={[styles.fill, { backgroundColor: colors.canvas }]}>
      {header}
      {tabBar}
      <PagerView
        ref={pager}
        testID="native-tabs-pager"
        style={styles.fill}
        initialPage={index}
        keyboardDismissMode="on-drag"
        onPageSelected={({ nativeEvent }) => {
          const position = nativeEvent.position;
          if (Platform.OS === "android" || instantTarget.current === position) {
            instantTarget.current = null;
            terminal.current = position;
            settle(position);
          }
        }}
        onPageScroll={
          Platform.OS === "ios"
            ? ({ nativeEvent }) => {
                if (nativeEvent.offset === 0)
                  terminal.current = nativeEvent.position;
              }
            : undefined
        }
        onPageScrollStateChanged={
          Platform.OS === "ios"
            ? ({ nativeEvent }) => {
                if (nativeEvent.pageScrollState === "dragging")
                  instantTarget.current = null;
                if (nativeEvent.pageScrollState === "idle")
                  settle(terminal.current);
              }
            : undefined
        }
      >
        {tabs.map((tab) => (
          <Scene key={tab.id} active={selected === tab.id}>
            {tab.content}
          </Scene>
        ))}
      </PagerView>
    </View>
  );
}

/** First selection mounts the scene once; retained children own their native position and resource lifetime. */
function Scene({ active, children }: { active: boolean; children: ReactNode }) {
  const [visited, setVisited] = useState(active);
  if (active && !visited) setVisited(true);
  return (
    <View
      collapsable={false}
      style={styles.scene}
      pointerEvents={active ? "auto" : "none"}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
    >
      {visited ? children : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scene: { width: "100%", height: "100%" },
  rail: { paddingHorizontal: tokens.spacing.screen },
});
