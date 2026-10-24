import * as Sentry from "@sentry/react-native";
import {
  AdEventType,
  InterstitialAd,
  type AdError,
} from "react-native-google-mobile-ads";
import { createInterstitialLifecycle } from "../interstitial-lifecycle";
import { openSportingAdTransition } from "../sporting-ad-transition";
import {
  advertisingContext,
  controlledInterstitial,
} from "../test-support/interstitial";

jest.mock("react-native-google-mobile-ads", () => ({
  AdEventType: {
    LOADED: "loaded",
    OPENED: "opened",
    CLOSED: "closed",
    ERROR: "error",
  },
  InterstitialAd: { createForAdRequest: jest.fn(() => mockCreateAd()) },
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

const mockCreateAd = jest.fn(controlledInterstitial);
const noFill: AdError = Object.assign(new Error("private provider payload"), {
  namespace: "googleMobileAds",
  jsStack: "",
  userInfo: { code: "no-fill", message: "private provider payload" },
  code: "googleMobileAds/no-fill",
  reason: "no-fill",
  phase: "load" as const,
});

beforeEach(() =>
  mockCreateAd.mockReset().mockImplementation(controlledInterstitial),
);
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

/** One valid accepted sporting intent, with its own transient deduplication key. */
function action() {
  return {
    kind: "match",
    voluntary: true,
    key: {},
    isCurrent: () => true,
    open: jest.fn(),
  };
}

/** Advances only accepted sporting actions; the SDK and time remain controlled by each test. */
async function nineActions(
  lifecycle: ReturnType<typeof createInterstitialLifecycle>,
) {
  for (let index = 0; index < 9; index++)
    await openSportingAdTransition(lifecycle, action());
}

it("preloads one instance with current request options and resets only on OPENED", async () => {
  // Given
  const { input } = advertisingContext();
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => input,
  });
  lifecycle.preload();
  lifecycle.preload();
  const ad = mockCreateAd.mock.results[0].value;
  await nineActions(lifecycle);
  ad.emit(AdEventType.LOADED);

  // When
  const destination = action();
  const result = openSportingAdTransition(lifecycle, destination);
  await Promise.resolve();

  // Then: a resolved show promise neither opens nor dismisses the ad.
  expect(InterstitialAd.createForAdRequest).toHaveBeenCalledWith("test-unit", {
    requestNonPersonalizedAdsOnly: true,
  });
  expect(mockCreateAd).toHaveBeenCalledTimes(1);
  expect(ad.load).toHaveBeenCalledTimes(1);
  expect(lifecycle.count).toBe(10);
  expect(destination.open).not.toHaveBeenCalled();
  ad.emit(AdEventType.OPENED);
  expect(lifecycle.count).toBe(0);
  expect(destination.open).not.toHaveBeenCalled();
  ad.emit(AdEventType.CLOSED);
  expect(await result).toEqual({ status: "opened" });
  expect(destination.open).toHaveBeenCalledTimes(1);
  expect(mockCreateAd).toHaveBeenCalledTimes(2);
  expect(mockCreateAd.mock.results[1].value.load).toHaveBeenCalledTimes(1);
});

it.each(["closed", "error", "rejected", "synchronous"])(
  "releases once on %s before destroy and ignores retired events",
  async (outcome) => {
    // Given
    const { input } = advertisingContext();
    const lifecycle = createInterstitialLifecycle({
      adUnitId: "test-unit",
      getInput: () => input,
    });
    lifecycle.preload();
    const ad = mockCreateAd.mock.results[0].value;
    await nineActions(lifecycle);
    ad.emit(AdEventType.LOADED);
    const destination = action();
    ad.destroy.mockImplementation(() =>
      expect(destination.open).toHaveBeenCalledTimes(1),
    );
    if (outcome === "rejected")
      ad.show.mockRejectedValue(new Error("private provider payload"));
    if (outcome === "synchronous")
      ad.show.mockImplementation(() => {
        throw new Error("private provider payload");
      });

    // When
    const result = openSportingAdTransition(lifecycle, destination);
    if (outcome === "closed") ad.emit(AdEventType.CLOSED);
    if (outcome === "error")
      ad.emit(AdEventType.ERROR, { ...noFill, phase: "show" });
    await result;
    ad.emit(AdEventType.ERROR, noFill);
    ad.emit(AdEventType.CLOSED);
    ad.emit(AdEventType.OPENED);
    ad.emit(AdEventType.LOADED);

    // Then
    expect(destination.open).toHaveBeenCalledTimes(1);
    expect(ad.destroy).toHaveBeenCalledTimes(1);
    expect(lifecycle.count).toBe(10);
    expect(mockCreateAd).toHaveBeenCalledTimes(outcome === "closed" ? 2 : 1);
    if (outcome !== "closed") {
      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      expect(Sentry.captureException).toHaveBeenCalledWith(
        new Error("Interstitial show failed"),
      );
      await openSportingAdTransition(lifecycle, action());
      expect(mockCreateAd).toHaveBeenCalledTimes(2);
    }
  },
);

it("waits for the next eligible sporting action after no-fill without treating it as an incident", async () => {
  // Given
  const { input } = advertisingContext();
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => input,
  });
  lifecycle.preload();
  const ad = mockCreateAd.mock.results[0].value;

  // When
  ad.emit(AdEventType.ERROR, noFill);
  lifecycle.preload();
  await openSportingAdTransition(lifecycle, {
    ...action(),
    kind: "foreground",
  });

  // Then
  expect(mockCreateAd).toHaveBeenCalledTimes(1);
  expect(Sentry.captureException).not.toHaveBeenCalled();
  await openSportingAdTransition(lifecycle, action());
  expect(mockCreateAd).toHaveBeenCalledTimes(2);
  expect(lifecycle.count).toBe(1);
});

