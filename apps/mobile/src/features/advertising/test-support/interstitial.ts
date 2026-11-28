import type { AdError, AdEventType } from "react-native-google-mobile-ads";

/** Keeps callbacks after destroy so tests can deliver previously queued native events. */
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
    emit(event: AdEventType, error?: AdError) {
      listeners.get(event)?.(error);
    },
  };
}
