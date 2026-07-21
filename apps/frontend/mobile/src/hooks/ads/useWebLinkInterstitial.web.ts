import { useCallback } from "react";
import { Linking } from "react-native";

/**
 * Open links directly on the local web characterization surface without
 * loading the native advertising SDK.
 */
export const useWebLinkInterstitial = () => {
  const openLinkWithInterstitial = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {});
  }, []);

  return { openLinkWithInterstitial };
};
