import { cloneElement, createContext, useContext } from "react";
import {
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { SharedValue } from "react-native-reanimated";

/** The viewport supplies clearance and observes the offset of its own native scroller. */
export const PageScrollContext = createContext<{
  offset: SharedValue<number>;
  contentInset: number;
  stickyInset?: number;
  minContentHeight?: number;
} | null>(null);

/** Reserves chrome inside each native scroller while keeping its own scroll and refresh events. */
export function usePageScrollBinding(
  style: StyleProp<ViewStyle>,
  refreshControl?: ScrollViewProps["refreshControl"],
) {
  const page = useContext(PageScrollContext);
  const contentInset = page?.contentInset ?? 0;
  const minContentHeight = page?.minContentHeight ?? 0;
  const content = StyleSheet.flatten(style);
  const padding =
    content?.paddingTop ?? content?.paddingVertical ?? content?.padding;
  return {
    offset: page?.offset,
    stickyInset: page?.stickyInset ?? contentInset,
    refreshControl: refreshControl
      ? cloneElement(refreshControl, {
          progressViewOffset:
            refreshControl.props.progressViewOffset ?? contentInset,
        })
      : undefined,
    clearance: {
      paddingTop: contentInset + (typeof padding === "number" ? padding : 0),
      ...(minContentHeight > 0
        ? {
            minHeight: Math.max(
              typeof content?.minHeight === "number" ? content.minHeight : 0,
              minContentHeight,
            ),
          }
        : undefined),
    },
  };
}
