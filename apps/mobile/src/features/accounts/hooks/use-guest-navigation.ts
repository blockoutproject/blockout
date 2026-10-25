import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useAccountSession } from "../session/account-session-provider";

/**
 * Owns explicit guest navigation for account screens; Auth0 owns credential clearing and its pending status.
 * A completion may navigate or publish failure only in its original mounted generation.
 */
export function useGuestNavigation() {
  const session = useAccountSession();
  const router = useRouter();
  const mounted = useRef(false);
  const [failedGeneration, setFailedGeneration] = useState<string>();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Invalidates private work before local cleanup, preserving explicit retry after a current failure. */
  async function continueAsGuest() {
    if (session.status === "signing-out") return;
    setFailedGeneration(undefined);
    const clearing = session.clearCredentials();
    const generation = session.getSnapshot().generation;
    try {
      await clearing;
      if (mounted.current && session.isCurrent(generation)) router.replace("/");
    } catch {
      if (mounted.current && session.isCurrent(generation))
        setFailedGeneration(generation);
    }
  }

  return {
    continueAsGuest,
    pending: session.status === "signing-out",
    failed: failedGeneration === session.generation,
  };
}
