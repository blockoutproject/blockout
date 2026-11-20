import { useCallback, useLayoutEffect, useRef } from "react";
import type { FlatListProps } from "react-native";

// Let FlatList collect the initial cell layouts before reporting its first visible batch.
const initialViewability = {
  itemVisiblePercentThreshold: 1,
  minimumViewTime: 16,
};

/** Keeps one viewability snapshot until the scene can present it, then releases it. */
export function useFlatListReveal<T>(
  active: boolean,
  start: (keys: readonly string[]) => boolean,
  keyForItem: (item: T) => string | undefined,
): Pick<FlatListProps<T>, "viewabilityConfig" | "onViewableItemsChanged"> {
  const snapshot = useRef<readonly string[] | null | undefined>(undefined);
  const present = useCallback(() => {
    const keys = snapshot.current;
    if (active && keys && start(keys)) {
      snapshot.current = null;
    }
  }, [active, start]);
  useLayoutEffect(present, [present]);

  return {
    viewabilityConfig: initialViewability,
    onViewableItemsChanged({ viewableItems }) {
      if (snapshot.current === null) {
        return;
      }
      const keys = viewableItems.flatMap(({ item }) => {
        const key = keyForItem(item);
        return key === undefined ? [] : [key];
      });
      // An inactive loading list can report its headers before it has content.
      snapshot.current = active || keys.length ? keys : undefined;
      present();
    },
  };
}
