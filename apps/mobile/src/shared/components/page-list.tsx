import {
  createElement,
  isValidElement,
  useImperativeHandle,
  useMemo,
  useState,
  type ReactElement,
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
