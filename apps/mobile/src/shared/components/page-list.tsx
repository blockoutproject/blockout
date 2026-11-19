import {
  createElement,
  isValidElement,
  useImperativeHandle,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { FlatList, StyleSheet, View, type FlatListProps } from "react-native";
import type { LegendListRef } from "@legendapp/list/react-native";
import {
  AnimatedLegendList,
  type AnimatedLegendListProps,
} from "@legendapp/list/reanimated";
import { useAnimatedRef, useScrollOffset } from "react-native-reanimated";
import { NavigationScrollMarker } from "./navigation-backdrop";
import { usePageScrollBinding } from "./page-scroll-binding";
import {
  InitialContentRevealItem,
  initialRevealLimit,
  useFinishInitialContentReveal,
  useInitialContentReveal,
} from "./initial-content-reveal";
import { hiddenScrollIndicators } from "@/shared/native/scroll-indicators";

/** The page owns the offset published to pinned chrome. */
type PageListProps<T> = Omit<AnimatedLegendListProps<T>, "sharedValues"> & {
  ref?: Ref<LegendListRef>;
  /** The first active read's skeleton, retained decoratively while LegendList measures its first rows. */
  loadingFeedback?: { active: boolean; content: ReactElement };
  /** Omit structural rows and feedback from the first-content cadence. */
  revealItem?: (item: T) => boolean;
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
  onScrollBeginDrag,
  renderItem,
  revealItem,
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
  const [placed, setPlaced] = useState(false);
  if (!hasRows && retainingSkeleton !== loading) {
    setRetainingSkeleton(loading);
  }
  // The loading surface must stay outside the item and header measurements at handoff.
  const layoutFeedback =
    hasRows && retainingSkeleton ? loadingFeedback?.content : undefined;
  const initialIndex = props.initialScrollIndex;
  const finishReveal = useFinishInitialContentReveal();
  const revealRow = useRevealingRows(
    props.data,
    revealItem,
    typeof initialIndex === "number" ? initialIndex : initialIndex?.index,
    !!renderItem && placed && !layoutFeedback,
  );
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
      <AnimatedLegendList<T>
        {...props}
        {...hiddenScrollIndicators}
        renderItem={
          renderItem &&
          ((info) => revealRow(renderItem(info), info.item, info.index))
        }
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
        onReady={() => {
          setPlaced(true);
          if (loadingFeedback) {
            setRetainingSkeleton(false);
          }
          onReady?.();
        }}
        onScrollBeginDrag={(event) => {
          finishReveal?.();
          onScrollBeginDrag?.(event);
        }}
        stickyHeaderConfig={{
          ...stickyHeaderConfig,
          offset: stickyInset + (stickyHeaderConfig?.offset ?? 0),
        }}
      />
    </NavigationScrollMarker>
  );
}

const styles = StyleSheet.create({
  loadingHeader: { zIndex: 1 },
  loadingOverlay: { position: "absolute", top: "100%", left: 0, right: 0 },
});

function firstRevealIndices<T>(
  data: ArrayLike<T> | null | undefined,
  includes: ((item: T) => boolean) | undefined,
  start = 0,
) {
  const indices: number[] = [];
  if (data) {
    for (
      let index = start;
      index < data.length && indices.length < initialRevealLimit;
      index++
    ) {
      if (!includes || includes(data[index])) {
        indices.push(index);
      }
    }
  }
  return indices;
}

function useRevealingRows<T>(
  data: ArrayLike<T> | null | undefined,
  includes: ((item: T) => boolean) | undefined,
  start: number | undefined,
  ready: boolean,
) {
  const indices = firstRevealIndices(data, includes, start);
  useInitialContentReveal(ready && indices.length > 0);
  return function revealRow<Content extends ReactNode>(
    content: Content,
    item: T,
    index: number,
  ) {
    if (content == null || (includes && !includes(item))) {
      return content;
    }
    const rank = indices.indexOf(index);
    // Keep the row host stable when LegendList reassigns a recycled view.
    return (
      <InitialContentRevealItem index={rank}>
        {content}
      </InitialContentRevealItem>
    );
  };
}

/** FlatList consumers keep their data and native ref while reserving the same header clearance. */
export function PageFlatList<T>({
  contentContainerStyle,
  onScrollBeginDrag,
  ref,
  renderItem,
  revealItem,
  ...props
}: Readonly<
  FlatListProps<T> & {
    ref?: Ref<FlatList<T>>;
    revealItem?: (item: T) => boolean;
  }
>) {
  const { offset, clearance, refreshControl } = usePageScrollBinding(
    contentContainerStyle,
    props.refreshControl,
  );
  const list = useAnimatedRef<FlatList<T>>();
  const finishReveal = useFinishInitialContentReveal();
  const revealRow = useRevealingRows(
    props.data,
    revealItem,
    props.initialScrollIndex,
    !!renderItem,
  );
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
        renderItem={
          renderItem &&
          ((info) => revealRow(renderItem(info), info.item, info.index))
        }
        ref={list}
        onScrollBeginDrag={(event) => {
          finishReveal?.();
          onScrollBeginDrag?.(event);
        }}
        scrollEventThrottle={props.scrollEventThrottle ?? 16}
        refreshControl={refreshControl}
        contentContainerStyle={[contentContainerStyle, clearance]}
      />
    </NavigationScrollMarker>
  );
}
