import {useCallback} from "react";

/**
 * Preserve navigation semantics on the local web characterization surface
 * without loading the native advertising SDK.
 */
export const useNavigationInterstitial = () => {
  const handleNavigationWithAd = useCallback((navigate: () => void) => {
    navigate();
  }, []);

  return {handleNavigationWithAd};
};
