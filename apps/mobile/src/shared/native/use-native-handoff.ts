import { useActionFeedback } from "../components/action-feedback";
import { useState } from "react";
import { Linking } from "react-native";

/**
 * Opens a caller-qualified destination with ordinary pending UI and safe failure feedback.
 * A successful handoff proves neither installation nor completion in the destination application.
 */
export function useNativeHandoff(destination?: string) {
  const feedback = useActionFeedback();
  const [pending, setPending] = useState(false);

  /** Dispatches one explicit native opening; failures permit only a later explicit attempt. */
  async function open() {
    if (!destination || pending) return;
    feedback.clear();
    setPending(true);
    try {
      await Linking.openURL(destination);
    } catch {
      feedback.error();
    } finally {
      setPending(false);
    }
  }

  return { open, pending };
}
