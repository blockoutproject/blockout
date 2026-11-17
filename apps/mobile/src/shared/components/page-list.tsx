import {
  cloneElement,
  useContext,
  useImperativeHandle,
  useMemo,
  type Ref,
} from "react";
import { TabLegendList } from "react-native-collapsible-tab/legend-list";
import { TabFlatList } from "react-native-collapsible-tab";
import { PagedTabContext } from "./paged-tab-context";
import { FlatList, StyleSheet, type FlatListProps } from "react-native";
import {
  type LegendListProps,
  type LegendListRef,
} from "@legendapp/list/react-native";
import {
  AnimatedLegendList,
  type AnimatedLegendListProps,
} from "@legendapp/list/reanimated";
import { useAnimatedRef, useScrollOffset } from "react-native-reanimated";
import {
  NavigationScrollOffsetContext,
  useNavigationInset,
} from "./navigation-backdrop";

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
  const inset = useNavigationInset();
  const tab = useContext(PagedTabContext);
  const scrollOffset = useContext(NavigationScrollOffsetContext);
  const sharedValues = useMemo(
    () => (scrollOffset ? { scrollOffset } : undefined),
    [scrollOffset],
  );
  const content = StyleSheet.flatten(contentContainerStyle);
  const padding =
    content?.paddingTop ?? content?.paddingVertical ?? content?.padding;
  if (tab) {
    return (
      <TabLegendList
        {...props}
        contentContainerStyle={contentContainerStyle}
        stickyHeaderConfig={{
          ...stickyHeaderConfig,
          offset: tab.stickyInset + (stickyHeaderConfig?.offset ?? 0),
        }}
      />
    );
  }
  return (
    <AnimatedLegendList
      {...props}
      sharedValues={sharedValues}
      contentContainerStyle={[
        contentContainerStyle,
        {
          paddingTop: inset + (typeof padding === "number" ? padding : 0),
        },
      ]}
      stickyHeaderConfig={{
        ...stickyHeaderConfig,
        offset: inset + (stickyHeaderConfig?.offset ?? 0),
      }}
    />
  );
}

/** FlatList consumers keep their data and native ref while reserving the same header clearance. */
export function PageFlatList<T>({
  contentContainerStyle,
  ref,
  ...props
}: Readonly<FlatListProps<T> & { ref?: Ref<FlatList<T>> }>) {
  const inset = useNavigationInset();
  const tab = useContext(PagedTabContext);
  const offset = useContext(NavigationScrollOffsetContext);
  const list = useAnimatedRef<FlatList<T>>();
  useScrollOffset(!tab && offset ? list : null, offset ?? undefined);
  useImperativeHandle<FlatList<T> | null, FlatList<T> | null>(
    tab ? undefined : ref,
    () => list.current,
    [list],
  );
  const content = StyleSheet.flatten(contentContainerStyle);
  const padding =
    content?.paddingTop ?? content?.paddingVertical ?? content?.padding;
  const refreshControl = props.refreshControl
    ? cloneElement(props.refreshControl, {
        progressViewOffset:
          props.refreshControl.props.progressViewOffset ??
          tab?.contentInset ??
          inset,
      })
    : undefined;
  if (tab) {
    return (
      <TabFlatList
        {...props}
        ref={ref}
        refreshControl={refreshControl}
        contentContainerStyle={contentContainerStyle}
      />
    );
  }
  return (
    <FlatList
      {...props}
      ref={list}
      scrollEventThrottle={props.scrollEventThrottle ?? 16}
      refreshControl={refreshControl}
      contentContainerStyle={[
        contentContainerStyle,
        {
          paddingTop: inset + (typeof padding === "number" ? padding : 0),
        },
      ]}
    />
  );
}
