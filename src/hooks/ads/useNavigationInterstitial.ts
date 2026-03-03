import { useCallback, useEffect } from "react";
import { Platform, StatusBar } from "react-native";
import { AdEventType, InterstitialAd } from "react-native-google-mobile-ads";
import { ADS } from "@/src/config/ads";
import { onAdsReady } from "./adsManager";
import { usePurchases } from "@/src/context/PurchasesProvider";

const CLICKS_BETWEEN_ADS = 10;

let sharedInterstitial: InterstitialAd | null = null;
let listenersAttached = false;

let isLoaded = false;
let isShowing = false;

let pendingNavigate: (() => void) | null = null;

let hasShownFirstAd = false;
let navSinceLastAd = 0;

function ensureInterstitial() {
    if (!sharedInterstitial) {
        sharedInterstitial = InterstitialAd.createForAdRequest(ADS.INTERSTITIAL_NAV);
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
            isShowing = true;
            if (Platform.OS === "ios") StatusBar.setHidden(true);
        });

        sharedInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
            isShowing = false;
            if (Platform.OS === "ios") StatusBar.setHidden(false);

            if (pendingNavigate) {
                const nav = pendingNavigate;
                pendingNavigate = null;
                nav();
            }

            isLoaded = false;
            sharedInterstitial?.load();
        });

        sharedInterstitial.load();
    }
}

export const useNavigationInterstitial = () => {
    const { isPro } = usePurchases();

    useEffect(() => {
        if (isPro) return;
        const unsubscribe = onAdsReady(() => {
            ensureInterstitial();
        });
        return unsubscribe;
    }, [isPro]);

    const handleNavigationWithAd = useCallback(
        (navigate: () => void) => {
            if (isPro) {
                navigate();
                return;
            }

            navSinceLastAd += 1;

            const interstitial = sharedInterstitial;

            if (!interstitial || !isLoaded || isShowing) {
                navigate();
                return;
            }

            if (!hasShownFirstAd) {
                hasShownFirstAd = true;
                navSinceLastAd = 0;

                pendingNavigate = navigate;
                try {
                    interstitial.show();
                    isLoaded = false;
                } catch {
                    pendingNavigate = null;
                    navigate();
                }
                return;
            }

            const shouldShow = navSinceLastAd >= CLICKS_BETWEEN_ADS;

            if (!shouldShow) {
                navigate();
                return;
            }

            navSinceLastAd = 0;
            pendingNavigate = navigate;

            try {
                interstitial.show();
                isLoaded = false;
            } catch {
                pendingNavigate = null;
                navigate();
            }
        },
        [isPro],
    );

    return { handleNavigationWithAd };
};