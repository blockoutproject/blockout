import * as Sentry from "@sentry/react-native";
import { AdEventType, InterstitialAd } from "react-native-google-mobile-ads";
import type { SessionSnapshot } from "../accounts";
import { getProState } from "../pro/pro-state";
import {
  getAdvertisingEligibility,
  type AdvertisingEligibilityInput,
  type AdvertisingChoices,
} from "./advertising-eligibility";
import {
  openTransitionDestination,
  type SportingAdTransition,
  type SportingAdTransitionResult,
} from "./sporting-ad-transition";

/** Current owner readers; construction does not initialize or request advertising. */
export interface InterstitialLifecycleOptions {
  readonly adUnitId: string;
  readonly getInput: () => AdvertisingEligibilityInput;
}

/** Process-local owner, composed once by the future advertising provider. */
export type InterstitialLifecycle = ReturnType<
  typeof createInterstitialLifecycle
>;

/** One SDK resource with the context in which its request was authorized. */
interface PreparedInterstitial {
  readonly ad: InterstitialAd;
  readonly session: SessionSnapshot;
  readonly mode: AdvertisingChoices["authorizedMode"];
  loadedAt: number | null;
  showing: boolean;
}

/** One accepted intent; release starts destination opening once, independently of its completion. */
interface PendingDestination {
  readonly action: SportingAdTransition;
  readonly session: SessionSnapshot;
  readonly result: Promise<SportingAdTransitionResult>;
  readonly resolve: (result: SportingAdTransitionResult) => void;
  released: boolean;
}

/** Compares both F05 coordinates, including first account establishment within one generation. */
function sameSession(left: SessionSnapshot, right: SessionSnapshot) {
  return (
    left.generation === right.generation && left.accountId === right.accountId
  );
}

/**
 * Owns one memory-only 0–10 counter, one SDK instance and one accepted pending destination.
 * Backgrounding has no effect. The provider must invalidate before native privacy reconfiguration
 * and on owner changes; requests/presentation also recheck the live F05/F09/F12 inputs.
 * No timer recovers a callback-free SDK hang; process loss abandons that pending intent.
 */
