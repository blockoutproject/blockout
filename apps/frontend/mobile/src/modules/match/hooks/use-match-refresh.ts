import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

/**
 * Coordinates pull-to-refresh, screen-focus, and foreground match refetches.
 */
export function useMatchRefresh(refetch: () => Promise<unknown>) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => {},
    );
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      void refetch();
      return undefined;
    }, [refetch]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasInBackground =
        appState.current.match(/inactive|background/) && nextState === "active";

      if (wasInBackground && isFocused) {
        void refetch();
      }

      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [isFocused, refetch]);

  return { isRefreshing, refresh };
}