it.each([3_599_999, 3_600_000, 3_600_001])(
  "uses LOADED freshness at %i ms and never displays an expired replacement late",
  async (age) => {
    // Given
    const clock = jest.spyOn(Date, "now").mockReturnValue(1000);
    const { input } = advertisingContext();
    const lifecycle = createInterstitialLifecycle({
      adUnitId: "test-unit",
      getInput: () => input,
    });
    lifecycle.preload();
    const ad = mockCreateAd.mock.results[0].value;
    ad.emit(AdEventType.LOADED);
    await nineActions(lifecycle);
    clock.mockReturnValue(1000 + age);
    const destination = action();

    // When
    const result = openSportingAdTransition(lifecycle, destination);

    // Then
    if (age < 3_600_000) {
      expect(ad.show).toHaveBeenCalledTimes(1);
      expect(destination.open).not.toHaveBeenCalled();
      ad.emit(AdEventType.CLOSED);
    } else {
      expect(ad.show).not.toHaveBeenCalled();
      expect(ad.destroy).toHaveBeenCalledTimes(1);
      const replacement = mockCreateAd.mock.results[1].value;
      replacement.emit(AdEventType.LOADED);
      expect(replacement.show).not.toHaveBeenCalled();
    }
    await result;
    expect(destination.open).toHaveBeenCalledTimes(1);
    expect(lifecycle.count).toBe(10);
  },
);

it.each(["privacy", "session", "destination"])(
  "settles %s invalidation before destruction and preserves the count",
  async (change) => {
    // Given
    const { input, session } = advertisingContext();
    const lifecycle = createInterstitialLifecycle({
      adUnitId: "test-unit",
      getInput: () => input,
    });
    lifecycle.preload();
    const ad = mockCreateAd.mock.results[0].value;
    ad.emit(AdEventType.LOADED);
    await nineActions(lifecycle);
    let valid = true;
    const destination = { ...action(), isCurrent: () => valid };
    const result = openSportingAdTransition(lifecycle, destination);
    ad.destroy.mockImplementation(() =>
      expect(destination.open).toHaveBeenCalledTimes(
        change === "privacy" ? 1 : 0,
      ),
    );

    // When
    if (change === "session") session.invalidate();
    if (change === "destination") valid = false;
    lifecycle.invalidate();
    ad.emit(AdEventType.CLOSED);
    ad.emit(AdEventType.OPENED);

    // Then
    expect(await result).toEqual({
      status: change === "privacy" ? "opened" : "abandoned",
    });
    expect(ad.destroy).toHaveBeenCalledTimes(1);
    expect(lifecycle.count).toBe(10);
    expect(mockCreateAd).toHaveBeenCalledTimes(1);
  },
);

it("rechecks authorization before show and discards incompatible session and mode preparation", async () => {
  // Given
  const { input, session } = advertisingContext();
  let current = input;
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => current,
  });
  lifecycle.preload();
  const ad = mockCreateAd.mock.results[0].value;
  ad.emit(AdEventType.LOADED);
  await nineActions(lifecycle);
  current = { ...input, admission: { ordinary: false } };

  // When
  await openSportingAdTransition(lifecycle, action());
  session.invalidate();
  current = {
    ...input,
    choices: {
      session: session.getSnapshot(),
      canRequestAds: true,
      authorizedMode: "personalized",
    },
  };
  lifecycle.preload();

  // Then
  expect(ad.show).not.toHaveBeenCalled();
  expect(ad.destroy).toHaveBeenCalledTimes(1);
  expect(lifecycle.count).toBe(9);
  expect(InterstitialAd.createForAdRequest).toHaveBeenLastCalledWith(
    "test-unit",
    { requestNonPersonalizedAdsOnly: false },
  );
});

