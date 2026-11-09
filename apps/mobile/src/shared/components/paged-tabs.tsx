import {
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { StyleSheet, View, type ViewInstance } from "react-native";
import { BlurTargetView } from "expo-blur";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
} from "react-native-reanimated";
import {
  Container,
  Tab,
  useCollapsingTabsContext,
  useHeaderMeasurements,
  useCurrentTabScrollY,
  useCollapseProgress,
  type CollapsingTabsRef,
} from "react-native-collapsible-tab";
import {
  NavigationBackdrop,
  NavigationInsetContext,
  NavigationSafeAreaContext,
  useNavigationInset,
} from "./navigation-backdrop";
import { NavigationTabBar } from "./navigation-tab-bar";
import { PagedTabContext } from "./paged-tab-context";
import { useReducedMotion } from "../theme/use-reduced-motion";

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
  /** Home branding follows the native collapse with an unclipped fade; sporting cards keep their fixed-navigation clip. */
  fadeHeaderOnScroll?: boolean;
  /** Composes feature controls beside or below the library's tab bar. */
  renderTabBar?: (tabBar: ReactNode) => ReactNode;
}

/** Supported native container APIs own scene offsets and gestures; overlays sample only scene content. */
export function PagedTabs({
  tabs,
  selected,
  onSelect,
  resetKey,
  header,
  collapsibleHeader,
  fadeHeaderOnScroll = false,
  renderTabBar,
}: PagedTabsProps) {
  const pager = useRef<CollapsingTabsRef>(null);
  const reducedMotion = useReducedMotion();
  const topInset = useContext(NavigationSafeAreaContext);
  const [inset, setInset] = useState(topInset);
  const [visited, setVisited] = useState(() => new Set([selected]));
  if (!visited.has(selected)) {
    setVisited(new Set([...visited, selected]));
  }
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
  if (changed) {
    setIdentities(scenes);
  }
  const names = scenes.map(({ id, generation }) => `${id}:${generation}`);
  const selectedName = names[tabs.findIndex((tab) => tab.id === selected)];
  useEffect(() => {
    if (selectedName && pager.current?.getFocusedTab() !== selectedName) {
      pager.current?.jumpToTab(selectedName, !reducedMotion);
    }
  }, [selectedName, tabs, reducedMotion]);
  return (
    <NavigationInsetContext value={inset}>
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
          <PagerHeader
            inset={inset}
            topInset={topInset}
            onInsetChange={setInset}
            header={header}
            fadeOnScroll={fadeHeaderOnScroll}
            reducedMotion={reducedMotion}
          >
            {collapsibleHeader}
          </PagerHeader>
        )}
        renderTabBar={(props) => {
          const bar = (
            <NavigationTabBar
              {...props}
              reducedMotion={reducedMotion}
              onTabPress={
                reducedMotion
                  ? (id) => pager.current?.jumpToTab(id, false)
                  : props.onTabPress
              }
            />
          );
          return <View>{renderTabBar ? renderTabBar(bar) : bar}</View>;
        }}
        onTabChange={({ tabName }) => {
          const tab = tabs[names.indexOf(tabName)];
          if (tab) {
            onSelect(tab.id);
          }
        }}
      >
        {tabs.map((tab, index) => (
          <Tab key={names[index]} name={names[index]} label={tab.label}>
            <TabScene
              active={selected === tab.id}
              visited={selected === tab.id || visited.has(tab.id)}
            >
              {tab.content}
            </TabScene>
          </Tab>
        ))}
      </Container>
    </NavigationInsetContext>
  );
}

/** Pins measured navigation while sporting cards clip below it and Home branding fades along the native collapse. */
function PagerHeader({
  inset,
  topInset,
  onInsetChange,
  header,
  fadeOnScroll,
  reducedMotion,
  children,
}: {
  inset: number;
  topInset: number;
  onInsetChange: (height: number) => void;
  header: ReactNode;
  fadeOnScroll: boolean;
  reducedMotion: boolean;
  children: ReactNode;
}) {
  const { top } = useHeaderMeasurements();
  const collapse = useCollapseProgress();
  const visibility = useDerivedValue(() => {
    const progress = collapse.get();
    if (reducedMotion) {
      return progress >= 1 ? 0 : 1;
    }
    return 1 - progress;
  });
  const brand = useAnimatedStyle(() => ({ opacity: visibility.get() }));
  const accessibility = useAnimatedProps(() => {
    const hidden = visibility.get() <= 0;
    return {
      accessibilityElementsHidden: hidden,
      importantForAccessibility: hidden
        ? ("no-hide-descendants" as const)
        : ("auto" as const),
    };
  });
  // The identity's clipping edge stays below fixed navigation while the library
  // translates its content. Otherwise a folded logo/card would cover the status bar.
  const clip = useAnimatedStyle(() => ({
    transform: [{ translateY: -top.get() }],
  }));
  const content = useAnimatedStyle(() => ({
    transform: [{ translateY: top.get() }],
  }));
  const pinned = useAnimatedStyle(() => ({
    transform: [{ translateY: -top.get() }],
  }));
  return (
    <View style={{ paddingTop: inset }}>
      {fadeOnScroll ? (
        <Animated.View animatedProps={accessibility} style={brand}>
          {children}
        </Animated.View>
      ) : (
        <Animated.View style={[styles.clip, clip]}>
          <Animated.View style={content}>{children}</Animated.View>
        </Animated.View>
      )}
      <Animated.View pointerEvents="box-none" style={[styles.header, pinned]}>
        <View
          style={{ paddingTop: topInset }}
          onLayout={({ nativeEvent }) =>
            onInsetChange(nativeEvent.layout.height)
          }
        >
          {header}
        </View>
      </Animated.View>
    </View>
  );
}

/** Each stable blur target and its sibling material travel with the native page, without a selection-time target switch. */
function TabScene({
  active,
  visited,
  children,
}: {
  active: boolean;
  visited: boolean;
  children: ReactNode;
}) {
  const inset = useNavigationInset();
  const target = useRef<ViewInstance>(null);
  const { paddingTop, tabBarHeight, headerHeight } = useCollapsingTabsContext();
  const { top } = useHeaderMeasurements();
  const scrollOffset = useCurrentTabScrollY();
  const material = useAnimatedStyle(() => ({
    height: Math.max(0, headerHeight + tabBarHeight + top.get()),
  }));
  const layout = useMemo(
    () => ({ contentInset: paddingTop, stickyInset: inset + tabBarHeight }),
    [paddingTop, inset, tabBarHeight],
  );
  return (
    <View style={styles.fill}>
      <BlurTargetView ref={target} style={styles.fill}>
        <PagedTabContext value={layout}>
          <PagedTabScene active={active} visited={visited}>
            {children}
          </PagedTabScene>
        </PagedTabContext>
      </BlurTargetView>
      {visited && (
        <NavigationBackdrop
          target={target}
          scrollOffset={scrollOffset}
          style={[styles.sceneMaterial, material]}
        />
      )}
    </View>
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
  header: { position: "absolute", top: 0, left: 0, right: 0 },
  scene: { width: "100%", height: "100%" },
  sceneMaterial: { bottom: "auto" },
});