export function createInterstitialLifecycle({
  adUnitId,
  getInput,
}: InterstitialLifecycleOptions) {
  let count = 0;
  let prepared: PreparedInterstitial | null = null;
  let pending: PendingDestination | null = null;
  let retryOnAction = false;
  let disposed = false;

  /** Completes the captured intent without clearing a different, newer pending destination. */
  function complete(
    destination: PendingDestination,
    result: SportingAdTransitionResult,
  ) {
    if (pending === destination) pending = null;
    destination.resolve(result);
  }

  /**
   * Starts a still-current destination before SDK destruction. Opening failures stay with the
   * caller and never enter the ad failure channel. Async openings remain pending for deduplication.
   */
  function releaseDestination() {
    const destination = pending;
    if (!destination || destination.released) return;
    destination.released = true;
    if (
      !sameSession(destination.session, getInput().account.getSnapshot()) ||
      !destination.action.isCurrent()
    ) {
      complete(destination, { status: "abandoned" });
      return;
    }
    void openTransitionDestination(destination.action.open).then((result) =>
      complete(destination, result),
    );
  }

  /** Retires callbacks first, settles the destination, then removes the SDK resource/listeners. */
  function retire() {
    const previous = prepared;
    prepared = null;
    releaseDestination();
    previous?.ad.destroy();
  }

  /** Current permission and request context must still match the prepared resource. */
  function compatible(
    instance: PreparedInterstitial,
    input: AdvertisingEligibilityInput,
  ) {
    return (
      getAdvertisingEligibility(input).canRequestAds &&
      sameSession(instance.session, input.account.getSnapshot()) &&
      instance.mode === input.choices?.authorizedMode
    );
  }

  /** Rejects queued events after an owner change even before the provider's invalidation effect. */
  function currentInstance(instance: PreparedInterstitial) {
    if (prepared !== instance) return false;
    if (!compatible(instance, getInput())) {
      retire();
      return false;
    }
    return true;
  }

  /** Absorbed SDK failures use bounded diagnostics; no provider payload or identifier escapes. */
  function fail(
    instance: PreparedInterstitial | null,
    operation: "load" | "show",
    noFill = false,
  ) {
    if (instance !== prepared) return;
    retryOnAction = true;
    retire();
    if (!noFill)
      Sentry.captureException(new Error(`Interstitial ${operation} failed`));
  }

  /**
   * Makes one eligible request. Repeated calls reuse the instance; failure waits for the next
   * eligible sporting action. Native choices/initialization must already be established upstream.
   */
  function preload() {
    if (disposed || retryOnAction) return;
    const input = getInput();
    if (prepared && !compatible(prepared, input)) retire();
    if (
      prepared &&
      !prepared.showing &&
      prepared.loadedAt !== null &&
      Date.now() - prepared.loadedAt >= 3_600_000
    )
      retire();
    if (prepared || !getAdvertisingEligibility(input).canRequestAds) return;

    try {
      const instance: PreparedInterstitial = {
        ad: InterstitialAd.createForAdRequest(adUnitId, {
          requestNonPersonalizedAdsOnly:
            input.choices?.authorizedMode !== "personalized",
        }),
        session: input.account.getSnapshot(),
        mode: input.choices?.authorizedMode ?? null,
        loadedAt: null,
        showing: false,
      };
      prepared = instance;
      instance.ad.addAdEventListener(AdEventType.LOADED, () => {
        if (currentInstance(instance) && !instance.showing)
          instance.loadedAt = Date.now();
      });
      instance.ad.addAdEventListener(AdEventType.OPENED, () => {
        if (currentInstance(instance) && instance.showing) count = 0;
      });
      instance.ad.addAdEventListener(AdEventType.CLOSED, () => {
        if (!currentInstance(instance)) return;
        retire();
        preload();
      });
      instance.ad.addAdEventListener(AdEventType.ERROR, (error) => {
        if (!currentInstance(instance)) return;
        const operation = instance.showing ? "show" : "load";
        fail(
          instance,
          operation,
          operation === "load" &&
            error.phase === "load" &&
            (error.reason === "no-fill" ||
              error.reason === "mediation-no-fill"),
        );
      });
      instance.ad.load();
    } catch {
      fail(prepared, "load");
    }
  }

  return {
    get count() {
      return count;
    },
    preload,

    /** Settles the pending intent and retires preparation before privacy/session reconfiguration. */
    invalidate() {
      retire();
    },

    /** Releases a valid intent before teardown; a real process loss instead abandons memory. */
    dispose() {
      disposed = true;
      retire();
    },

    /**
     * Accepts at most one intent. Its key deduplicates repeated pending submissions; other intents
     * receive busy without acceptance. Only free, admitted sporting actions accrue opportunities.
     */
    transition(
      action: SportingAdTransition,
    ): Promise<SportingAdTransitionResult> {
      if (disposed || !action.isCurrent())
        return Promise.resolve({ status: "abandoned" });
      const input = getInput();
      if (prepared && !compatible(prepared, input)) retire();
      if (pending)
        return pending.action.key === action.key
          ? pending.result
          : Promise.resolve({ status: "busy" });

      let resolve: PendingDestination["resolve"];
      const result = new Promise<SportingAdTransitionResult>((settle) => {
        resolve = settle;
      });
      pending = {
        action,
        result,
        resolve: (outcome) => resolve(outcome),
        session: input.account.getSnapshot(),
        released: false,
      };
      const pro = getProState(input.account, input.nativePro);
      const freeAction =
        input.admission.ordinary &&
        (pro.status === "guest" || pro.status === "inactive");
      if (freeAction) count = Math.min(10, count + 1);
      const eligibleAction =
        freeAction && getAdvertisingEligibility(input).canDisplayAds;
      if (eligibleAction) retryOnAction = false;
      const instance = prepared;
      if (
        eligibleAction &&
        count === 10 &&
        instance &&
        instance.loadedAt !== null &&
        Date.now() - instance.loadedAt < 3_600_000 &&
        compatible(instance, getInput())
      ) {
        instance.showing = true;
        try {
          instance.ad.show().catch(() => fail(instance, "show"));
        } catch {
          fail(instance, "show");
        }
      } else {
        releaseDestination();
        if (eligibleAction) preload();
      }
      return result;
    },
  };
}
