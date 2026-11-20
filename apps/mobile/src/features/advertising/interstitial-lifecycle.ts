import * as Sentry from "@sentry/react-native";
import { AdEventType, InterstitialAd } from "react-native-google-mobile-ads";

const SPORTING_NAVIGATIONS_PER_AD = 10;
const AD_MAX_AGE_MS = 60 * 60 * 1000;

type Preparation = {
  ad: InterstitialAd;
  loadedAt: number | null;
  destination?: { open: () => void; isCurrent: () => boolean };
};

/** Owns one SDK interstitial and one fixed opportunity every ten free sporting navigations. */
export function createInterstitialLifecycle({
  adUnitId,
  isFree,
  canLoad,
}: {
  adUnitId?: string;
  isFree: () => boolean;
  canLoad: () => boolean;
}) {
  let count = 0;
  let prepared: Preparation | null = null;

  function remove(entry: Preparation) {
    prepared = null;
    entry.ad.destroy();
  }

  function invalidate() {
    // A presentation already handed to the SDK still owns its dismissal.
    if (prepared && !prepared.destination) {
      remove(prepared);
    }
  }

  function finish(entry: Preparation, outcome: "closed" | "failed") {
    if (prepared !== entry) {
      return;
    }
    const destination = entry.destination;
    remove(entry);
    if (destination?.isCurrent()) {
      destination.open();
    }
    if (outcome === "closed") {
      preload();
    }
  }

  function preload() {
    if (!isFree() || !canLoad()) {
      invalidate();
      return;
    }
    if (!adUnitId || prepared) {
      return;
    }
    try {
      const entry: Preparation = {
        ad: InterstitialAd.createForAdRequest(adUnitId),
        loadedAt: null,
      };
      prepared = entry;
      entry.ad.addAdEventListener(AdEventType.LOADED, () => {
        entry.loadedAt = Date.now();
      });
      entry.ad.addAdEventListener(AdEventType.CLOSED, () =>
        finish(entry, "closed"),
      );
      entry.ad.addAdEventListener(AdEventType.ERROR, (error) => {
        if (prepared !== entry) {
          return;
        }
        const noFill =
          error?.reason === "no-fill" || error?.reason === "mediation-no-fill";
        if (entry.destination || !noFill) {
          Sentry.captureException(
            new Error(
              entry.destination
                ? "Interstitial show failed"
                : "Interstitial load failed",
            ),
          );
        }
        finish(entry, "failed");
      });
      entry.ad.load();
    } catch {
      invalidate();
      Sentry.captureException(new Error("Interstitial load failed"));
    }
  }

  async function present(entry: Preparation) {
    try {
      await entry.ad.show();
    } catch {
      if (prepared === entry) {
        Sentry.captureException(new Error("Interstitial show failed"));
        finish(entry, "failed");
      }
    }
  }

  function openDestination(open: () => void, isCurrent: () => boolean) {
    if (!isCurrent() || prepared?.destination?.isCurrent()) {
      return;
    }
    if (!isFree()) {
      invalidate();
      open();
      return;
    }
    count = (count + 1) % SPORTING_NAVIGATIONS_PER_AD;
    if (
      prepared &&
      !prepared.destination &&
      (!canLoad() ||
        (prepared.loadedAt !== null &&
          Date.now() - prepared.loadedAt >= AD_MAX_AGE_MS))
    ) {
      invalidate();
    }
    if (count === 0 && prepared?.loadedAt != null && !prepared.destination) {
      prepared.destination = { open, isCurrent };
      void present(prepared);
      return;
    }
    open();
    preload();
  }

  return {
    openDestination,
    preload,
    invalidate,
    dispose() {
      if (prepared) {
        remove(prepared);
      }
    },
  };
}
