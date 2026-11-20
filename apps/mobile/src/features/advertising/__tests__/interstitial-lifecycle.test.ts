import * as Sentry from "@sentry/react-native";
import { AdEventType, InterstitialAd } from "react-native-google-mobile-ads";
import { createInterstitialLifecycle } from "../interstitial-lifecycle";
import { controlledInterstitial } from "../test-support/interstitial";

jest.mock("react-native-google-mobile-ads", () => ({
  AdEventType: { LOADED: "loaded", CLOSED: "closed", ERROR: "error" },
  InterstitialAd: { createForAdRequest: jest.fn() },
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

let ad: ReturnType<typeof controlledInterstitial>;

beforeEach(() => {
  ad = controlledInterstitial();
  jest
    .mocked(InterstitialAd.createForAdRequest)
    .mockReset()
    .mockImplementation(
      () => controlledInterstitial() as unknown as InterstitialAd,
    );
  jest
    .mocked(InterstitialAd.createForAdRequest)
    .mockReturnValueOnce(ad as unknown as InterstitialAd);
  jest.mocked(Sentry.captureException).mockClear();
});

afterEach(() => jest.restoreAllMocks());

it.each([
  "dismissal",
  "native failure",
  "request rejection",
  "synchronous failure",
])(
  "opens the tenth destination once on %s and starts another cycle",
  async (completion) => {
    // Given
    const lifecycle = createInterstitialLifecycle({
      adUnitId: "synthetic-unit",
      isEligibleOpening: () => true,
      canRequestAds: () => true,
    });
    const push = jest.fn();
    lifecycle.preload();
    ad.emit(AdEventType.LOADED);
    if (completion === "request rejection") {
      ad.show.mockRejectedValueOnce(new Error("Unavailable presentation"));
    } else if (completion === "synchronous failure") {
      ad.show.mockImplementationOnce(() => {
        throw new Error("Unavailable presentation");
      });
    }

    // When
    for (let index = 0; index < 9; index++) {
      lifecycle.open(true, push);
    }
    expect(push).toHaveBeenCalledTimes(9);
    expect(ad.show).not.toHaveBeenCalled();
    lifecycle.open(true, push);
    if (completion === "dismissal") {
      expect(push).toHaveBeenCalledTimes(9);
      lifecycle.open(true, push);
      ad.emit(AdEventType.CLOSED);
    } else if (completion === "native failure") {
      expect(push).toHaveBeenCalledTimes(9);
      ad.emit(AdEventType.ERROR);
    }
    await Promise.resolve();
    ad.emit(AdEventType.CLOSED);
    ad.emit(AdEventType.CLOSED);

    // Then
    expect(ad.show).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(10);
    expect(ad.destroy).toHaveBeenCalledTimes(1);
    lifecycle.open(true, push);
    expect(push).toHaveBeenCalledTimes(11);
  },
);

it.each(["no ad", "unsuitable transition", "no permission", "expired ad"])(
  "consumes the tenth opportunity immediately with %s",
  (reason) => {
    // Given
    const now = jest.spyOn(Date, "now").mockReturnValue(0);
    const nextAd = controlledInterstitial();
    jest
      .mocked(InterstitialAd.createForAdRequest)
      .mockReturnValueOnce(nextAd as unknown as InterstitialAd);
    const lifecycle = createInterstitialLifecycle({
      adUnitId: "synthetic-unit",
      isEligibleOpening: () => true,
      canRequestAds: () => reason !== "no permission",
    });
    const push = jest.fn();
    lifecycle.preload();
    if (reason !== "no ad") {
      ad.emit(AdEventType.LOADED);
    }
    if (reason === "expired ad") {
      now.mockReturnValue(3_600_000);
    }

    // When
    for (let index = 0; index < 9; index++) {
      lifecycle.open(true, push);
    }
    lifecycle.open(reason !== "unsuitable transition", push);
    if (reason === "expired ad") {
      nextAd.emit(AdEventType.LOADED);
    } else {
      ad.emit(AdEventType.LOADED);
    }
    for (let index = 0; index < 9; index++) {
      lifecycle.open(true, push);
    }

    // Then
    expect(push).toHaveBeenCalledTimes(19);
    expect(ad.show).not.toHaveBeenCalled();
    expect(nextAd.show).not.toHaveBeenCalled();
    lifecycle.open(true, push);
    if (reason !== "no permission") {
      expect(
        reason === "expired ad" ? nextAd.show : ad.show,
      ).toHaveBeenCalledTimes(1);
      expect(push).toHaveBeenCalledTimes(19);
    } else {
      expect(InterstitialAd.createForAdRequest).not.toHaveBeenCalled();
      expect(push).toHaveBeenCalledTimes(20);
    }
  },
);

it("opens ineligible details immediately and leaves the current cycle intact", () => {
  // Given
  let eligible = true;
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "synthetic-unit",
    isEligibleOpening: () => eligible,
    canRequestAds: () => eligible,
  });
  const push = jest.fn();
  lifecycle.preload();
  ad.emit(AdEventType.LOADED);
  for (let index = 0; index < 9; index++) {
    lifecycle.open(true, push);
  }

  // When
  eligible = false;
  lifecycle.open(true, push);
  expect(push).toHaveBeenCalledTimes(10);
  expect(ad.show).not.toHaveBeenCalled();
  eligible = true;
  lifecycle.open(true, push);

  // Then
  expect(ad.show).toHaveBeenCalledTimes(1);
  expect(push).toHaveBeenCalledTimes(10);
  ad.emit(AdEventType.CLOSED);
  expect(push).toHaveBeenCalledTimes(11);
});

it("counts eligible sporting openings while UMP permission is unavailable", () => {
  // Given
  let permitted = false;
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "synthetic-unit",
    isEligibleOpening: () => true,
    canRequestAds: () => permitted,
  });
  const push = jest.fn();
  for (let index = 0; index < 8; index++) {
    lifecycle.open(true, push);
  }
  expect(InterstitialAd.createForAdRequest).not.toHaveBeenCalled();

  // When
  permitted = true;
  lifecycle.preload();
  ad.emit(AdEventType.LOADED);
  lifecycle.open(true, push);
  lifecycle.open(true, push);

  // Then
  expect(push).toHaveBeenCalledTimes(9);
  expect(ad.show).toHaveBeenCalledTimes(1);
  ad.emit(AdEventType.CLOSED);
  expect(push).toHaveBeenCalledTimes(10);
});
