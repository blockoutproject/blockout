import { useActionFeedback } from "../components/action-feedback";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Linking } from "react-native";

/**
 * Opens one caller-qualified native destination at a time. The operation handle rejects duplicate
 * actions synchronously; rendered status belongs only to the current destination and mounted owner.
 * A successful handoff proves neither installation nor completion in the destination application.
 */
export function useNativeHandoff(destination?: string) {
  const feedback = useActionFeedback();
  const owner = useMemo(() => ({ destination }), [destination]);
  const current = useRef<typeof owner | undefined>(owner);
  const operation = useRef<Promise<void> | undefined>(undefined);
  const [attempt, setAttempt] = useState<{
    owner: typeof owner;
    phase: "pending" | "idle";
  }>();
  useLayoutEffect(() => {
    current.current = owner;
    return () => {
      current.current = undefined;
      operation.current = undefined;
    };
  }, [owner]);

  /** Dispatches one explicit native opening; failures permit only a later explicit attempt. */
  function open() {
    if (!destination || current.current !== owner || operation.current) return;
    feedback.clear();
    setAttempt({ owner, phase: "pending" });
    const opening = Linking.openURL(destination)
      .then(
        () => {
          if (current.current === owner) setAttempt({ owner, phase: "idle" });
        },
        () => {
          if (current.current === owner) {
            setAttempt({ owner, phase: "idle" });
            feedback.error();
          }
        },
      )
      .finally(() => {
        if (operation.current === opening) operation.current = undefined;
      });
    operation.current = opening;
  }

  const phase = attempt?.owner === owner ? attempt.phase : "idle";
  return { open, pending: phase === "pending" };
}
