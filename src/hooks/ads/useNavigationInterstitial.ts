import { useCallback } from "react";
import { Platform, StatusBar } from "react-native";
import { AdEventType, InterstitialAd } from "react-native-google-mobile-ads";
import { ADS } from "@/src/config/ads";

const CLICKS_BETWEEN_ADS = 10;

let globalClickCount = 0;
let isLoaded = false;
let pendingNavigate: (() => void) | null = null;

const interstitial = InterstitialAd.createForAdRequest(ADS.INTERSTITIAL_NAV);

interstitial.addAdEventListener(AdEventType.LOADED, () => {
    isLoaded = true;
});

interstitial.addAdEventListener(AdEventType.ERROR, () => {
    isLoaded = false;
});

interstitial.addAdEventListener(AdEventType.OPENED, () => {
    if (Platform.OS === "ios") StatusBar.setHidden(true);
});

interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    if (Platform.OS === "ios") StatusBar.setHidden(false);

    if (pendingNavigate) {
        pendingNavigate();
        pendingNavigate = null;
    }

    isLoaded = false;
    interstitial.load();
});

interstitial.load();

export const useNavigationInterstitial = () => {
    const handleNavigationWithAd = useCallback((navigate: () => void) => {
        globalClickCount += 1;

        const shouldShow =
            globalClickCount === 1 ||
            globalClickCount % CLICKS_BETWEEN_ADS === 0;

        if (!shouldShow || !isLoaded) {
            navigate();
            return;
        }

        pendingNavigate = navigate;
        interstitial.show();
        isLoaded = false;
    }, []);

    return { handleNavigationWithAd };
};