import {Platform} from "react-native";

import type {AppStatusDTO} from "@/src/types/AppStatus";
import {compareSemver, computeIsUpdateRequired, getStoreUrl,} from "@/src/utils/appVersion";

jest.mock("expo-application", () => ({
  nativeApplicationVersion: "1.3.5",
}));

const appStatus: AppStatusDTO = {
  maintenance: false,
  message: null,
  imageUrl: null,
  lastUpdate: null,
  minVersionIos: "1.4.0",
  minVersionAndroid: "1.3.5",
  storeUrlIos: "https://apps.apple.com/app/blockout",
  storeUrlAndroid: "https://play.google.com/store/apps/details?id=blockout",
};

describe("app version policy", () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {value: originalPlatform});
  });

  it.each([
    ["1.2.3", "1.2.3", 0],
    ["1.2", "1.2.0", 0],
    ["1.10.0", "1.9.9", 1],
    ["2.0.0", "10.0.0", -1],
    ["1.invalid.0", "1.0.0", 0],
  ])("compares %s with %s", (current, minimum, expected) => {
    expect(compareSemver(current, minimum)).toBe(expected);
  });

  it("uses the iOS minimum version and store URL on iOS", () => {
    Object.defineProperty(Platform, "OS", {value: "ios"});

    expect(computeIsUpdateRequired(appStatus)).toBe(true);
    expect(getStoreUrl(appStatus)).toBe(appStatus.storeUrlIos);
  });

  it("uses the Android minimum version and store URL on Android", () => {
    Object.defineProperty(Platform, "OS", {value: "android"});

    expect(computeIsUpdateRequired(appStatus)).toBe(false);
    expect(getStoreUrl(appStatus)).toBe(appStatus.storeUrlAndroid);
  });

  it("does not require an update without an app status", () => {
    expect(computeIsUpdateRequired(undefined)).toBe(false);
    expect(getStoreUrl(undefined)).toBeNull();
  });
});
