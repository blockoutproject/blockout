import {
  createElement,
  isValidElement,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type Ref,
} from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  View,
  type FlatListProps,
} from "react-native";
import {
  LegendList,
  type LegendListProps,
  type LegendListRef,
} from "@legendapp/list/react-native";
import Animated, {
  useAnimatedRef,
  useScrollOffset,
  type AnimatedRef,
} from "react-native-reanimated";
import { NavigationScrollMarker } from "./navigation-backdrop";
import { usePageScrollBinding } from "./page-scroll-binding";
import { hiddenScrollIndicators } from "@/shared/native/scroll-indicators";
import { useBottomContentInset } from "./bottom-content-inset";
import { ContentRevealBlock, type ContentReveal } from "./content-reveal";

interface ListRevealOptions<T> {
  /** Omit structural rows or group cells. Sticky cells reveal their content inside the stationary backing. */
  blockKey?: (item: T) => string | undefined;
  /** Keep the first presentation when feedback or a traversal replaces the scroller. */
  presentation: ContentReveal;
}

type RevealingRows<T> = {
  reveal: ListRevealOptions<T>;
  /** Use stable row identities so refresh and recycling do not transfer a fade to a different item. */
  keyExtractor: (item: T, index: number) => string;
};

/** The page owns the offset published to pinned chrome. */
type PageListProps<T> = LegendListProps<T> & {
  ref?: Ref<LegendListRef>;
  /** The first active read's skeleton, retained decoratively while LegendList measures its first rows. */
  loadingFeedback?: { active: boolean; content: ReactElement };
} & ({ reveal?: never } | RevealingRows<T>);

/** Native virtualized content scrolls behind the shared pinned chrome. */
export function PageList<T>(pageProps: Readonly<PageListProps<T>>) {
  const {
    contentContainerStyle,
    ref,
    // Keep native scroll commands effective when a calendar grid remounts at a new text size.
    renderScrollComponent = (scrollProps) => (
      <Animated.ScrollView {...scrollProps} />
    ),
    maintainVisibleContentPosition,
    stickyHeaderConfig,
    loadingFeedback,
    ListEmptyComponent,
    ListHeaderComponent,
    ListHeaderComponentStyle,
    onReady,
    reveal,
    ...props
  } = pageProps;
  const { offset, stickyInset, clearance } = usePageScrollBinding(
    contentContainerStyle,
  );
  const list = useAnimatedRef<LegendListRef>();
  useScrollOffset(offset ? list : null, offset ?? undefined);
  useImperativeHandle<LegendListRef | null, LegendListRef | null>(
    ref,
    () => list.current,
    [list],
  );
  // Replacing a scroller can change its initial offset before the first native event.
  useLayoutEffect(() => {
    if (offset && list.current) {
      offset.set(list.current.getState().scroll);
    }
  }, [list, offset]);
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
  const nativeProps = {
    ...props,
    ...hiddenScrollIndicators,
    renderScrollComponent,
    ref: list,
    contentContainerStyle: [contentContainerStyle, clearance],
    // On iOS, size anchoring turns measured chrome padding into scroll movement.
    maintainVisibleContentPosition:
      Platform.OS === "ios" && offset
        ? {
            ...(typeof maintainVisibleContentPosition === "object"
              ? maintainVisibleContentPosition
              : { data: maintainVisibleContentPosition === true }),
            size: false,
          }
        : maintainVisibleContentPosition,
    ListEmptyComponent: loading ? loadingFeedback?.content : ListEmptyComponent,
    ListHeaderComponent: header,
    ListHeaderComponentStyle: layoutFeedback
      ? [ListHeaderComponentStyle, styles.loadingHeader]
      : ListHeaderComponentStyle,
    onReady: loadingFeedback
      ? () => {
          setRetainingSkeleton(false);
          onReady?.();
        }
      : onReady,
    stickyHeaderConfig: {
      ...stickyHeaderConfig,
      offset: stickyInset + (stickyHeaderConfig?.offset ?? 0),
    },
  };
  return (
    <NavigationScrollMarker>
      {reveal ? (
        <RevealingLegendList
          {...nativeProps}
          reveal={reveal}
          keyExtractor={pageProps.keyExtractor}
          paddingTop={clearance.paddingTop}
          stickyInset={stickyInset}
        />
      ) : (
        <LegendList {...nativeProps} />
      )}
    </NavigationScrollMarker>
  );
}

function RevealingLegendList<T>({
  reveal,
  paddingTop,
  stickyInset,
  ref: list,
  onReady,
  onMetricsChange,
  renderItem,
  ...props
}: Readonly<
  LegendListProps<T> &
    RevealingRows<T> & {
      paddingTop: number;
      stickyInset: number;
      ref: AnimatedRef<LegendListRef>;
    }
>) {
  const { blockKey = props.keyExtractor, presentation } = reveal;
  const { ready, start, started } = presentation;
  const laidOut = useRef(false);
  const headerHeight = useRef(0);
  const bottomInset = useBottomContentInset();
  const items = props.data;
  const present = useCallback(() => {
    if (!ready || !laidOut.current || started.current || !items?.length) {
      return;
    }
    const viewport = list.current?.getState();
    if (viewport?.start == null || viewport.end == null || viewport.start < 0) {
      return;
    }
    // LegendList's item coordinates exclude the list's header and content padding.
    const origin = viewport.scroll - headerHeight.current - paddingTop;
    const visibleStart = origin + stickyInset;
    const visibleEnd = origin + viewport.scrollLength - bottomInset;
    const keys = new Set<string>();
    for (
      let index = viewport.start;
      index <= viewport.end && index < items.length;
      index++
    ) {
      const top = viewport.positionAtIndex(index);
      if (
        top === undefined ||
        top >= visibleEnd ||
        (top < visibleStart &&
          top + viewport.sizeAtIndex(index) <= visibleStart)
      ) {
        continue;
      }
      const key = blockKey(items[index], index);
      if (key !== undefined) {
        keys.add(key);
      }
    }
    start([...keys]);
  }, [
    blockKey,
    bottomInset,
    items,
    list,
    paddingTop,
    ready,
    start,
    started,
    stickyInset,
  ]);
  useLayoutEffect(present, [present]);

  return (
    <LegendList
      {...props}
      ref={list}
      onReady={() => {
        laidOut.current = true;
        present();
        onReady?.();
      }}
      onMetricsChange={(metrics) => {
        headerHeight.current = metrics.headerSize;
        onMetricsChange?.(metrics);
      }}
      renderItem={
        renderItem &&
        ((info) => {
          const item = renderItem(info);
          if (item == null || props.stickyHeaderIndices?.includes(info.index)) {
            return item;
          }
          const key = blockKey(info.item, info.index);
          return key === undefined ? (
            item
          ) : (
            <ContentRevealBlock reveal={presentation} blockKey={key}>
              {item}
            </ContentRevealBlock>
          );
        })
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingHeader: { zIndex: 1 },
  loadingOverlay: { position: "absolute", top: "100%", left: 0, right: 0 },
});

type PageFlatListProps<T> = FlatListProps<T> & { ref?: Ref<FlatList<T>> };

/** FlatList consumers keep their data and native ref while reserving the same header clearance. */
export function PageFlatList<T>({
  contentContainerStyle,
  ref,
  ...props
}: Readonly<PageFlatListProps<T>>) {
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
