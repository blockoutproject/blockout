import { AdEventType, InterstitialAd } from "react-native-google-mobile-ads";

import {
  mapAdvertisingError,
  reportAdvertisingFailure,
  type AdvertisingPlacement,
} from "@/src/modules/advertising/api/advertising-diagnostics";

export type InterstitialControllerState =
  "backoff" | "disposed" | "idle" | "loaded" | "loading" | "showing";

type UserAction = () => Promise<void> | void;
type NativeAdError = Error & { code?: string };

export type InterstitialAdHandle = {
  addAdEventListener: (
    type: AdEventType,
    listener: (error?: NativeAdError) => void,
  ) => () => void;
  load: () => void;
  removeAllListeners: () => void;
  show: () => Promise<void> | void;
};

type InterstitialControllerOptions = {
  placement: AdvertisingPlacement;
  adUnitId: string;
  actionsBetweenAds: number;
  setFullscreenUiHidden: (hidden: boolean) => void;
  createAd?: (adUnitId: string) => InterstitialAdHandle;
  retryDelaysMs?: number[];
  loadTimeoutMs?: number;
  showTimeoutMs?: number;
  closeTimeoutMs?: number;
};

const DEFAULT_RETRY_DELAYS_MS = [1_000, 5_000, 30_000];

/**
 * Owns one interstitial placement and guarantees exactly-once release of every
 * user action across native load, show, close, error, timeout, and disposal.
 */
export class InterstitialController {
  private readonly placement: AdvertisingPlacement;
  private readonly adUnitId: string;
  private readonly actionsBetweenAds: number;
  private readonly setFullscreenUiHidden: (hidden: boolean) => void;
  private readonly createAd: (adUnitId: string) => InterstitialAdHandle;
  private readonly retryDelaysMs: number[];
  private readonly loadTimeoutMs: number;
  private readonly showTimeoutMs: number;
  private readonly closeTimeoutMs: number;

  private ad: InterstitialAdHandle | null = null;
  private state: InterstitialControllerState = "idle";
  private listenerRemovers: (() => void)[] = [];
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private loadTimer: ReturnType<typeof setTimeout> | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private actionsSinceLastAd = 0;
  private pendingAction: UserAction | null = null;

  /** Creates one placement owner with bounded native recovery settings. */
  constructor({
    placement,
    adUnitId,
    actionsBetweenAds,
    setFullscreenUiHidden,
    createAd = (unitId) => InterstitialAd.createForAdRequest(unitId),
    retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
    loadTimeoutMs = 15_000,
    showTimeoutMs = 8_000,
    closeTimeoutMs = 120_000,
  }: InterstitialControllerOptions) {
    this.placement = placement;
    this.adUnitId = adUnitId;
    this.actionsBetweenAds = actionsBetweenAds;
    this.setFullscreenUiHidden = setFullscreenUiHidden;
    this.createAd = createAd;
    this.retryDelaysMs = retryDelaysMs;
    this.loadTimeoutMs = loadTimeoutMs;
    this.showTimeoutMs = showTimeoutMs;
    this.closeTimeoutMs = closeTimeoutMs;
  }

  /** Starts preloading this placement. */
  start() {
    if (this.state !== "idle") return;
    this.loadFreshAd();
  }

  /** Returns the current state for provider diagnostics and focused tests. */
  getState() {
    return this.state;
  }

  /**
   * Runs an action immediately or defers it behind an eligible loaded ad.
   */
  run(action: UserAction) {
    if (this.state === "disposed") {
      this.runAction(action);
      return;
    }

    if (this.pendingAction) return;

    this.actionsSinceLastAd += 1;
    const eligible =
      this.actionsSinceLastAd >= this.actionsBetweenAds &&
      this.state === "loaded";

    if (!eligible || !this.ad) {
      this.runAction(action);
      return;
    }

    this.pendingAction = action;
    this.state = "showing";
    this.showTimer = setTimeout(
      () => this.handleShowFailure("show-timeout", "timed-out"),
      this.showTimeoutMs,
    );

    try {
      void Promise.resolve(this.ad.show()).catch((error) => {
        this.handleShowFailure(
          mapAdvertisingError(error, "show-rejected"),
          "failed",
        );
      });
    } catch (error) {
      this.handleShowFailure(
        mapAdvertisingError(error, "show-threw"),
        "failed",
      );
    }
  }

  /**
   * Recovers a stalled placement when the application becomes active again.
   */
  onForeground() {
    if (this.state === "disposed" || this.state === "loaded") return;

    if (this.state === "showing") {
      this.handleShowFailure("foreground-recovery", "failed");
      return;
    }

    if (this.state === "loading") return;

    this.retryCount = 0;
    this.clearRetryTimer();
    this.loadFreshAd();
  }

  /**
   * Releases listeners and timers while preserving exactly-once user action
   * behavior during provider or route disposal.
   */
  dispose() {
    if (this.state === "disposed") return;

    this.clearTimers();
    this.detachAd();
    this.restoreFullscreenUi();
    this.settlePendingAction();
    this.state = "disposed";
  }

