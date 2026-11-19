import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ViewInstance,
} from "react-native";
import { BlurTargetView } from "expo-blur";
import Animated, {
  clamp,
  makeMutable,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import {
  NavigationBackdrop,
  NavigationInsetContext,
  NavigationSafeAreaContext,
  NavigationScrollMarker,
  NavigationScrollOffsetContext,
} from "./navigation-backdrop";
import { NavigationTabBar } from "./navigation-tab-bar";
import { PagedTabCollapseContext, PagedTabContext } from "./paged-tab-context";
import { tokens } from "@/shared/theme/tokens";
import { useReducedMotion } from "@/shared/theme/use-reduced-motion";

export interface PagedTab {
  id: string;
  label: string;
  content: ReactNode;
  /** A changed reading context replaces only this scene and its native scroll position. */
  resetKey?: string;
  /** Reserves the viewport below pinned controls for content that owns its gestures. */
  fullHeight?: boolean;
}

export interface PagedTabsProps {
  tabs: readonly PagedTab[];
  selected: string;
  onSelect: (id: string) => void;
  contextColor?: string;
  /** A changed shared reading scope resets all offsets while preserving visited admission. */
  resetKey?: string;
  header?: ReactNode;
  collapsibleHeader?: ReactNode;
  /** The Home brand fades while it folds; sporting cards clip below fixed navigation. */
  fadeHeaderOnScroll?: boolean;
  renderTabBar?: (tabBar: ReactNode) => ReactNode;
}

interface SceneOffset {
  id: string;
  resetKey: string | undefined;
  fullHeight: boolean;
  offset: SharedValue<number>;
}

interface TabCommand {
  target: number;
  instant: boolean;
  jump?: { start: number; collapse: number; material: number };
}

/** A visit admits feature content once; the native pager can reset reading geometry independently. */
export function PagedTabs({ resetKey, ...props }: Readonly<PagedTabsProps>) {
  const [visited, setVisited] = useState(() => new Set([props.selected]));
  const visit = useCallback((id: string) => {
    setVisited((current) =>
      current.has(id) ? current : new Set([...current, id]),
    );
  }, []);
  return (
    <NativePagedTabs
      key={resetKey}
      {...props}
      visited={visited}
      onVisit={visit}
    />
  );
}

function NativePagedTabs({
  tabs,
  selected,
  onSelect,
  visited,
  onVisit,
  contextColor,
  header,
  collapsibleHeader,
  fadeHeaderOnScroll = false,
  renderTabBar,
}: Readonly<
  Omit<PagedTabsProps, "resetKey"> & {
    visited: ReadonlySet<string>;
    onVisit: (id: string) => void;
  }
>) {
  const horizontal = useRef<ScrollViewInstance>(null);
  const blurTarget = useRef<ViewInstance>(null);
  const reducedMotion = useReducedMotion();
  const topInset = useContext(NavigationSafeAreaContext);
  const window = useWindowDimensions();
  const [{ width, height }, setViewport] = useState({
    width: window.width,
    height: 0,
  });
  const [pinnedHeight, setPinnedHeight] = useState(
    header ? tokens.layout.header : 0,
  );
  const [brandHeight, setBrandHeight] = useState(0);
  const [railHeight, setRailHeight] = useState(0);
  const [settled, setSettled] = useState(selected);
  const settledTab = useRef(selected);
  const controlledTab = useRef(selected);
  useEffect(() => onVisit(settled), [onVisit, settled]);
  const selectedIndex = Math.max(
    0,
    tabs.findIndex(({ id }) => id === settled),
  );
  const [initialOffset] = useState(() => ({ x: selectedIndex * width, y: 0 }));
  const position = useSharedValue(selectedIndex);
  const command = useSharedValue<TabCommand | null>(null);
  const lastIndex = Math.max(0, tabs.length - 1);
  const headerHeight = collapsibleHeader ? brandHeight : 0;
  const inset = topInset + (header ? pinnedHeight : 0);
  const stickyInset = inset + railHeight;
  const contentInset = stickyInset + headerHeight;

  const [scenes, setScenes] = useState(() =>
    tabs.map((tab) => createSceneOffset(tab)),
  );
  const scenesChanged =
    tabs.length !== scenes.length ||
    tabs.some(
      ({ id, resetKey, fullHeight }, index) =>
        scenes[index]?.id !== id ||
        scenes[index]?.resetKey !== resetKey ||
        scenes[index]?.fullHeight !== Boolean(fullHeight),
    );
  if (scenesChanged) {
    setScenes(
      tabs.map(
        (tab) =>
          scenes.find(
            ({ id, resetKey, fullHeight }) =>
              id === tab.id &&
              resetKey === tab.resetKey &&
              fullHeight === Boolean(tab.fullHeight),
          ) ?? createSceneOffset(tab),
      ),
    );
  }

  const chromeOffset = useDerivedValue(() => {
    const page = position.get();
    const request = command.get();
    return request?.jump
      ? mix(
          request.jump.collapse,
          sceneOffset(scenes[request.target], headerHeight),
          jumpProgress(page, request.jump.start, request.target),
        )
      : visibleOffset(scenes, page, headerHeight);
  });
  const materialOffset = useDerivedValue(() => {
    const page = position.get();
    const request = command.get();
    const limit = tokens.layout.header;
    const visible = visibleOffset(scenes, page, limit);
    if (!request?.jump) {
      return visible;
    }
    // A passing scrolled page still needs material behind the fixed identity.
    return Math.max(
      visible,
      mix(
        request.jump.material,
        sceneOffset(scenes[request.target], limit),
        jumpProgress(page, request.jump.start, request.target),
      ),
    );
  });
  const collapseProgress = useDerivedValue(() =>
    headerHeight > 0 ? chromeOffset.get() / headerHeight : 0,
  );
  const materialStyle = useAnimatedStyle(() => ({
    height: contentInset - chromeOffset.get(),
  }));
  const chromeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: fadeHeaderOnScroll ? -chromeOffset.get() : 0 }],
  }));
  const clipStyle = useAnimatedStyle(() =>
    fadeHeaderOnScroll ? {} : { height: headerHeight - chromeOffset.get() },
  );
  const brandStyle = useAnimatedStyle(() => {
    const progress = collapseProgress.get();
    return fadeHeaderOnScroll
      ? { opacity: reducedMotion ? Number(progress < 1) : 1 - progress }
      : { transform: [{ translateY: -chromeOffset.get() }] };
  });
  const brandAccessibility = useAnimatedProps(() => {
    const hidden = collapseProgress.get() >= 1;
    return {
      accessibilityElementsHidden: hidden,
      importantForAccessibility: hidden
        ? ("no-hide-descendants" as const)
        : ("auto" as const),
    };
  });

  const commit = useCallback(
    (id: string | undefined) => {
      if (id === undefined || id === settledTab.current) {
        return;
      }
      settledTab.current = id;
      setSettled(id);
      onSelect(id);
    },
    [onSelect],
  );
  const scrollHandler = useAnimatedScrollHandler({
    onBeginDrag: () => command.set(null),
    onScroll: ({ contentOffset }) => {
      if (!width) {
        return;
      }
      const previous = position.get();
      const page = clamp(contentOffset.x / width, 0, lastIndex);
      position.set(page);
      const request = command.get();
      if (
        request?.instant &&
        Math.abs(previous - request.target) * width > 1 &&
        Math.abs(contentOffset.x - request.target * width) <= 1
      ) {
        // Keep the destination until a terminal event or another input supersedes it.
        scheduleOnRN(commit, scenes[request.target]?.id);
      }
    },
  });

  const goTo = useCallback(
    (index: number) => {
      const target = scenes[index]?.id;
      if (!target || !width || !horizontal.current) {
        return;
      }
      const current = command.get();
      const from = position.get();
      const atTarget = Math.abs(index - from) * width <= 1;
      if (
        index === current?.target ||
        (!current && atTarget && target === settledTab.current)
      ) {
        return;
      }
      const instant = reducedMotion || atTarget;
      command.set({
        target: index,
        instant,
        jump:
          !instant && (current?.jump || Math.abs(index - from) > 1)
            ? {
                start: from,
                collapse: chromeOffset.get(),
                material: materialOffset.get(),
              }
            : undefined,
      });
      horizontal.current.scrollTo({ x: index * width, animated: !instant });
      // Native can omit a terminal event for a command at its current coordinate.
      if (atTarget) {
        commit(target);
      }
    },
    [
      width,
      scenes,
      reducedMotion,
      command,
      position,
      chromeOffset,
      materialOffset,
      commit,
    ],
  );

  const geometry = useRef({ width, ids: scenes.map(({ id }) => id) });
  useLayoutEffect(() => {
    const previous = geometry.current;
    if (
      previous.width === width &&
      previous.ids.length === scenes.length &&
      scenes.every(({ id }, index) => id === previous.ids[index])
    ) {
      return;
    }
    geometry.current = { width, ids: scenes.map(({ id }) => id) };
    const retainedIndex = scenes.findIndex(
      ({ id }) => id === settledTab.current,
    );
    const index =
      retainedIndex >= 0
        ? retainedIndex
        : Math.max(
            0,
            scenes.findIndex(({ id }) => id === selected),
          );
    command.set(null);
    position.set(index);
    horizontal.current?.scrollTo({ x: index * width, animated: false });
    if (retainedIndex < 0) {
      const id = scenes[index]?.id ?? selected;
      settledTab.current = id;
      setSettled(id);
    }
  }, [width, scenes, command, position, selected]);

  useEffect(() => {
    if (controlledTab.current === selected) {
      return;
    }
    controlledTab.current = selected;
    if (settledTab.current !== selected) {
      goTo(scenes.findIndex(({ id }) => id === selected));
    }
  }, [selected, goTo, scenes]);

  function settle({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!width) {
      return;
    }
    const index = clamp(
      Math.round(nativeEvent.contentOffset.x / width),
      0,
      lastIndex,
    );
    const request = command.get();
    if (Math.abs(nativeEvent.contentOffset.x - index * width) > 1) {
      return;
    }
    if (request && request.target !== index) {
      // An earlier animator can still report an end after a same-coordinate command.
      if (request.instant) {
        horizontal.current?.scrollTo({
          x: request.target * width,
          animated: false,
        });
      }
      return;
    }
    command.set(null);
    position.set(index);
    commit(scenes[index]?.id);
  }

  function finishDrag(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, targetContentOffset, velocity } = event.nativeEvent;
    if (
      targetContentOffset
        ? Math.abs(targetContentOffset.x - contentOffset.x) <= 1
        : !velocity?.x
    ) {
      settle(event);
    }
  }

  const rail = (
    <NavigationTabBar
      tabs={tabs}
      selected={selectedIndex}
      position={position}
      onTabPress={goTo}
      reducedMotion={reducedMotion}
      contextColor={contextColor}
    />
  );

  return (
    <View
      style={styles.fill}
      onLayout={({ nativeEvent: { layout } }) =>
        setViewport((current) =>
          current.width === layout.width && current.height === layout.height
            ? current
            : { width: layout.width, height: layout.height },
        )
      }
    >
      <BlurTargetView ref={blurTarget} style={styles.fill}>
        <NavigationScrollMarker>
          <Animated.ScrollView
            ref={horizontal}
            style={styles.fill}
            testID="native-tabs-pager"
            horizontal
            pagingEnabled
            scrollEnabled={!scenes[selectedIndex]?.fullHeight}
            removeClippedSubviews={false}
            bounces={false}
            directionalLockEnabled
            showsHorizontalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            scrollEventThrottle={16}
            contentOffset={initialOffset}
            onScroll={scrollHandler}
            onScrollEndDrag={finishDrag}
            onMomentumScrollEnd={settle}
          >
            {tabs.map((tab, index) => (
              <TabScene
                key={JSON.stringify([tab.id, tab.resetKey])}
                scene={scenes[index]}
                index={index}
                command={command}
                collapse={chromeOffset}
                active={index === selectedIndex}
                visited={index === selectedIndex || visited.has(tab.id)}
                width={width}
                height={height}
                contentInset={contentInset}
                stickyInset={stickyInset}
                headerHeight={headerHeight}
              >
                {tab.content}
              </TabScene>
            ))}
          </Animated.ScrollView>
        </NavigationScrollMarker>
      </BlurTargetView>
      <NavigationBackdrop
        target={blurTarget}
        scrollOffset={materialOffset}
        style={[styles.material, materialStyle]}
      />
      <Animated.View
        pointerEvents="box-none"
        style={[styles.top, { top: inset }, chromeStyle]}
      >
        {collapsibleHeader && (
          <Animated.View
            pointerEvents="box-none"
            animatedProps={brandAccessibility}
            style={!fadeHeaderOnScroll && [styles.clip, clipStyle]}
          >
            <Animated.View
              pointerEvents="box-none"
              onLayout={({ nativeEvent }) =>
                setBrandHeight(nativeEvent.layout.height)
              }
              style={[!fadeHeaderOnScroll && styles.top, brandStyle]}
            >
              {collapsibleHeader}
            </Animated.View>
          </Animated.View>
        )}
        <View
          onLayout={({ nativeEvent }) =>
            setRailHeight(nativeEvent.layout.height)
          }
        >
          {renderTabBar ? renderTabBar(rail) : rail}
        </View>
      </Animated.View>
      {header && (
        <View
          pointerEvents="box-none"
          style={[styles.top, { paddingTop: topInset }]}
        >
          <View
            onLayout={({ nativeEvent }) =>
              setPinnedHeight(nativeEvent.layout.height)
            }
          >
            <PagedTabCollapseContext value={collapseProgress}>
              {header}
            </PagedTabCollapseContext>
          </View>
        </View>
      )}
    </View>
  );
}

