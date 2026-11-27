import { useActionFeedback } from "@/shared/components/action-feedback";
import { useNavigation, useRouter } from "expo-router";

/** A focused settings editor can confirm its acknowledged save after returning to its opener. */
export function useSettingsSaveFeedback(disablePrevention: () => void) {
  const router = useRouter();
  const navigation = useNavigation();
  const feedback = useActionFeedback({ retainSuccessOnUnmount: true });

  function saved(resetDraft: () => void) {
    if (!navigation.isFocused()) {
      return;
    }
    resetDraft();
    disablePrevention();
    feedback.success("Modifications enregistrées.");
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/administration");
    }
  }

  return { clear: feedback.clear, error: feedback.error, saved };
}
