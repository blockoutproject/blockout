import * as Sentry from "@sentry/react-native";
import { AdEventType, type AdError } from "react-native-google-mobile-ads";
import { createInterstitialLifecycle } from "../interstitial-lifecycle";
import { controlledInterstitial } from "../test-support/interstitial";

jest.mock("react-native-google-mobile-ads", () => ({
  AdEventType: { LOADED: "loaded", CLOSED: "closed", ERROR: "error" },
  InterstitialAd: { createForAdRequest: () => mockCreateAd() },
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

const mockCreateAd = jest.fn(controlledInterstitial);

function freeLifecycle() {
  let free = true;
  let permitted = true;
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    isFree: () => free,
    canLoad: () => permitted,
  });
  return {
    ...lifecycle,
    setFree: (value: boolean) => {
      free = value;
    },
    setPermission: (value: boolean) => {
      permitted = value;
    },
  };
}

function openNine(lifecycle: ReturnType<typeof createInterstitialLifecycle>) {
  const open = jest.fn();
  for (let index = 0; index < 9; index++) {
    lifecycle.openDestination(open, () => true);
  }
  expect(open).toHaveBeenCalledTimes(9);
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

it("shows one ready interstitial on the tenth action and resumes on dismissal", () => {
  // Given
  const lifecycle = freeLifecycle();
  lifecycle.preload();
  const ad = mockCreateAd.mock.results[0].value;
  ad.emit(AdEventType.LOADED);
  openNine(lifecycle);
  const open = jest.fn();

  // When
  lifecycle.openDestination(open, () => true);

  // Then
  expect(mockCreateAd).toHaveBeenCalledTimes(1);
  expect(ad.load).toHaveBeenCalledTimes(1);
  expect(ad.show).toHaveBeenCalledTimes(1);
  expect(open).not.toHaveBeenCalled();
  ad.emit(AdEventType.CLOSED);
  expect(open).toHaveBeenCalledTimes(1);
  expect(ad.destroy).toHaveBeenCalledTimes(1);
  const replacement = mockCreateAd.mock.results[1].value;
  replacement.emit(AdEventType.LOADED);
  openNine(lifecycle);
  expect(replacement.show).not.toHaveBeenCalled();
});

it("counts free actions while ads are unauthorized and skips an unavailable tenth slot", () => {
  // Given
  const lifecycle = freeLifecycle();
  lifecycle.setPermission(false);
  openNine(lifecycle);
  expect(mockCreateAd).not.toHaveBeenCalled();
  const tenth = jest.fn();

  // When
  lifecycle.openDestination(tenth, () => true);
  lifecycle.setPermission(true);
  lifecycle.preload();
  const ad = mockCreateAd.mock.results[0].value;
  ad.emit(AdEventType.LOADED);
  openNine(lifecycle);

  // Then
  expect(tenth).toHaveBeenCalledTimes(1);
  expect(ad.show).not.toHaveBeenCalled();
  lifecycle.openDestination(jest.fn(), () => true);
  expect(ad.show).toHaveBeenCalledTimes(1);
});

it("ignores repeated taps while a presenting ad owns the accepted action", () => {
  // Given
  const lifecycle = freeLifecycle();
  openNine(lifecycle);
  const ad = mockCreateAd.mock.results[0].value;
  ad.emit(AdEventType.LOADED);
  const open = jest.fn();
  lifecycle.openDestination(open, () => true);

  // When
  lifecycle.openDestination(open, () => true);
  ad.emit(AdEventType.CLOSED);

  // Then
  expect(open).toHaveBeenCalledTimes(1);
  const replacement = mockCreateAd.mock.results[1].value;
  replacement.emit(AdEventType.LOADED);
  openNine(lifecycle);
  expect(replacement.show).not.toHaveBeenCalled();
  lifecycle.openDestination(jest.fn(), () => true);
  expect(replacement.show).toHaveBeenCalledTimes(1);
});

it("leaves an unready tenth action immediate and avoids a late ad", () => {
  // Given
  const lifecycle = freeLifecycle();
  openNine(lifecycle);
  const ad = mockCreateAd.mock.results[0].value;
  const open = jest.fn();

  // When
  lifecycle.openDestination(open, () => true);
  ad.emit(AdEventType.LOADED);

  // Then
  expect(open).toHaveBeenCalledTimes(1);
  expect(ad.show).not.toHaveBeenCalled();
  openNine(lifecycle);
  lifecycle.openDestination(jest.fn(), () => true);
  expect(ad.show).toHaveBeenCalledTimes(1);
});

it("discards expired preparation and does not present its replacement late", () => {
  // Given
  const clock = jest.spyOn(Date, "now").mockReturnValue(0);
  const lifecycle = freeLifecycle();
  openNine(lifecycle);
  const ad = mockCreateAd.mock.results[0].value;
  ad.emit(AdEventType.LOADED);
  clock.mockReturnValue(60 * 60 * 1000);
  const open = jest.fn();

  // When
  lifecycle.openDestination(open, () => true);

  // Then
  expect(open).toHaveBeenCalledTimes(1);
  expect(ad.show).not.toHaveBeenCalled();
  expect(ad.destroy).toHaveBeenCalledTimes(1);
  const replacement = mockCreateAd.mock.results[1].value;
  replacement.emit(AdEventType.LOADED);
  expect(replacement.show).not.toHaveBeenCalled();
});

it.each(["closed", "error", "rejected"] as const)(
  "releases a destination exactly once after %s",
  async (outcome) => {
    // Given
    const lifecycle = freeLifecycle();
    openNine(lifecycle);
    const ad = mockCreateAd.mock.results[0].value;
    ad.emit(AdEventType.LOADED);
    if (outcome === "rejected") {
      ad.show.mockRejectedValueOnce(new Error("Native presentation failed"));
    }
    const open = jest.fn();

    // When
    lifecycle.openDestination(open, () => true);
    if (outcome === "closed") {
      ad.emit(AdEventType.CLOSED);
    } else if (outcome === "error") {
      ad.emit(AdEventType.ERROR);
    }
    await Promise.resolve();
    ad.emit(AdEventType.CLOSED);
    ad.emit(AdEventType.ERROR);

    // Then
    expect(open).toHaveBeenCalledTimes(1);
    expect(ad.destroy).toHaveBeenCalledTimes(1);
    openNine(lifecycle);
    expect(mockCreateAd.mock.results[1].value.show).not.toHaveBeenCalled();
  },
);

it("does not advance the count for Pro or reuse preparation after eligibility is lost", () => {
  // Given
  const lifecycle = freeLifecycle();
  openNine(lifecycle);
  const previous = mockCreateAd.mock.results[0].value;
  previous.emit(AdEventType.LOADED);
  lifecycle.setFree(false);
  const open = jest.fn();

  // When
  lifecycle.openDestination(open, () => true);

  // Then
  expect(open).toHaveBeenCalledTimes(1);
  expect(previous.show).not.toHaveBeenCalled();
  expect(previous.destroy).toHaveBeenCalledTimes(1);
  lifecycle.setFree(true);
  lifecycle.preload();
  const current = mockCreateAd.mock.results[1].value;
  current.emit(AdEventType.LOADED);
  lifecycle.openDestination(open, () => true);
  expect(current.show).toHaveBeenCalledTimes(1);
  expect(open).toHaveBeenCalledTimes(1);
});

it("does not release an obsolete destination or prepare again after eligibility is lost", () => {
  // Given
  const lifecycle = freeLifecycle();
  openNine(lifecycle);
  const ad = mockCreateAd.mock.results[0].value;
  ad.emit(AdEventType.LOADED);
  let current = true;
  const open = jest.fn();
  lifecycle.openDestination(open, () => current);

  // When
  current = false;
  lifecycle.setFree(false);
  ad.emit(AdEventType.CLOSED);

  // Then
  expect(open).not.toHaveBeenCalled();
  expect(mockCreateAd).toHaveBeenCalledTimes(1);
});

it.each(["no-fill", "mediation-no-fill"])(
  "silently retries %s on the next eligible action",
  (reason) => {
    // Given
    const report = jest.spyOn(Sentry, "captureException");
    const lifecycle = freeLifecycle();
    lifecycle.preload();
    const ad = mockCreateAd.mock.results[0].value;
    const error = Object.assign(new Error("Provider details"), {
      reason,
    }) as AdError;
    const open = jest.fn();

    // When
    ad.emit(AdEventType.ERROR, error);

    // Then
    expect(report).not.toHaveBeenCalled();
    expect(mockCreateAd).toHaveBeenCalledTimes(1);
    lifecycle.openDestination(open, () => true);
    expect(open).toHaveBeenCalledTimes(1);
    expect(mockCreateAd).toHaveBeenCalledTimes(2);
  },
);
