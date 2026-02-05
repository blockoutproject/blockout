import { useEffect } from "react";
import { initAdsOnce } from "./adsManager";

export function useConsentGDPR() {
    useEffect(() => {
        initAdsOnce().catch((e) => {
            console.warn("[Ads] initAdsOnce error", e);
        });
    }, []);
}