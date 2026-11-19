import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Observes the native preference for a mounted consumer. Pass a known initial value when the first frame needs it.
 * A live event supersedes the initial asynchronous read; unmount releases the subscription and ignores late reads.
 */
export function useReducedMotion(initialValue = true): boolean {
  const [reducedMotion, setReducedMotion] = useState(initialValue);
  useEffect(() => {
    let acceptInitialRead = true;
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        acceptInitialRead = false;
        setReducedMotion(enabled);
      },
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (acceptInitialRead) {
          setReducedMotion(enabled);
        }
      },
      () => {
        // An unavailable native preference keeps the conservative initial value.
      },
    );
    return () => {
      acceptInitialRead = false;
      subscription.remove();
    };
  }, []);
  return reducedMotion;
}
