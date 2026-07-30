import React from "react";
import { AppState, Linking } from "react-native";
import { act, render, waitFor } from "@testing-library/react-native";

import {
  AdvertisingProvider,
  useAdvertising,
} from "@/src/modules/advertising/providers/advertising-provider";
import {
  initializeAdvertisingOnce,
  showAdvertisingPrivacyOptions,
} from "@/src/modules/advertising/api/advertising-client";

const mockPurchases = {
  isHydrated: true,
  isPro: false,
};

type MockController = {
  start: jest.Mock;
  run: jest.Mock;
  onForeground: jest.Mock;
  dispose: jest.Mock;
};

const mockControllers: MockController[] = [];

jest.mock("@/src/modules/subscription/providers/purchases-provider", () => ({
  usePurchases: () => mockPurchases,
}));

jest.mock("@/src/modules/advertising/api/advertising-client", () => ({
  initializeAdvertisingOnce: jest.fn(),
  showAdvertisingPrivacyOptions: jest.fn(),
}));

jest.mock("@/src/modules/advertising/config/ads", () => ({
  ADS: {
    INTERSTITIAL_NAV: "test-navigation",
    INTERSTITIAL_WEB: "test-web",
  },
}));

jest.mock("@/src/modules/advertising/api/interstitial-controller", () => ({
  InterstitialController: jest.fn(() => {
    const controller = {
      start: jest.fn(),
      run: jest.fn(),
      onForeground: jest.fn(),
      dispose: jest.fn(),
    };
    mockControllers.push(controller);
    return controller;
  }),
}));

type AdvertisingCommands = ReturnType<typeof useAdvertising>;
let capturedCommands: AdvertisingCommands | null = null;

/** Captures the public provider contract without coupling assertions to UI. */
function AdvertisingConsumer() {
  capturedCommands = useAdvertising();
  return null;
}

describe("advertising provider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockControllers.length = 0;
    mockPurchases.isHydrated = true;
    mockPurchases.isPro = false;
    capturedCommands = null;
    jest.mocked(initializeAdvertisingOnce).mockResolvedValue({
      status: "ready",
      consentEvidence: "fresh",
      canRequestAds: true,
      privacyOptionsRequired: true,
      adapterReadiness: [{ name: "google", ready: true }],
      errorCode: null,
    });
    jest.mocked(showAdvertisingPrivacyOptions).mockResolvedValue({
      status: "ready",
      consentEvidence: "fresh",
      canRequestAds: true,
      privacyOptionsRequired: false,
      adapterReadiness: [{ name: "google", ready: true }],
      errorCode: null,
    });
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    jest
      .spyOn(AppState, "addEventListener")
      .mockReturnValue({ remove: jest.fn() });
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("owns both placements after consent and subscription hydration", async () => {
    await render(
      <AdvertisingProvider>
        <AdvertisingConsumer />
      </AdvertisingProvider>,
    );

    await waitFor(() => expect(mockControllers).toHaveLength(2));
    expect(mockControllers[0].start).toHaveBeenCalledTimes(1);
    expect(mockControllers[1].start).toHaveBeenCalledTimes(1);

    const navigate = jest.fn();
    capturedCommands?.handleNavigationWithAd(navigate);
    capturedCommands?.openLinkWithInterstitial("https://example.test/live");

    expect(mockControllers[0].run).toHaveBeenCalledWith(navigate);
    expect(mockControllers[1].run).toHaveBeenCalledWith(expect.any(Function));
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it("suppresses ads and executes actions directly for premium users", async () => {
    mockPurchases.isPro = true;
    await render(
      <AdvertisingProvider>
        <AdvertisingConsumer />
      </AdvertisingProvider>,
    );

    await waitFor(() => expect(capturedCommands?.status).toBe("ready"));
    expect(mockControllers).toHaveLength(0);

    const navigate = jest.fn();
    capturedCommands?.handleNavigationWithAd(navigate);
    capturedCommands?.openLinkWithInterstitial("https://example.test/live");
    await act(async () => {
      await Promise.resolve();
    });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).toHaveBeenCalledWith("https://example.test/live");
  });

  it("updates the exposed privacy requirement after the UMP form", async () => {
    await render(
      <AdvertisingProvider>
        <AdvertisingConsumer />
      </AdvertisingProvider>,
    );
    await waitFor(() =>
      expect(capturedCommands?.privacyOptionsRequired).toBe(true),
    );

    await act(async () => {
      await capturedCommands?.showPrivacyOptions();
    });

    expect(showAdvertisingPrivacyOptions).toHaveBeenCalledTimes(1);
    expect(capturedCommands?.privacyOptionsRequired).toBe(false);
  });
});
