import { useActionFeedback } from "@/shared/components/action-feedback";
import { useRef, useState } from "react";
import { Linking } from "react-native";

/**
 * Opens a caller-qualified destination with ordinary pending UI and safe failure feedback.
 * A route that remains mounted after losing focus can supply a live validity check.
 * A successful handoff proves neither installation nor completion in the destination application.
 */
export function useNativeHandoff(
  destination?: string,
  isCurrent?: () => boolean,
) {
  const feedback = useActionFeedback();
  const opening = useRef(false);
  const [pending, setPending] = useState(false);

  /** Dispatches one explicit native opening; failures permit only a later explicit attempt. */
  async function open() {
    if (!destination || opening.current || isCurrent?.() === false) {
      return;
    }
    opening.current = true;
    feedback.clear();
    setPending(true);
    try {
      await Linking.openURL(destination);
    } catch {
      if (isCurrent?.() !== false) {
        feedback.error();
      }
    } finally {
      opening.current = false;
      setPending(false);
    }
  }

  return { open, pending };
}