function TabScene({
  scene,
  index,
  command,
  collapse,
  active,
  visited,
  width,
  height,
  contentInset,
  stickyInset,
  headerHeight,
  children,
}: Readonly<{
  scene: SceneOffset;
  index: number;
  command: SharedValue<TabCommand | null>;
  collapse: Pick<SharedValue<number>, "get">;
  active: boolean;
  visited: boolean;
  width: number;
  height: number;
  contentInset: number;
  stickyInset: number;
  headerHeight: number;
  children: ReactNode;
}>) {
  const frame = useAnimatedStyle(() => {
    if (scene.fullHeight) {
      return { top: contentInset - collapse.get() };
    }
    const request = command.get();
    const passing =
      request?.jump &&
      index > Math.min(request.jump.start, request.target) &&
      index < Math.max(request.jump.start, request.target);
    // Align the passing viewport while its vertical scroller retains its offset.
    return {
      top: passing
        ? -Math.max(0, collapse.get() - sceneOffset(scene, headerHeight))
        : 0,
    };
  });
  return (
    <View
      collapsable={false}
      style={[styles.clip, { width, height: height || "100%" }]}
      pointerEvents={active ? "auto" : "none"}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
    >
      {visited && (
        <Animated.View style={[StyleSheet.absoluteFill, frame]}>
          <NavigationInsetContext value={scene.fullHeight ? 0 : stickyInset}>
            <NavigationScrollOffsetContext
              value={scene.fullHeight ? null : scene.offset}
            >
              <PagedTabContext
                value={{
                  contentInset: scene.fullHeight ? 0 : contentInset,
                  stickyInset: scene.fullHeight ? 0 : stickyInset,
                  minContentHeight:
                    scene.fullHeight || !height ? 0 : height + headerHeight,
                }}
              >
                {children}
              </PagedTabContext>
            </NavigationScrollOffsetContext>
          </NavigationInsetContext>
        </Animated.View>
      )}
    </View>
  );
}

function createSceneOffset(tab: PagedTab): SceneOffset {
  return {
    id: tab.id,
    resetKey: tab.resetKey,
    fullHeight: Boolean(tab.fullHeight),
    offset: makeMutable(0),
  };
}

function mix(from: number, to: number, fraction: number) {
  "worklet";
  return from + (to - from) * fraction;
}

function jumpProgress(position: number, from: number, to: number) {
  "worklet";
  return clamp((position - from) / (to - from), 0, 1);
}

function sceneOffset(scene: SceneOffset | undefined, limit: number) {
  "worklet";
  return scene?.fullHeight ? limit : clamp(scene?.offset.get() ?? 0, 0, limit);
}

function visibleOffset(
  scenes: readonly SceneOffset[],
  position: number,
  limit: number,
) {
  "worklet";
  const index = Math.floor(position);
  return mix(
    sceneOffset(scenes[index], limit),
    sceneOffset(scenes[Math.ceil(position)], limit),
    position - index,
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { position: "absolute", top: 0, left: 0, right: 0 },
  clip: { overflow: "hidden" },
  material: { bottom: "auto" },
});
