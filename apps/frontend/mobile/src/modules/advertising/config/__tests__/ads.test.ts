import { TestIds } from "react-native-google-mobile-ads";

import { selectInterstitialAdUnits } from "@/src/modules/advertising/config/ads";

jest.mock("react-native-google-mobile-ads", () => ({
  TestIds: { INTERSTITIAL: "official-test-interstitial" },
}));

describe("advertising inventory", () => {
  it("uses official test inventory outside production", () => {
    expect(
      selectInterstitialAdUnits("test", {
        navigation: "production-navigation",
        web: "production-web",
      }),
    ).toEqual({
      INTERSTITIAL_NAV: TestIds.INTERSTITIAL,
      INTERSTITIAL_WEB: TestIds.INTERSTITIAL,
    });
  });

  it("uses both production units only for the production profile", () => {
    expect(
      selectInterstitialAdUnits("production", {
        navigation: "production-navigation",
        web: "production-web",
      }),
    ).toEqual({
      INTERSTITIAL_NAV: "production-navigation",
      INTERSTITIAL_WEB: "production-web",
    });
  });

  it("fails closed when production inventory is incomplete", () => {
    expect(() =>
      selectInterstitialAdUnits("production", {
        navigation: "production-navigation",
      }),
    ).toThrow(
      "Production AdMob requires navigation and web interstitial unit IDs.",
    );
  });
});
