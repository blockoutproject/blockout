import type { AdError, AdEventType } from "react-native-google-mobile-ads";
import { createSessionGeneration } from "../../accounts";
import type { AdvertisingEligibilityInput } from "../advertising-eligibility";

/** Current owner inputs; tests change only the state relevant to their scenario. */
export function advertisingContext() {
  const session = createSessionGeneration();
  const input: AdvertisingEligibilityInput = {
    account: { status: "guest", getSnapshot: session.getSnapshot },
    nativePro: null,
    admission: { ordinary: true },
    choices: {
      session: session.getSnapshot(),
      canRequestAds: true,
      authorizedMode: "limited",
    },
  };
  return { session, input };
}

/**
 * Controlled SDK I/O only. Retains callbacks deliberately to exercise already-queued events
 * after retirement; this does not model native presentation, mediation or consent.
 */
export function controlledInterstitial() {
  const listeners = new Map<AdEventType, (error?: AdError) => void>();
  return {
    load: jest.fn(),
    show: jest.fn((): Promise<void> => Promise.resolve()),
    destroy: jest.fn(),
    addAdEventListener: jest.fn(
      (event: AdEventType, listener: (error?: AdError) => void) => {
        listeners.set(event, listener);
        return () => listeners.delete(event);
      },
    ),
    /** Delivers a controlled callback, including callbacks queued before destroy. */
    emit(event: AdEventType, error?: AdError) {
      listeners.get(event)?.(error);
    },
  };
}
