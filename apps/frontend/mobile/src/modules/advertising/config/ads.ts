import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";

export type AdsEnvironment = "production" | "test";

export type InterstitialAdUnits = {
  INTERSTITIAL_NAV: string;
  INTERSTITIAL_WEB: string;
};

type ProductionAdUnits = {
  navigation?: string;
  web?: string;
};

/**
 * Selects official test inventory unless an explicit production profile
 * provides both production interstitial units.
 */
export function selectInterstitialAdUnits(
  environment: AdsEnvironment,
  production: ProductionAdUnits,
): InterstitialAdUnits {
  if (environment === "test") {
    return {
      INTERSTITIAL_NAV: TestIds.INTERSTITIAL,
      INTERSTITIAL_WEB: TestIds.INTERSTITIAL,
    };
  }

  if (!production.navigation || !production.web) {
    throw new Error(
      "Production AdMob requires navigation and web interstitial unit IDs.",
    );
  }

  return {
    INTERSTITIAL_NAV: production.navigation,
    INTERSTITIAL_WEB: production.web,
  };
}

export const ADS_ENVIRONMENT: AdsEnvironment =
  process.env.EXPO_PUBLIC_ADS_ENVIRONMENT === "production"
    ? "production"
    : "test";

const productionAdUnits: ProductionAdUnits =
  Platform.OS === "android"
    ? {
        navigation: process.env.EXPO_PUBLIC_ADS_INTERSTITIAL_NAV_ANDROID,
        web: process.env.EXPO_PUBLIC_ADS_INTERSTITIAL_WEB_ANDROID,
      }
    : {
        navigation: process.env.EXPO_PUBLIC_ADS_INTERSTITIAL_NAV_IOS,
        web: process.env.EXPO_PUBLIC_ADS_INTERSTITIAL_WEB_IOS,
      };

export const ADS = selectInterstitialAdUnits(
  ADS_ENVIRONMENT,
  productionAdUnits,
);
