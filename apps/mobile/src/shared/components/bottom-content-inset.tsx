import { createContext, useContext } from "react";
import { View } from "react-native";

/** Content clearance is supplied by the measured tab capsule or the page’s native bottom safe area. */
export const BottomContentInsetContext = createContext(0);

/** Reads one trailing-content reservation without owning focus, keyboard, scrolling or navigation state. */
export function useBottomContentInset() {
  return useContext(BottomContentInsetContext);
}

/** Reserves clearance inside scrolling content, keeping its viewport full height and its final item reachable. */
export function BottomContentSpacer() {
  const height = useBottomContentInset();
  return height > 0 ? (
    <View
      accessible={false}
      pointerEvents="none"
      style={{ height, flexShrink: 0 }}
    />
  ) : null;
}
