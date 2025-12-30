import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

const PROD = {
    BANNER_HOME:
        Platform.OS === "android"
            ? process.env.EXPO_PUBLIC_ADS_BANNER_HOME_ANDROID!
            : process.env.EXPO_PUBLIC_ADS_BANNER_HOME_IOS!,

    BANNER_MATCH:
        Platform.OS === "android"
            ? process.env.EXPO_PUBLIC_ADS_BANNER_MATCH_ANDROID!
            : process.env.EXPO_PUBLIC_ADS_BANNER_MATCH_IOS!,

    INTERSTITIAL_NAV:
        Platform.OS === "android"
            ? process.env.EXPO_PUBLIC_ADS_INTERSTITIAL_NAV_ANDROID!
            : process.env.EXPO_PUBLIC_ADS_INTERSTITIAL_NAV_IOS!,

    INTERSTITIAL_WEB:
        Platform.OS === "android"
            ? process.env.EXPO_PUBLIC_ADS_INTERSTITIAL_WEB_ANDROID!
            : process.env.EXPO_PUBLIC_ADS_INTERSTITIAL_WEB_IOS!,
};

export const ADS = __DEV__
    ? {
        BANNER_HOME: TestIds.BANNER,
        BANNER_MATCH: TestIds.BANNER,
        INTERSTITIAL_NAV: TestIds.INTERSTITIAL,
        INTERSTITIAL_WEB: TestIds.INTERSTITIAL,
    }
    : PROD;