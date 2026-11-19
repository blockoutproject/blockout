import { useImperativeHandle, useMemo, type Ref } from "react";
import { FlatList, type FlatListProps } from "react-native";
import {
  type LegendListProps,
  type LegendListRef,
} from "@legendapp/list/react-native";
import {
  AnimatedLegendList,
  type AnimatedLegendListProps,
} from "@legendapp/list/reanimated";
import { useAnimatedRef, useScrollOffset } from "react-native-reanimated";
import { NavigationScrollMarker } from "./navigation-backdrop";
import { usePageScrollBinding } from "./page-scroll-binding";
import { hiddenScrollIndicators } from "@/shared/native/scroll-indicators";

/** Keeps LegendList's public callbacks while correcting its legacy ScrollView component-ref type. */
type PageListProps<T> = Omit<LegendListProps<T>, "refScrollView"> &
  Pick<AnimatedLegendListProps<T>, "refScrollView"> & {
    ref?: Ref<LegendListRef>;
  };

/** Native virtualized content scrolls behind the shared pinned chrome. */
export function PageList<T>({
  contentContainerStyle,
  stickyHeaderConfig,
  ...props
}: Readonly<PageListProps<T>>) {
  const { offset, stickyInset, clearance } = usePageScrollBinding(
    contentContainerStyle,
  );
  const sharedValues = useMemo(
    () => (offset ? { scrollOffset: offset } : undefined),
    [offset],
  );
  // LegendList already includes content padding in its refresh offset.
  return (
    <NavigationScrollMarker>
      <AnimatedLegendList
        {...props}
        {...hiddenScrollIndicators}
        sharedValues={sharedValues}
        contentContainerStyle={[contentContainerStyle, clearance]}
        stickyHeaderConfig={{
          ...stickyHeaderConfig,
          offset: stickyInset + (stickyHeaderConfig?.offset ?? 0),
        }}
      />
    </NavigationScrollMarker>
  );
}

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
