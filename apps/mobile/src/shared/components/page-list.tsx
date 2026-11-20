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
import { hiddenScrollIndicators } from "@/shared/native/scroll-indicators";
import { useBottomContentInset } from "./bottom-content-inset";
import {
  ContentRevealBlock,
  useContentReveal,
  type ContentReveal,
} from "./content-reveal";

interface ListRevealOptions<T> {
  /** A retained scene can wait until it is selected and its content is ready. */
  active?: boolean;
  /** Omit structural rows or use the same key for multiple parts of one block. */
  blockKey?: (item: T) => string | undefined;
  /** Keep the first presentation when feedback or a traversal replaces the scroller. */
  presentation?: ContentReveal;
}

type ListReveal<T> = true | ListRevealOptions<T>;
type ListKeyExtractor<T> = (item: T, index: number) => string;

type RevealingRows<T> = {
  reveal: ListReveal<T>;
  /** Use stable row identities so refresh and recycling do not transfer a fade to a different item. */
  keyExtractor: ListKeyExtractor<T>;
};

function revealOptions<T>(
  reveal: ListReveal<T>,
  keyExtractor: ListKeyExtractor<T>,
) {
  const options = reveal === true ? {} : reveal;
  return {
    active: options.active ?? true,
    presentation: options.presentation,
    blockKey: options.blockKey ?? keyExtractor,
  };
}

function renderRevealedItem<Content extends ReactNode>(
  item: Content,
  key: string | undefined,
  reveal: ContentReveal,
) {
  return key === undefined || item == null ? (
    item
  ) : (
    <ContentRevealBlock reveal={reveal} blockKey={key}>
      {item}
    </ContentRevealBlock>
  );
}

/** The page owns the offset published to pinned chrome. */
type PageListProps<T> = Omit<AnimatedLegendListProps<T>, "sharedValues"> & {
  ref?: Ref<LegendListRef>;
  /** The first active read's skeleton, retained decoratively while LegendList measures its first rows. */
  loadingFeedback?: { active: boolean; content: ReactElement };
} & ({ reveal?: never } | RevealingRows<T>);

/** Native virtualized content scrolls behind the shared pinned chrome. */
export function PageList<T>(pageProps: Readonly<PageListProps<T>>) {
  const {
    contentContainerStyle,
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
  const nativeProps = {
    ...props,
    ...hiddenScrollIndicators,
    sharedValues,
    contentContainerStyle: [contentContainerStyle, clearance],
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
        />
      ) : (
        <AnimatedLegendList {...nativeProps} />
      )}
    </NavigationScrollMarker>
  );
}

function RevealingLegendList<T>({
  reveal,
  paddingTop,
  ref,
  onReady,
  onMetricsChange,
  renderItem,
  ...props
}: Readonly<
  AnimatedLegendListProps<T> &
    RevealingRows<T> & {
      paddingTop: number;
      ref?: Ref<LegendListRef>;
    }
>) {
  const ownPresentation = useContentReveal();
  const {
    active,
    blockKey,
    presentation = ownPresentation,
  } = revealOptions(reveal, props.keyExtractor);
  const { start } = presentation;
  const list = useRef<LegendListRef>(null);
  useImperativeHandle<LegendListRef | null, LegendListRef | null>(
    ref,
    () => list.current,
    [list],
  );
  const laidOut = useRef(false);
  const presented = useRef(false);
  const headerHeight = useRef(0);
  const bottomInset = useBottomContentInset();
  const items = props.data;
  const present = useCallback(() => {
    if (!active || !laidOut.current || presented.current || !items?.length) {
      return;
    }
    const viewport = list.current?.getState();
    if (viewport?.start == null || viewport.end == null || viewport.start < 0) {
      return;
    }
    // LegendList's item coordinates exclude the list's header and content padding.
    const visibleEnd =
      viewport.scroll +
      viewport.scrollLength -
      headerHeight.current -
      paddingTop -
      bottomInset;
    const keys = new Set<string>();
    for (
      let index = viewport.start;
      index <= viewport.end && index < items.length;
      index++
    ) {
      const top = viewport.positionAtIndex(index);
      if (top === undefined || top >= visibleEnd) {
        continue;
      }
      const key = blockKey(items[index], index);
      if (key !== undefined) {
        keys.add(key);
      }
    }
    presented.current = start([...keys]);
  }, [active, blockKey, bottomInset, items, paddingTop, start]);
  useLayoutEffect(present, [present]);

  return (
    <AnimatedLegendList
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
        ((info) =>
          renderRevealedItem(
            renderItem(info),
            blockKey(info.item, info.index),
            presentation,
          ))
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingHeader: { zIndex: 1 },
  loadingOverlay: { position: "absolute", top: "100%", left: 0, right: 0 },
});

type NativeFlatListProps<T> = FlatListProps<T> & { ref?: Ref<FlatList<T>> };

type PageFlatListProps<T> = NativeFlatListProps<T> &
  (
    | { reveal?: never }
    | (RevealingRows<T> & {
        /** The standard reveal owns the native viewability observer. */
        onViewableItemsChanged?: never;
        viewabilityConfig?: never;
        viewabilityConfigCallbackPairs?: never;
      })
  );

/** FlatList consumers keep their data and native ref while reserving the same header clearance. */
export function PageFlatList<T>(pageProps: Readonly<PageFlatListProps<T>>) {
  const { contentContainerStyle, ref, reveal, ...props } = pageProps;
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
  const nativeProps = {
    ...props,
    ...hiddenScrollIndicators,
    ref: list,
    scrollEventThrottle: props.scrollEventThrottle ?? 16,
    refreshControl,
    contentContainerStyle: [contentContainerStyle, clearance],
  };
  return (
    <NavigationScrollMarker>
      {reveal ? (
        <RevealingFlatList
          {...nativeProps}
          reveal={reveal}
          keyExtractor={pageProps.keyExtractor}
        />
      ) : (
        <FlatList {...nativeProps} />
      )}
    </NavigationScrollMarker>
  );
}

// Let FlatList collect the initial cell layouts before reporting its first visible batch.
const initialViewability = {
  itemVisiblePercentThreshold: 1,
  minimumViewTime: 16,
};

function RevealingFlatList<T>({
  reveal,
  renderItem,
  ...props
}: Readonly<NativeFlatListProps<T> & RevealingRows<T>>) {
  const ownPresentation = useContentReveal();
  const {
    active,
    blockKey,
    presentation = ownPresentation,
  } = revealOptions(reveal, props.keyExtractor);
  const { start } = presentation;
  const snapshot = useRef<readonly string[] | null | undefined>(undefined);
  const present = useCallback(() => {
    const keys = snapshot.current;
    if (active && keys && start(keys)) {
      snapshot.current = null;
    }
  }, [active, start]);
  useLayoutEffect(present, [present]);
  return (
    <FlatList
      {...props}
      viewabilityConfig={initialViewability}
      onViewableItemsChanged={(event) => {
        if (snapshot.current !== null) {
          const keys = new Set<string>();
          for (const { item, index } of event.viewableItems) {
            const key = index == null ? undefined : blockKey(item, index);
            if (key !== undefined) {
              keys.add(key);
            }
          }
          // A loading list can report structural rows before it has content.
          if (keys.size || (active && event.viewableItems.length)) {
            snapshot.current = [...keys];
            present();
          } else {
            snapshot.current = undefined;
          }
        }
      }}
      renderItem={
        renderItem &&
        ((info) =>
          renderRevealedItem(
            renderItem(info),
            blockKey(info.item, info.index),
            presentation,
          ))
      }
    />
  );
}
