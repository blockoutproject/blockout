import { useCallback, useEffect } from "react";
import { Platform, StatusBar } from "react-native";
import { AdEventType, InterstitialAd } from "react-native-google-mobile-ads";
import { ADS } from "@/src/config/ads";
import { onAdsReady } from "./adsManager";

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

            // Exécute la navigation qui attendait la pub
            if (pendingNavigate) {
                const nav = pendingNavigate;
                pendingNavigate = null;
                nav();
            }

            // On marque la pub comme "consommée"
            isLoaded = false;

            // Recharge immédiatement la suivante
            sharedInterstitial?.load();
        });

        sharedInterstitial.load();
    }
}

export const useNavigationInterstitial = () => {
    useEffect(() => {
        const unsubscribe = onAdsReady(() => {
            ensureInterstitial();
        });
        return unsubscribe;
    }, []);

    const handleNavigationWithAd = useCallback((navigate: () => void) => {
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
    }, []);

    return { handleNavigationWithAd };
};