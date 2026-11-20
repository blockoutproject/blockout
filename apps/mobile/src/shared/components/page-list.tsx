import {
  createElement,
  isValidElement,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type Ref,
  type RefObject,
} from "react";
import { FlatList, StyleSheet, View, type FlatListProps } from "react-native";
import type {
  LegendListMetrics,
  LegendListRef,
} from "@legendapp/list/react-native";
import {
  AnimatedLegendList,
  type AnimatedLegendListProps,
} from "@legendapp/list/reanimated";
import { useAnimatedRef, useScrollOffset } from "react-native-reanimated";
import { NavigationScrollMarker } from "./navigation-backdrop";
import { usePageScrollBinding } from "./page-scroll-binding";
import { hiddenScrollIndicators } from "@/shared/native/scroll-indicators";
import { useBottomContentInset } from "./bottom-content-inset";

/** The page owns the offset published to pinned chrome. */
type PageListProps<T> = Omit<AnimatedLegendListProps<T>, "sharedValues"> & {
  ref?: Ref<LegendListRef>;
  /** The first active read's skeleton, retained decoratively while LegendList measures its first rows. */
  loadingFeedback?: { active: boolean; content: ReactElement };
};

/** Native virtualized content scrolls behind the shared pinned chrome. */
export function PageList<T>({
  contentContainerStyle,
  stickyHeaderConfig,
  loadingFeedback,
  ListEmptyComponent,
  ListHeaderComponent,
  ListHeaderComponentStyle,
  onReady,
  ...props
}: Readonly<PageListProps<T>>) {
  const { offset, stickyInset, clearance } = usePageScrollBinding(
    contentContainerStyle,
  );
  const sharedValues = useMemo(
    () => (offset ? { scrollOffset: offset } : undefined),
    [offset],
  );
  const hasRows = (props.data?.length ?? 0) > 0;
  const loading = !hasRows && loadingFeedback?.active === true;
  const [retainingSkeleton, setRetainingSkeleton] = useState(loading);
  if (!hasRows && retainingSkeleton !== loading) {
    setRetainingSkeleton(loading);
  }
  // The loading surface must stay outside the item and header measurements at handoff.
  const layoutFeedback =
    hasRows && retainingSkeleton ? loadingFeedback?.content : undefined;
  const header =
    loadingFeedback && (ListHeaderComponent || layoutFeedback) ? (
      <>
        {ListHeaderComponent &&
          (isValidElement(ListHeaderComponent)
            ? ListHeaderComponent
            : createElement(ListHeaderComponent))}
        {layoutFeedback && (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={styles.loadingOverlay}
          >
            {layoutFeedback}
          </View>
        )}
      </>
    ) : (
      ListHeaderComponent
    );
  // LegendList already includes content padding in its refresh offset.
  return (
    <NavigationScrollMarker>
      <AnimatedLegendList
        {...props}
        {...hiddenScrollIndicators}
        sharedValues={sharedValues}
        contentContainerStyle={[contentContainerStyle, clearance]}
        ListEmptyComponent={
          loading ? loadingFeedback?.content : ListEmptyComponent
        }
        ListHeaderComponent={header}
        ListHeaderComponentStyle={
          layoutFeedback
            ? [ListHeaderComponentStyle, styles.loadingHeader]
            : ListHeaderComponentStyle
        }
        onReady={
          loadingFeedback
            ? () => {
                setRetainingSkeleton(false);
                onReady?.();
              }
            : onReady
        }
        stickyHeaderConfig={{
          ...stickyHeaderConfig,
          offset: stickyInset + (stickyHeaderConfig?.offset ?? 0),
        }}
      />
    </NavigationScrollMarker>
  );
}

/** Samples LegendList's visible range after layout, including content first shown after the scene settles. */
export function useLegendListReveal<T>({
  list,
  items,
  keyForItem,
  start,
  active,
  contentContainerStyle,
}: Readonly<{
  list: RefObject<LegendListRef | null>;
  items: readonly T[];
  keyForItem: (item: T) => string | undefined;
  start: (keys: readonly string[]) => void;
  active: boolean;
  contentContainerStyle: PageListProps<T>["contentContainerStyle"];
}>) {
  const laidOut = useRef(false);
  const headerHeight = useRef(0);
  const { clearance } = usePageScrollBinding(contentContainerStyle);
  const bottomInset = useBottomContentInset();
  const reveal = useCallback(() => {
    if (!active || !laidOut.current) {
      return;
    }
    const viewport = list.current?.getState();
    if (
      !viewport ||
      viewport.start == null ||
      viewport.start < 0 ||
      viewport.end == null
    ) {
      return;
    }
    // LegendList's item coordinates exclude the list's header and its content padding.
    const visibleEnd =
      viewport.scroll +
      viewport.scrollLength -
      headerHeight.current -
      clearance.paddingTop -
      bottomInset;
    const keys = new Set<string>();
    const visibleItems = items.slice(viewport.start, viewport.end + 1);
    for (const [index, item] of visibleItems.entries()) {
      const top = viewport.positionAtIndex(viewport.start + index);
      if (top === undefined || top >= visibleEnd) {
        continue;
      }
      const key = keyForItem(item);
      if (key !== undefined) {
        keys.add(key);
      }
    }
    start([...keys]);
  }, [
    active,
    bottomInset,
    clearance.paddingTop,
    items,
    keyForItem,
    list,
    start,
  ]);

  useLayoutEffect(reveal, [reveal]);
  return {
    onReady() {
      laidOut.current = true;
      reveal();
    },
    onMetricsChange(metrics: LegendListMetrics) {
      headerHeight.current = metrics.headerSize;
    },
  };
}

const styles = StyleSheet.create({
  loadingHeader: { zIndex: 1 },
  loadingOverlay: { position: "absolute", top: "100%", left: 0, right: 0 },
});

/** FlatList consumers keep their data and native ref while reserving the same header clearance. */
export function PageFlatList<T>({
  contentContainerStyle,
  ref,
  ...props
}: Readonly<FlatListProps<T> & { ref?: Ref<FlatList<T>> }>) {
  const { offset, clearance, refreshControl } = usePageScrollBinding(
    contentContainerStyle,
    props.refreshControl,
  );
  const list = useAnimatedRef<FlatList<T>>();
  useScrollOffset(offset ? list : null, offset ?? undefined);
  useImperativeHandle<FlatList<T> | null, FlatList<T> | null>(
    ref,
    () => list.current,
    [list],
  );
  return (
    <NavigationScrollMarker>
      <FlatList
        {...props}
        {...hiddenScrollIndicators}
        ref={list}
        scrollEventThrottle={props.scrollEventThrottle ?? 16}
        refreshControl={refreshControl}
        contentContainerStyle={[contentContainerStyle, clearance]}
      />
    </NavigationScrollMarker>
  );
}
