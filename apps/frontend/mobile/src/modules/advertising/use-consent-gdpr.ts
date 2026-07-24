import { useEffect } from "react";
import { initAdsOnce } from "./ads-manager";

/** Start the native consent flow when its owning screen mounts. */
export function useConsentGDPR() {
  useEffect(() => {
    void initAdsOnce();
  }, []);
}
