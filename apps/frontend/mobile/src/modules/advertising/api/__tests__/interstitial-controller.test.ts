import { AdEventType } from "react-native-google-mobile-ads";

import {
  InterstitialController,
  type InterstitialAdHandle,
} from "@/src/modules/advertising/api/interstitial-controller";

jest.mock("react-native-google-mobile-ads", () => ({
  AdEventType: {
    CLOSED: "closed",
    ERROR: "error",
    LOADED: "loaded",
    OPENED: "opened",
  },
  InterstitialAd: {
    createForAdRequest: jest.fn(),
  },
}));

type Listener = (error?: Error & { code?: string }) => void;

/** Deterministic native-ad double used to drive full-screen events. */
class FakeInterstitial implements InterstitialAdHandle {
  readonly load = jest.fn();
  readonly show = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
  readonly removeAllListeners = jest.fn(() => {
    this.listeners.clear();
  });
  private readonly listeners = new Map<AdEventType, Set<Listener>>();

  /** Registers one fake native listener and returns its remover. */
  addAdEventListener(type: AdEventType, listener: Listener) {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
    return () => listeners.delete(listener);
  }

  /** Emits one native event to the registered controller listeners. */
  emit(type: AdEventType, error?: Error & { code?: string }) {
    this.listeners.get(type)?.forEach((listener) => listener(error));
  }

  /** Counts listeners retained by the fake native boundary. */
  listenerCount() {
    return Array.from(this.listeners.values()).reduce(
      (count, listeners) => count + listeners.size,
      0,
    );
  }
}

/** Creates a controller with short deterministic retry and timeout bounds. */
function createController({
  ad,
  actionsBetweenAds = 1,
  setFullscreenUiHidden = jest.fn(),
}: {
  ad: FakeInterstitial;
  actionsBetweenAds?: number;
  setFullscreenUiHidden?: jest.Mock;
}) {
  return {
    controller: new InterstitialController({
      placement: "navigation",
      adUnitId: "test-interstitial",
      actionsBetweenAds,
      setFullscreenUiHidden,
      createAd: () => ad,
      retryDelaysMs: [100, 500],
      loadTimeoutMs: 1_000,
      showTimeoutMs: 200,
      closeTimeoutMs: 2_000,
    }),
    setFullscreenUiHidden,
  };
}

describe("interstitial controller", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("waits for ten natural navigation actions before the first ad", async () => {
    const ad = new FakeInterstitial();
    const { controller } = createController({
      ad,
      actionsBetweenAds: 10,
    });
    controller.start();
    ad.emit(AdEventType.LOADED);

    const actions = Array.from({ length: 10 }, () => jest.fn());
    actions.slice(0, 9).forEach((action) => controller.run(action));
    await Promise.resolve();

    actions
      .slice(0, 9)
      .forEach((action) => expect(action).toHaveBeenCalledTimes(1));
    expect(ad.show).not.toHaveBeenCalled();

    controller.run(actions[9]);
    expect(ad.show).toHaveBeenCalledTimes(1);
    expect(actions[9]).not.toHaveBeenCalled();

    ad.emit(AdEventType.OPENED);
    ad.emit(AdEventType.CLOSED);
    await Promise.resolve();

    expect(actions[9]).toHaveBeenCalledTimes(1);
  });

  it("releases a pending action once after a native show error", async () => {
    const ad = new FakeInterstitial();
    const setFullscreenUiHidden = jest.fn();
    const { controller } = createController({
      ad,
      setFullscreenUiHidden,
    });
    const action = jest.fn();
    const duplicateAction = jest.fn();
    controller.start();
    ad.emit(AdEventType.LOADED);
    controller.run(action);
    controller.run(duplicateAction);
    ad.emit(AdEventType.OPENED);
    ad.emit(
      AdEventType.ERROR,
      Object.assign(new Error("provider payload"), {
        code: "googleMobileAds/no-fill",
      }),
    );
    ad.emit(AdEventType.CLOSED);
    await Promise.resolve();

    expect(action).toHaveBeenCalledTimes(1);
    expect(duplicateAction).not.toHaveBeenCalled();
    expect(setFullscreenUiHidden).toHaveBeenLastCalledWith(false);
    expect(controller.getState()).toBe("backoff");

    jest.advanceTimersByTime(100);
    expect(ad.load).toHaveBeenCalledTimes(2);
  });

  it("handles a rejected show promise without double-running the action", async () => {
    const ad = new FakeInterstitial();
    ad.show.mockRejectedValue(new Error("rejected"));
    const { controller } = createController({ ad });
    const action = jest.fn();
    controller.start();
    ad.emit(AdEventType.LOADED);

    controller.run(action);
    await Promise.resolve();
    await Promise.resolve();
    ad.emit(AdEventType.CLOSED);
    await Promise.resolve();

    expect(action).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toBe("backoff");
  });

  it("uses separate bounds for opening and closing an ad", async () => {
    const ad = new FakeInterstitial();
    const { controller, setFullscreenUiHidden } = createController({ ad });
    const action = jest.fn();
    controller.start();
    ad.emit(AdEventType.LOADED);
    controller.run(action);
    ad.emit(AdEventType.OPENED);

    jest.advanceTimersByTime(200);
    await Promise.resolve();

    expect(action).not.toHaveBeenCalled();
    expect(controller.getState()).toBe("showing");

    jest.advanceTimersByTime(1_800);
    await Promise.resolve();

    expect(action).toHaveBeenCalledTimes(1);
    expect(setFullscreenUiHidden).toHaveBeenLastCalledWith(false);
    expect(controller.getState()).toBe("backoff");
  });

  it("retries load failures with bounded backoff and foreground recovery", () => {
    const ad = new FakeInterstitial();
    const { controller } = createController({ ad });
    controller.start();

    ad.emit(AdEventType.ERROR);
    expect(controller.getState()).toBe("backoff");
    jest.advanceTimersByTime(100);
    expect(ad.load).toHaveBeenCalledTimes(2);

    ad.emit(AdEventType.ERROR);
    controller.onForeground();
    expect(ad.load).toHaveBeenCalledTimes(3);
  });

  it("cleans listeners and releases pending work on disposal", async () => {
    const ad = new FakeInterstitial();
    const { controller, setFullscreenUiHidden } = createController({ ad });
    const action = jest.fn();
    controller.start();
    ad.emit(AdEventType.LOADED);
    controller.run(action);
    ad.emit(AdEventType.OPENED);

    controller.dispose();
    await Promise.resolve();

    expect(action).toHaveBeenCalledTimes(1);
    expect(ad.listenerCount()).toBe(0);
    expect(ad.removeAllListeners).toHaveBeenCalled();
    expect(setFullscreenUiHidden).toHaveBeenLastCalledWith(false);
    expect(controller.getState()).toBe("disposed");
  });
});
