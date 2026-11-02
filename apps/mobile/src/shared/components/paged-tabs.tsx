import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { StyleSheet, View, type ViewInstance } from "react-native";
import { BlurTargetView } from "expo-blur";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import {
  Container,
  Tab,
  useCollapsingTabsContext,
  useHeaderMeasurements,
  type CollapsingTabsRef,
} from "react-native-collapsible-tab";
import {
  NavigationBackdrop,
  PageViewport,
  useNavigationInset,
} from "./navigation-backdrop";
import { NavigationTabBar } from "./navigation-tab-bar";
import { PagedTabContext } from "./paged-tab-context";
import { tokens } from "../theme/tokens";

/** Stable feature identities and their explicitly composed scenes; data remains feature-owned. */
export interface PagedTab {
  id: string;
  label: string;
  content: ReactNode;
  /** A changed reading context replaces only this scene and its native scroll memory. */
  resetKey?: string;
}

/** The same library owns all paging, continuous tab progress and optional header collapse. */
export interface PagedTabsProps {
  tabs: readonly PagedTab[];
  selected: string;
  onSelect: (id: string) => void;
  /** Replaces all native scroll geometry when the shared reading scope changes, retaining visited admission. */
  resetKey?: string;
  /** Page navigation remains pinned above the tab rail. */
  header?: ReactNode;
  /** Home branding or sporting identity folds as a scene scrolls. */
  collapsibleHeader?: ReactNode;
  /** Composes feature controls beside or below the library's tab bar. */
  renderTabBar?: (tabBar: ReactNode) => ReactNode;
}

/** One shared composition supports fixed controls and an optional collapsible identity. */
export function PagedTabs({ header, ...props }: PagedTabsProps) {
  return (
    <PageViewport header={header} backdrop={false}>
      <PagedTabsViewport {...props} />
    </PageViewport>
  );
}

/** Supported native container APIs own scene offsets and gestures; overlays sample only scene content. */
function PagedTabsViewport({
  tabs,
  selected,
  onSelect,
  resetKey,
  collapsibleHeader,
  renderTabBar,
}: PagedTabsProps) {
  const pager = useRef<CollapsingTabsRef>(null);
  const inset = useNavigationInset();
  const [visited, setVisited] = useState(() => new Set([selected]));
  if (!visited.has(selected)) setVisited(new Set([...visited, selected]));
  const [identities, setIdentities] = useState(() =>
    tabs.map(({ id, resetKey }) => ({ id, resetKey, generation: 0 })),
  );
  const changed =
    tabs.length !== identities.length ||
    tabs.some(
      (tab, index) =>
        tab.id !== identities[index]?.id ||
        tab.resetKey !== identities[index]?.resetKey,
    );
  const scenes = changed
    ? tabs.map(({ id, resetKey }) => {
        const previous = identities.find((scene) => scene.id === id);
        return {
          id,
          resetKey,
          generation:
            (previous?.generation ?? 0) +
            (previous && previous.resetKey !== resetKey ? 1 : 0),
        };
      })
    : identities;
  // RNCT retains offsets by name even after removal. A generation prevents an
  // old search from resurrecting its former position when its criteria return.
  if (changed) setIdentities(scenes);
  const names = scenes.map(({ id, generation }) => `${id}:${generation}`);
  const selectedName = names[tabs.findIndex((tab) => tab.id === selected)];
  const targetKey = JSON.stringify([resetKey, selectedName]);
  const [target, setTarget] = useState<{
    key: string;
    node: ViewInstance | null;
  } | null>(null);
  const updateTarget = useCallback(
    (node: ViewInstance | null) => {
      setTarget({ key: targetKey, node });
    },
    [targetKey],
  );
  // A replaced native scene must never expose its detached handle to a new BlurView.
  const blurTarget = useMemo(
    () => ({
      current: target?.key === targetKey ? target.node : null,
    }),
    [target, targetKey],
  );
  useEffect(() => {
    if (selectedName && pager.current?.getFocusedTab() !== selectedName)
      pager.current?.jumpToTab(selectedName, false);
  }, [selectedName, tabs]);
  return (
    <Container
      key={resetKey}
      ref={pager}
      initialTabName={selectedName}
      lazy={false}
      pagerProps={{
        testID: "native-tabs-pager",
        keyboardDismissMode: "on-drag",
      }}
      minHeaderHeight={inset}
      headerBackgroundColor="transparent"
      renderHeader={() => (
        <PagerHeader target={blurTarget} inset={inset}>
          {collapsibleHeader}
        </PagerHeader>
      )}
      renderTabBar={(props) => {
        const bar = (
          <NavigationTabBar
            {...props}
            onTabPress={(id) => pager.current?.jumpToTab(id, false)}
          />
        );
        return (
          <View>
            {renderTabBar ? (
              renderTabBar(bar)
            ) : (
              <View style={styles.rail}>{bar}</View>
            )}
          </View>
        );
      }}
      onTabChange={({ tabName }) => {
        const tab = tabs[names.indexOf(tabName)];
        if (tab) onSelect(tab.id);
      }}
    >
      {tabs.map((tab, index) => (
        <Tab key={names[index]} name={names[index]} label={tab.label}>
          <TabScene
            active={selected === tab.id}
            visited={selected === tab.id || visited.has(tab.id)}
            onTarget={updateTarget}
          >
            {tab.content}
          </TabScene>
        </Tab>
      ))}
    </Container>
  );
}

/** The library moves one continuous material behind the status area, fixed navigation and tab rail. */
function PagerHeader({
  target,
  inset,
  children,
}: {
  target: { current: ViewInstance | null };
  inset: number;
  children: ReactNode;
}) {
  const { tabBarHeight } = useCollapsingTabsContext();
  const { top } = useHeaderMeasurements();
  // The identity's clipping edge stays below fixed navigation while the library
  // translates its content. Otherwise a folded logo/card would cover the status bar.
  const clip = useAnimatedStyle(() => ({
    transform: [{ translateY: -top.get() }],
  }));
  const content = useAnimatedStyle(() => ({
    transform: [{ translateY: top.get() }],
  }));
  return (
    <View style={{ paddingTop: inset }}>
      <NavigationBackdrop target={target} style={{ bottom: -tabBarHeight }} />
      <Animated.View style={[styles.clip, clip]}>
        <Animated.View style={content}>{children}</Animated.View>
      </Animated.View>
    </View>
  );
}

/** Publishes the library's measured content and sticky clearances to native scroll adapters. */
function TabScene({
  active,
  visited,
  onTarget,
  children,
}: {
  active: boolean;
  visited: boolean;
  onTarget: (target: ViewInstance | null) => void;
  children: ReactNode;
}) {
  const inset = useNavigationInset();
  const { paddingTop, tabBarHeight } = useCollapsingTabsContext();
  const layout = useMemo(
    () => ({ contentInset: paddingTop, stickyInset: inset + tabBarHeight }),
    [paddingTop, inset, tabBarHeight],
  );
  return (
    <BlurTargetView ref={active ? onTarget : undefined} style={styles.fill}>
      <PagedTabContext value={layout}>
        <PagedTabScene active={active} visited={visited}>
          {children}
        </PagedTabScene>
      </PagedTabContext>
    </BlurTargetView>
  );
}

/** First selection mounts the scene once; retained children own their native position and resource lifetime. */
export function PagedTabScene({
  active,
  visited,
  children,
}: {
  active: boolean;
  visited: boolean;
  children: ReactNode;
}) {
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
  clip: { overflow: "hidden" },
  scene: { width: "100%", height: "100%" },
  rail: { paddingHorizontal: tokens.spacing.screen },
});
