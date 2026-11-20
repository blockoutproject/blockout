import * as Sentry from "@sentry/react-native";
import { AdEventType, InterstitialAd } from "react-native-google-mobile-ads";

const openingInterval = 10;
const adLifetimeMs = 60 * 60 * 1000;

interface InterstitialOptions {
  adUnitId: string;
  isEligibleOpening(): boolean;
  canRequestAds(): boolean;
}

/**
 * Holds one installation-session counter and one SDK ad. Only an actual presentation attempt
 * retains a destination callback. The native terminal event releases it exactly once.
 */
export function createInterstitialLifecycle({
  adUnitId,
  isEligibleOpening,
  canRequestAds,
}: InterstitialOptions) {
  let count = 0;
  let ad: InterstitialAd | undefined;
  let expiresAt = 0;
  let continuation: (() => void) | undefined;

  function discard() {
    const previous = ad;
    ad = undefined;
    expiresAt = 0;
    previous?.destroy();
  }

  function finish(instance: InterstitialAd) {
    if (ad !== instance) {
      return;
    }
    const open = continuation;
    continuation = undefined;
    discard();
    open?.();
  }

  function preload() {
    if (continuation || !canRequestAds()) {
      return;
    }
    // Google recommends clearing preloaded interstitials after one hour.
    if (ad?.loaded && Date.now() >= expiresAt) {
      discard();
    }
    if (ad) {
      return;
    }

    try {
      const instance = InterstitialAd.createForAdRequest(adUnitId);
      ad = instance;
      instance.addAdEventListener(AdEventType.LOADED, () => {
        if (ad === instance) {
          expiresAt = Date.now() + adLifetimeMs;
        }
      });
      instance.addAdEventListener(AdEventType.CLOSED, () => {
        if (ad === instance) {
          finish(instance);
          preload();
        }
      });
      instance.addAdEventListener(AdEventType.ERROR, (error) => {
        if (ad !== instance) {
          return;
        }
        const presenting = !!continuation;
        finish(instance);
        if (
          presenting ||
          (error.reason !== "no-fill" && error.reason !== "mediation-no-fill")
        ) {
          const operation = presenting ? "show" : "load";
          Sentry.captureException(
            new Error(`Interstitial ${operation} failed`),
          );
        }
      });
      instance.load();
    } catch {
      discard();
      Sentry.captureException(new Error("Interstitial load failed"));
    }
  }

  return {
    preload,
    /** Retire preparation while allowing a visible native ad to deliver its dismissal. */
    invalidate() {
      if (!continuation) {
        discard();
      }
    },
    dispose() {
      continuation = undefined;
      discard();
    },
    /** Skips the opportunity immediately if the SDK has no presentable ad at this transition. */
    open(canPresent: boolean, destination: () => void) {
      if (continuation) {
        return;
      }
      if (!isEligibleOpening()) {
        destination();
        return;
      }

      count = (count + 1) % openingInterval;
      const instance = ad;
      if (
        count === 0 &&
        canPresent &&
        canRequestAds() &&
        instance?.loaded &&
        Date.now() < expiresAt
      ) {
        continuation = destination;
        const failed = () => {
          if (ad === instance) {
            finish(instance);
            Sentry.captureException(new Error("Interstitial show failed"));
          }
        };
        try {
          void instance.show().catch(failed);
        } catch {
          failed();
        }
        return;
      }

      destination();
      preload();
    },
  };
}
