import type { AdvertisingEligibilityInput } from "../advertising-eligibility";
import { AdEventType } from "react-native-google-mobile-ads";
import { entitlement } from "../../pro/test-support/customer-info";
import { createInterstitialLifecycle } from "../interstitial-lifecycle";
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
beforeEach(() =>
  mockCreateAd.mockReset().mockImplementation(controlledInterstitial),
);
/** A new accepted intent; repeated submissions reuse this same key. */
function action() {
  return {
    key: {},
    isCurrent: () => true,
    open: jest.fn(),
  };
}
it("shares the first nine accepted actions and the tenth opportunity", async () => {
  // Given
  const { input } = advertisingContext();
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => input,
  });
  lifecycle.preload();
  const ad = mockCreateAd.mock.results[0].value;
  ad.emit(AdEventType.LOADED);
  // When
  for (let index = 0; index < 9; index++) {
    const destination = action();
    expect(await lifecycle.transition(destination)).toEqual({
      status: "opened",
    });
    expect(destination.open).toHaveBeenCalledTimes(1);
  }
  const live = action();
  const result = lifecycle.transition(live);
  // Then
  expect(lifecycle.count).toBe(10);
  expect(ad.show).toHaveBeenCalledTimes(1);
  expect(live.open).not.toHaveBeenCalled();
  ad.emit(AdEventType.OPENED);
  expect(lifecycle.count).toBe(0);
  ad.emit(AdEventType.CLOSED);
  expect(await result).toEqual({ status: "opened" });
  expect(live.open).toHaveBeenCalledTimes(1);
});
it("caps missing and loading opportunities at ten without waiting or showing on late load", async () => {
  // Given
  const { input } = advertisingContext();
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => input,
  });
  // When
  for (let index = 0; index < 12; index++) {
    const destination = action();
    await lifecycle.transition(destination);
    expect(destination.open).toHaveBeenCalledTimes(1);
  }
  expect(lifecycle.count).toBe(10);
  const ad = mockCreateAd.mock.results[0].value;
  ad.emit(AdEventType.LOADED);
  // Then
  expect(lifecycle.count).toBe(10);
  expect(mockCreateAd).toHaveBeenCalledTimes(1);
  expect(ad.show).not.toHaveBeenCalled();
});
it("counts a repeated pending action once and refuses a different concurrent destination", async () => {
  // Given
  const { input } = advertisingContext();
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => input,
  });
  lifecycle.preload();
  const ad = mockCreateAd.mock.results[0].value;
  ad.emit(AdEventType.LOADED);
  for (let index = 0; index < 9; index++) await lifecycle.transition(action());
  const destination = action();
  const other = action();
  // When
  const first = lifecycle.transition(destination);
  const repeated = lifecycle.transition(destination);
  const refused = await lifecycle.transition(other);
  // Then
  expect(first).toBe(repeated);
  expect(refused).toEqual({ status: "busy" });
  expect(other.open).not.toHaveBeenCalled();
  expect(lifecycle.count).toBe(10);
  expect(ad.show).toHaveBeenCalledTimes(1);
  ad.emit(AdEventType.CLOSED);
  await first;
  expect(destination.open).toHaveBeenCalledTimes(1);
});
it.each(["active", "unknown"])(
  "adds no debt for %s rights and preserves prior opportunities through rights changes",
  async (rights) => {
    // Given
    let { input, session } = advertisingContext();
    let current: AdvertisingEligibilityInput = input;
    const lifecycle = createInterstitialLifecycle({
      adUnitId: "test-unit",
      getInput: () => current,
    });
    for (let index = 0; index < 9; index++)
      await lifecycle.transition(action());
    session = {
      subject: `auth0|${"00000000-0000-4000-8000-000000000001"}`,
      accountId: "00000000-0000-4000-8000-000000000001",
    };
    current = { ...current, account: { ...current.account, ...session } };
    const right = entitlement();
    current = {
      ...input,
      account: { ...input.account, ...session, status: "authenticated" },
      choices: {
        session: { ...session },
        canRequestAds: true,
        authorizedMode: "limited",
      },
      pro:
        rights === "unknown"
          ? {
              status: "unavailable",
              reason: "customer-info",
              operation: "idle",
            }
          : { status: "active", entitlement: right, operation: "idle" },
    };
    // When
    for (let index = 0; index < 12; index++)
      await lifecycle.transition(action());
    // Then
    expect(lifecycle.count).toBe(9);
    current = {
      ...current,
      pro: { status: "inactive", operation: "idle" },
    };
    await lifecycle.transition(action());
    expect(lifecycle.count).toBe(10);
    expect(mockCreateAd).toHaveBeenCalledTimes(2);
  },
);
it("abandons an obsolete sporting destination without touching advertising", async () => {
  // Given
  const { input } = advertisingContext();
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => input,
  });
  const destination = { ...action(), isCurrent: () => false };
  // When
  const result = await lifecycle.transition(destination);
  // Then
  expect(result).toEqual({ status: "abandoned" });
  expect(destination.open).not.toHaveBeenCalled();
  expect(lifecycle.count).toBe(0);
  expect(mockCreateAd).not.toHaveBeenCalled();
});
it("counts free actions without authorized choices and retains the threshold when eligibility changes", async () => {
  // Given
  const { input } = advertisingContext();
  let current = { ...input, choices: null as typeof input.choices };
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => current,
  });
  for (let index = 0; index < 10; index++) await lifecycle.transition(action());
  // When
  current = input;
  lifecycle.preload();
  const ad = mockCreateAd.mock.results[0].value;
  ad.emit(AdEventType.LOADED);
  const result = lifecycle.transition(action());
  // Then
  expect(lifecycle.count).toBe(10);
  expect(ad.show).toHaveBeenCalledTimes(1);
  ad.emit(AdEventType.CLOSED);
  await result;
});
it("retains memory across backgrounding and starts a fresh runtime at zero without replay", async () => {
  // Given
  const { input } = advertisingContext();
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => input,
  });
  for (let index = 0; index < 9; index++) await lifecycle.transition(action());
  // When: a fresh process creates a new counter.
  const restarted = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => input,
  });
  // Then
  expect(lifecycle.count).toBe(9);
  expect(restarted.count).toBe(0);
});
it.each(["throw", "reject"])(
  "reports destination %s separately from advertising failure",
  async (failure) => {
    // Given
    const { input } = advertisingContext();
    const lifecycle = createInterstitialLifecycle({
      adUnitId: "test-unit",
      getInput: () => input,
    });
    const error = new Error("Destination unavailable");
    const destination = {
      ...action(),
      open: jest.fn(() => {
        if (failure === "throw") throw error;
        return Promise.reject(error);
      }),
    };
    // When
    const result = await lifecycle.transition(destination);
    // Then
    expect(result).toEqual({ status: "destination-failed", error });
    expect(destination.open).toHaveBeenCalledTimes(1);
    expect(lifecycle.count).toBe(1);
  },
);
it("deduplicates the accepted action while its asynchronous destination is opening", async () => {
  // Given
  const { input } = advertisingContext();
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => input,
  });
  const opening = Promise.withResolvers<void>();
  const destination = { ...action(), open: jest.fn(() => opening.promise) };
  // When
  const first = lifecycle.transition(destination);
  const repeated = lifecycle.transition(destination);
  const other = action();
  const refused = await lifecycle.transition(other);
  // Then
  expect(first).toBe(repeated);
  expect(lifecycle.count).toBe(1);
  expect(destination.open).toHaveBeenCalledTimes(1);
  expect(refused).toEqual({ status: "busy" });
  expect(other.open).not.toHaveBeenCalled();
  opening.resolve();
  expect(await first).toEqual({ status: "opened" });
});
it("abandons an obsolete asynchronous opening without blocking or clearing the new session's destination", async () => {
  // Given
  let { input, session } = advertisingContext();
  let current = input;
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => current,
  });
  const oldOpening = Promise.withResolvers<void>();
  const oldDestination = {
    ...action(),
    open: jest.fn(() => oldOpening.promise),
  };
  const previous = lifecycle.transition(oldDestination);
  // When
  session = { subject: "auth0|other", accountId: "other" };
  current = { ...current, account: { ...current.account, ...session } };
  current = {
    ...input,
    account: { ...input.account, ...session },
    choices: {
      session: { ...session },
      canRequestAds: true,
      authorizedMode: "limited",
    },
  };
  lifecycle.invalidate();
  const newOpening = Promise.withResolvers<void>();
  const newDestination = {
    ...action(),
    open: jest.fn(() => newOpening.promise),
  };
  const next = lifecycle.transition(newDestination);
  // Then
  expect(newDestination.open).toHaveBeenCalledTimes(1);
  expect(await previous).toEqual({ status: "abandoned" });
  expect(lifecycle.count).toBe(2);
  oldOpening.resolve();
  await oldOpening.promise;
  await Promise.resolve();
  expect(lifecycle.transition(newDestination)).toBe(next);
  expect(lifecycle.count).toBe(2);
  newOpening.resolve();
  expect(await next).toEqual({ status: "opened" });
  expect(oldDestination.open).toHaveBeenCalledTimes(1);
  expect(newDestination.open).toHaveBeenCalledTimes(1);
});
