import { AdEventType, type AdError } from "react-native-google-mobile-ads";

/**
 * Controlled SDK I/O only. Retains callbacks deliberately to exercise already-queued events
 * after retirement; this does not model native presentation, mediation or consent.
 */
export function controlledInterstitial() {
  let loaded = false;
  const listeners = new Map<AdEventType, (error?: AdError) => void>();
  return {
    get loaded() {
      return loaded;
    },
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
      if (event === AdEventType.LOADED) {
        loaded = true;
      } else if (event === AdEventType.CLOSED || event === AdEventType.ERROR) {
        loaded = false;
      }
      const payload =
        event === AdEventType.ERROR
          ? (error ??
            Object.assign(new Error("Unavailable presentation"), {
              code: "synthetic",
              namespace: "googleMobileAds",
              jsStack: "",
              userInfo: {
                code: "synthetic",
                message: "Unavailable presentation",
              },
              phase: "show" as const,
              reason: "unknown",
            }))
          : undefined;
      listeners.get(event)?.(payload);
    },
  };
}
