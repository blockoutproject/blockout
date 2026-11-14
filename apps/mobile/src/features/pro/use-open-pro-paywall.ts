import { useActionFeedback } from "@/shared/components/action-feedback";
import { usePro } from "./pro-provider";

/** Keeps brief opening-failure feedback with the originating mounted entry. */
export function useOpenProPaywall() {
  const { openPaywall } = usePro();
  const feedback = useActionFeedback();
  return async () => {
    feedback.clear();
    try {
      await openPaywall();
    } catch {
      feedback.error();
    }
  };
}
