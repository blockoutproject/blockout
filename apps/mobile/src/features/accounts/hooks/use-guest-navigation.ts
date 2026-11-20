import { homeHref } from "@/shared/native/home-href";
import { useRouter } from "expo-router";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { useAccountSession } from "../session/account-session-provider";

/**
 * Owns explicit guest navigation for account screens; Auth0 owns credential clearing and its pending status.
 * Successful explicit departure returns home; mounted presentation owns safe failure feedback.
 */
export function useGuestNavigation() {
  const session = useAccountSession();
  const router = useRouter();
  const feedback = useActionFeedback();

  /** Uses native local clearing; a failed action remains visible and retryable. */
  async function continueAsGuest() {
    if (session.operation === "signing-out") {
      return;
    }
    feedback.clear();
    const clearing = session.clearCredentials();
    try {
      await clearing;
      router.replace(homeHref);
    } catch {
      feedback.error();
    }
  }

  return {
    continueAsGuest,
    pending: session.status === "signing-out",
  };
}
