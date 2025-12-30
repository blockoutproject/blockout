import { useCallback } from "react";
import { Platform, StatusBar, Linking } from "react-native";
import { AdEventType, InterstitialAd } from "react-native-google-mobile-ads";
import { ADS } from "@/src/config/ads";

let isLoaded = false;
let pendingOpen: (() => void) | null = null;

const interstitial = InterstitialAd.createForAdRequest(ADS.INTERSTITIAL_WEB);

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

    if (pendingOpen) {
        pendingOpen();
        pendingOpen = null;
    }

    isLoaded = false;
    interstitial.load();
});

interstitial.load();

export const useWebLinkInterstitial = () => {
    const openLinkWithInterstitial = useCallback((url: string) => {
        const open = async () => {
            try {
                await Linking.openURL(url);
            } catch { }
        };

        if (!isLoaded) {
            open();
            return;
        }

        pendingOpen = open;
        interstitial.show();
        isLoaded = false;
    }, []);

    return { openLinkWithInterstitial };
};