import type { AdvertisingEligibilityInput } from "../advertising-eligibility";
import { AdEventType } from "react-native-google-mobile-ads";
import { entitlement } from "../../pro/test-support/customer-info";
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
const kinds = ["club", "team", "pool", "match", "live"];
beforeEach(() =>
  mockCreateAd.mockReset().mockImplementation(controlledInterstitial),
);
/** A new accepted intent; repeated submissions reuse this same key. */
function action(kind = "club") {
  return {
    kind,
    voluntary: true,
    key: {},
    isCurrent: () => true,
    open: jest.fn(),
  };
}
it("shares the first nine actions and the tenth opportunity across every sporting kind", async () => {
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
    const destination = action(kinds[index % kinds.length]);
    expect(await openSportingAdTransition(lifecycle, destination)).toEqual({
      status: "opened",
    });
    expect(destination.open).toHaveBeenCalledTimes(1);
  }
  const live = action("live");
  const result = openSportingAdTransition(lifecycle, live);
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
    await openSportingAdTransition(lifecycle, destination);
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
  for (let index = 0; index < 9; index++)
    await openSportingAdTransition(lifecycle, action());
  const destination = action();
  const other = action("live");
  // When
  const first = openSportingAdTransition(lifecycle, destination);
  const repeated = openSportingAdTransition(lifecycle, destination);
  const refused = await openSportingAdTransition(lifecycle, other);
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
it.each([
  "search",
  "filter",
  "scroll",
  "refresh",
  "back",
  "startup",
  "exit",
  "foreground",
  "authentication",
  "account",
  "payment",
  "privacy",
  "legal",
  "support",
])("leaves %s outside the sporting count and ad opportunity", async (kind) => {
  // Given
  const { input } = advertisingContext();
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => input,
  });
  const destination = action(kind);
  // When
  await openSportingAdTransition(lifecycle, destination);
  // Then
  expect(destination.open).toHaveBeenCalledTimes(1);
  expect(lifecycle.count).toBe(0);
  expect(mockCreateAd).not.toHaveBeenCalled();
});
it("excludes involuntary sporting openings", async () => {
  // Given
  const { input } = advertisingContext();
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => input,
  });
  const destination = { ...action("match"), voluntary: false };
  // When
  await openSportingAdTransition(lifecycle, destination);
  // Then
  expect(lifecycle.count).toBe(0);
  expect(destination.open).toHaveBeenCalledTimes(1);
  expect(mockCreateAd).not.toHaveBeenCalled();
});
it.each([
  { kind: "legal", voluntary: true },
  { kind: "match", voluntary: false },
])(
  "keeps excluded $kind navigation independent of a pending sporting ad",
  async ({ kind, voluntary }) => {
    // Given
    const { input } = advertisingContext();
    const lifecycle = createInterstitialLifecycle({
      adUnitId: "test-unit",
      getInput: () => input,
    });
    lifecycle.preload();
    const ad = mockCreateAd.mock.results[0].value;
    ad.emit(AdEventType.LOADED);
    for (let index = 0; index < 9; index++)
      await openSportingAdTransition(lifecycle, action());
    const sporting = action();
    const pending = openSportingAdTransition(lifecycle, sporting);
    const excluded = { ...action(kind), voluntary };
    // When
    const result = await openSportingAdTransition(lifecycle, excluded);
    // Then
    expect(result).toEqual({ status: "opened" });
    expect(excluded.open).toHaveBeenCalledTimes(1);
    expect(lifecycle.count).toBe(10);
    expect(sporting.open).not.toHaveBeenCalled();
    expect(openSportingAdTransition(lifecycle, sporting)).toBe(pending);
    expect(ad.show).toHaveBeenCalledTimes(1);
    ad.emit(AdEventType.CLOSED);
    await pending;
    expect(sporting.open).toHaveBeenCalledTimes(1);
    expect(excluded.open).toHaveBeenCalledTimes(1);
  },
);
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
      await openSportingAdTransition(lifecycle, action());
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
      await openSportingAdTransition(lifecycle, action());
    // Then
    expect(lifecycle.count).toBe(9);
    current = {
      ...current,
      pro: { status: "inactive", operation: "idle" },
    };
    await openSportingAdTransition(lifecycle, action());
    expect(lifecycle.count).toBe(10);
    expect(mockCreateAd).toHaveBeenCalledTimes(2);
  },
);
it("still abandons an obsolete excluded destination without touching advertising", async () => {
  // Given
  const { input } = advertisingContext();
  const lifecycle = createInterstitialLifecycle({
    adUnitId: "test-unit",
    getInput: () => input,
  });
  const destination = { ...action("legal"), isCurrent: () => false };
  // When
  const result = await openSportingAdTransition(lifecycle, destination);
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
  for (let index = 0; index < 10; index++)
    await openSportingAdTransition(lifecycle, action());
  // When
  current = input;
  lifecycle.preload();
  const ad = mockCreateAd.mock.results[0].value;
  ad.emit(AdEventType.LOADED);
  const result = openSportingAdTransition(lifecycle, action());
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
  for (let index = 0; index < 9; index++)
    await openSportingAdTransition(lifecycle, action());
  // When: foreground/background are excluded commands, not new owners.
  await openSportingAdTransition(lifecycle, action("background"));
  await openSportingAdTransition(lifecycle, action("foreground"));
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
    const result = await openSportingAdTransition(lifecycle, destination);
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
  const first = openSportingAdTransition(lifecycle, destination);
  const repeated = openSportingAdTransition(lifecycle, destination);
  const other = action();
  const refused = await openSportingAdTransition(lifecycle, other);
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
  const previous = openSportingAdTransition(lifecycle, oldDestination);
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
  const next = openSportingAdTransition(lifecycle, newDestination);
  // Then
  expect(newDestination.open).toHaveBeenCalledTimes(1);
  expect(await previous).toEqual({ status: "abandoned" });
  expect(lifecycle.count).toBe(2);
  oldOpening.resolve();
  await oldOpening.promise;
  await Promise.resolve();
  expect(openSportingAdTransition(lifecycle, newDestination)).toBe(next);
  expect(lifecycle.count).toBe(2);
  newOpening.resolve();
  expect(await next).toEqual({ status: "opened" });
  expect(oldDestination.open).toHaveBeenCalledTimes(1);
  expect(newDestination.open).toHaveBeenCalledTimes(1);
});
