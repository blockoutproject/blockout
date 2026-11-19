import { useContext } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import {
  NavigationScrollOffsetContext,
  useNavigationInset,
} from "./navigation-backdrop";
import { PagedTabContext } from "./paged-tab-context";

/** Reserves chrome inside each native scroller while keeping its own scroll and refresh events. */
export function usePageScrollBinding(style: StyleProp<ViewStyle>) {
  const inset = useNavigationInset();
  const tab = useContext(PagedTabContext);
  const offset = useContext(NavigationScrollOffsetContext);
  const contentInset = tab?.contentInset ?? inset;
  const content = StyleSheet.flatten(style);
  const padding =
    content?.paddingTop ?? content?.paddingVertical ?? content?.padding;
  return {
    offset,
    contentInset,
    stickyInset: tab?.stickyInset ?? inset,
    clearance: {
      paddingTop: contentInset + (typeof padding === "number" ? padding : 0),
      ...(tab && tab.minContentHeight > 0
        ? {
            minHeight: Math.max(
              typeof content?.minHeight === "number" ? content.minHeight : 0,
              tab.minContentHeight,
            ),
          }
        : undefined),
    },
  };
}
