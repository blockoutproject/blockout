import { useCallback, useEffect } from "react";
import { Linking, Platform, StatusBar } from "react-native";
import { AdEventType, InterstitialAd } from "react-native-google-mobile-ads";
import { ADS } from "@/src/config/ads";
import { onAdsReady } from "./adsManager";
import { usePurchases } from "@/src/context/PurchasesProvider";

let sharedInterstitial: InterstitialAd | null = null;
let isLoaded = false;
let listenersAttached = false;
let pendingUrl: string | null = null;

function ensureInterstitial() {
    if (!sharedInterstitial) {
        sharedInterstitial = InterstitialAd.createForAdRequest(ADS.INTERSTITIAL_WEB);
    }

    if (!listenersAttached && sharedInterstitial) {
        listenersAttached = true;

        sharedInterstitial.addAdEventListener(AdEventType.LOADED, () => {
            isLoaded = true;
        });

        sharedInterstitial.addAdEventListener(AdEventType.ERROR, () => {
            isLoaded = false;
        });

        sharedInterstitial.addAdEventListener(AdEventType.OPENED, () => {
            if (Platform.OS === "ios") StatusBar.setHidden(true);
        });

        sharedInterstitial.addAdEventListener(AdEventType.CLOSED, async () => {
            if (Platform.OS === "ios") StatusBar.setHidden(false);

            const url = pendingUrl;
            pendingUrl = null;

            if (url) {
                try {
                    await Linking.openURL(url);
                } catch { }
            }

            isLoaded = false;
            sharedInterstitial?.load();
        });

        sharedInterstitial.load();
    }
}

export const useWebLinkInterstitial = () => {
    const { isPro } = usePurchases();

    useEffect(() => {
        if (isPro) return;
        const unsubscribe = onAdsReady(() => {
            ensureInterstitial();
        });
        return unsubscribe;
    }, [isPro]);

    const openLinkWithInterstitial = useCallback(
        (url: string) => {
            if (isPro) {
                Linking.openURL(url).catch(() => { });
                return;
            }

            const interstitial = sharedInterstitial;

            if (!interstitial || !isLoaded) {
                Linking.openURL(url).catch(() => { });
                return;
            }

            pendingUrl = url;

            try {
                interstitial.show();
                isLoaded = false;
            } catch {
                pendingUrl = null;
                Linking.openURL(url).catch(() => { });
            }
        },
        [isPro],
    );

    return { openLinkWithInterstitial };
};