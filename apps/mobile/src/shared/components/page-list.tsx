import { cloneElement, useContext, type Ref } from "react";
import { TabLegendList } from "react-native-collapsible-tab/legend-list";
import { TabFlatList } from "react-native-collapsible-tab";
import { PagedTabContext } from "./paged-tab-context";
import { FlatList, StyleSheet, type FlatListProps } from "react-native";
import {
  LegendList,
  type LegendListProps,
  type LegendListRef,
} from "@legendapp/list/react-native";
import { useNavigationInset } from "./navigation-backdrop";

/** Native virtualized content scrolls behind the shared pinned chrome. */
export function PageList<T>({
  contentContainerStyle,
  stickyHeaderConfig,
  ...props
}: LegendListProps<T> & { ref?: Ref<LegendListRef> }) {
  const inset = useNavigationInset();
  const tab = useContext(PagedTabContext);
  const content = StyleSheet.flatten(contentContainerStyle);
  const padding =
    content?.paddingTop ?? content?.paddingVertical ?? content?.padding;
  if (tab)
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
  return (
    <LegendList
      {...props}
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
  ...props
}: FlatListProps<T> & { ref?: Ref<FlatList<T>> }) {
  const inset = useNavigationInset();
  const tab = useContext(PagedTabContext);
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
  if (tab)
    return (
      <TabFlatList
        {...props}
        refreshControl={refreshControl}
        contentContainerStyle={contentContainerStyle}
      />
    );
  return (
    <FlatList
      {...props}
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
