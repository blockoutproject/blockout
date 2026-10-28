import { createContext, useContext } from "react";
import { View } from "react-native";

/** The floating tab owner publishes its measured bottom coverage; other route trees reserve nothing. */
export const BottomNavigationInsetContext = createContext(0);

/** Reads presentation clearance without owning focus, keyboard, scrolling or navigation state. */
export function useBottomNavigationInset() {
  return useContext(BottomNavigationInsetContext);
}

/** Native trailing content keeps the final item reachable while preserving the caller's own padding. */
export function BottomNavigationSpacer() {
  const height = useBottomNavigationInset();
  return height > 0 ? (
    <View
      accessible={false}
      pointerEvents="none"
      style={{ height, flexShrink: 0 }}
    />
  ) : null;
}