it("does not preload after dismissal when current authorization has been withdrawn", async () => {
  // Given
  const { input } = advertisingContext();
  let current = input;
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => current,
  });
  lifecycle.preload();
  const ad = mockCreateAd.mock.results[0].value;
  ad.emit(AdEventType.LOADED);
  await nineActions(lifecycle);
  const result = openSportingAdTransition(lifecycle, action());
  ad.emit(AdEventType.OPENED);
  current = { ...input, choices: null };

  // When
  ad.emit(AdEventType.CLOSED);

  // Then
  await result;
  expect(mockCreateAd).toHaveBeenCalledTimes(1);
  expect(lifecycle.count).toBe(0);
});

it("keeps destination errors separate from ad failure after dismissal", async () => {
  // Given
  const { input } = advertisingContext();
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => input,
  });
  lifecycle.preload();
  const ad = mockCreateAd.mock.results[0].value;
  ad.emit(AdEventType.LOADED);
  await nineActions(lifecycle);
  const error = new Error("Destination unavailable");
  const result = openSportingAdTransition(lifecycle, {
    ...action(),
    open: () => {
      throw error;
    },
  });

  // When
  ad.emit(AdEventType.OPENED);
  ad.emit(AdEventType.CLOSED);

  // Then
  expect(await result).toEqual({ status: "destination-failed", error });
  expect(Sentry.captureException).not.toHaveBeenCalled();
  expect(mockCreateAd).toHaveBeenCalledTimes(2);
});

it("allows restart to abandon a callback-free hang without a watchdog or replay", async () => {
  // Given
  jest.useFakeTimers();
  const { input } = advertisingContext();
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => input,
  });
  lifecycle.preload();
  const ad = mockCreateAd.mock.results[0].value;
  ad.emit(AdEventType.LOADED);
  await nineActions(lifecycle);
  const destination = action();
  const completed = jest.fn();
  void openSportingAdTransition(lifecycle, destination).then(completed);

  // When
  await jest.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
  const restarted = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => input,
  });

  // Then
  expect(completed).not.toHaveBeenCalled();
  expect(destination.open).not.toHaveBeenCalled();
  expect(restarted.count).toBe(0);
  expect(ad.show).toHaveBeenCalledTimes(1);
  expect(mockCreateAd).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

it.each(["create", "load", "sdk-error"])(
  "releases content after %s preparation failure and waits for another eligible action",
  async (failure) => {
    // Given
    const { input } = advertisingContext();
    const lifecycle = createInterstitialLifecycle({
      adUnitId: "test-unit",
      getInput: () => input,
    });
    const ad = controlledInterstitial();
    if (failure === "create")
      mockCreateAd.mockImplementationOnce(() => {
        throw new Error("private provider details");
      });
    else mockCreateAd.mockReturnValueOnce(ad);
    if (failure === "load")
      ad.load.mockImplementationOnce(() => {
        throw new Error("private provider details");
      });

    // When
    lifecycle.preload();
    if (failure === "sdk-error")
      ad.emit(AdEventType.ERROR, { ...noFill, reason: "network-error" });
    lifecycle.preload();
    const destination = action();
    await openSportingAdTransition(lifecycle, destination);

    // Then
    expect(destination.open).toHaveBeenCalledTimes(1);
    expect(lifecycle.count).toBe(1);
    expect(mockCreateAd).toHaveBeenCalledTimes(2);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      new Error("Interstitial load failed"),
    );
  },
);

it.each(["switch", "first-account"])(
  "ignores obsolete OPENED and abandons the destination after %s before provider invalidation",
  async (change) => {
    // Given
    const { input, session } = advertisingContext();
    if (change === "switch")
      session.setAccount(
        session.getSnapshot().generation,
        "00000000-0000-4000-8000-000000000001",
      );
    let current = {
      ...input,
      choices: {
        ...input.choices,
        session: session.getSnapshot(),
        canRequestAds: true,
        authorizedMode: "limited" as const,
      },
    };
    const lifecycle = createInterstitialLifecycle({
      adUnitId: "test-unit",
      getInput: () => current,
    });
    lifecycle.preload();
    const ad = mockCreateAd.mock.results[0].value;
    ad.emit(AdEventType.LOADED);
    await nineActions(lifecycle);
    const destination = action();
    const result = openSportingAdTransition(lifecycle, destination);

    // When
    session.setAccount(
      session.getSnapshot().generation,
      "00000000-0000-4000-8000-000000000002",
    );
    current = {
      ...current,
      choices: { ...current.choices, session: session.getSnapshot() },
    };
    ad.emit(AdEventType.OPENED);
    ad.emit(AdEventType.CLOSED);

    // Then
    expect(await result).toEqual({ status: "abandoned" });
    expect(destination.open).not.toHaveBeenCalled();
    expect(lifecycle.count).toBe(10);
    expect(ad.destroy).toHaveBeenCalledTimes(1);
    expect(mockCreateAd).toHaveBeenCalledTimes(1);
  },
);