  /** Replaces any stale native instance and begins a bounded load attempt. */
  private loadFreshAd() {
    if (this.state === "disposed") return;

    this.clearLoadTimer();
    this.detachAd();

    try {
      const ad = this.createAd(this.adUnitId);
      this.ad = ad;
      this.listenerRemovers = [
        ad.addAdEventListener(AdEventType.LOADED, this.handleLoaded),
        ad.addAdEventListener(AdEventType.ERROR, this.handleError),
        ad.addAdEventListener(AdEventType.OPENED, this.handleOpened),
        ad.addAdEventListener(AdEventType.CLOSED, this.handleClosed),
      ];
      this.state = "loading";
      ad.load();
      this.loadTimer = setTimeout(() => {
        reportAdvertisingFailure({
          operation: "load",
          placement: this.placement,
          outcome: "timed-out",
          errorCode: "load-timeout",
        });
        this.scheduleRetry();
      }, this.loadTimeoutMs);
    } catch (error) {
      reportAdvertisingFailure({
        operation: "load",
        placement: this.placement,
        outcome: "failed",
        errorCode: mapAdvertisingError(error, "load-threw"),
      });
      this.scheduleRetry();
    }
  }

  /** Accepts a native load only while this placement remains active. */
  private readonly handleLoaded = () => {
    if (this.state === "disposed") return;
    this.clearLoadTimer();
    this.retryCount = 0;
    this.state = "loaded";
  };

  /** Releases pending work and schedules recovery after a native error. */
  private readonly handleError = (error?: NativeAdError) => {
    if (this.state === "disposed") return;
    this.clearLoadTimer();
    this.restoreFullscreenUi();
    this.settlePendingAction();
    reportAdvertisingFailure({
      operation: this.state === "showing" ? "show" : "load",
      placement: this.placement,
      outcome: "failed",
      errorCode: mapAdvertisingError(error, "native-ad-error"),
    });
    this.scheduleRetry();
  };

  /** Records a real presentation and applies the iOS full-screen UI state. */
  private readonly handleOpened = () => {
    if (this.state !== "showing") return;
    this.clearShowTimer();
    this.showTimer = setTimeout(
      () => this.handleShowFailure("close-timeout", "timed-out"),
      this.closeTimeoutMs,
    );
    this.actionsSinceLastAd = 0;
    this.setFullscreenUiHidden(true);
  };

  /** Completes the pending action and immediately preloads the next ad. */
  private readonly handleClosed = () => {
    if (this.state !== "showing") return;
    this.restoreFullscreenUi();
    this.settlePendingAction();
    this.retryCount = 0;
    this.state = "idle";
    this.loadFreshAd();
  };

  /** Fails open after a rejected, thrown, or timed-out presentation. */
  private handleShowFailure(
    errorCode: string,
    outcome: "failed" | "timed-out",
  ) {
    if (this.state !== "showing") return;
    this.restoreFullscreenUi();
    this.settlePendingAction();
    reportAdvertisingFailure({
      operation: "show",
      placement: this.placement,
      outcome,
      errorCode,
    });
    this.scheduleRetry();
  }

  /** Schedules the next load from the finite placement retry policy. */
  private scheduleRetry() {
    if (this.state === "disposed") return;

    this.clearLoadTimer();
    this.clearShowTimer();
    this.detachAd();

    const delay = this.retryDelaysMs[this.retryCount];
    if (delay === undefined) {
      this.state = "idle";
      return;
    }

    this.retryCount += 1;
    this.state = "backoff";
    reportAdvertisingFailure({
      operation: "load",
      placement: this.placement,
      outcome: "retrying",
      errorCode: "load-retry",
      retry: this.retryCount,
    });
    this.retryTimer = setTimeout(() => this.loadFreshAd(), delay);
  }

  /** Removes ownership before invoking the pending action exactly once. */
  private settlePendingAction() {
    this.clearShowTimer();
    const action = this.pendingAction;
    this.pendingAction = null;
    if (action) this.runAction(action);
  }

  /** Executes user work without allowing its failure to escape the boundary. */
  private runAction(action: UserAction) {
    void Promise.resolve()
      .then(action)
      .catch((error) => {
        reportAdvertisingFailure({
          operation: "user-action",
          placement: this.placement,
          outcome: "failed",
          errorCode: mapAdvertisingError(error, "user-action-failed"),
        });
      });
  }

  /** Restores UI state on every terminal presentation path. */
  private restoreFullscreenUi() {
    this.setFullscreenUiHidden(false);
  }

  /** Removes every listener before replacing or disposing the native ad. */
  private detachAd() {
    this.listenerRemovers.forEach((remove) => remove());
    this.listenerRemovers = [];
    this.ad?.removeAllListeners();
    this.ad = null;
  }

  /** Clears all controller timers during disposal. */
  private clearTimers() {
    this.clearRetryTimer();
    this.clearLoadTimer();
    this.clearShowTimer();
  }

  /** Cancels the pending retry, if any. */
  private clearRetryTimer() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  /** Cancels the pending load timeout, if any. */
  private clearLoadTimer() {
    if (this.loadTimer) clearTimeout(this.loadTimer);
    this.loadTimer = null;
  }

  /** Cancels the pending show timeout, if any. */
  private clearShowTimer() {
    if (this.showTimer) clearTimeout(this.showTimer);
    this.showTimer = null;
  }
}
