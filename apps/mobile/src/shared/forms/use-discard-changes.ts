import { useLayoutEffect, useRef } from "react";
import { usePreventRemove } from "expo-router";
import { useActionConfirmation } from "./use-action-confirmation";

/**
 * Confirms dirty-form navigation once and returns the same guard for explicit departures such as
 * sign-out. The form owns disposal; callers run their departure only after acceptance.
 */
export function useDiscardChanges(dirty: boolean, discard: () => void) {
  const confirm = useActionConfirmation();
  const currentDirty = useRef(dirty);
  useLayoutEffect(() => {
    currentDirty.current = dirty;
  }, [dirty]);
  /**
   * A clean form leaves immediately; a held dialog cannot discard a draft already saved or replaced.
   * Inline cancellation may reset fields without releasing an editor retained for the current route.
   */
  async function confirmDiscard(discardDraft = discard): Promise<boolean> {
    if (!currentDirty.current) return true;
    const accepted = await confirm({
      title: "Abandonner les modifications ?",
      message: "Votre brouillon n’a pas été enregistré.",
      confirmLabel: "Abandonner",
      cancelLabel: "Continuer la saisie",
      destructive: true,
    });
    if (!accepted || !currentDirty.current) return false;
    discardDraft();
    return true;
  }
  usePreventRemove(dirty, async ({ repeat }) => {
    if (await confirmDiscard()) repeat();
  });
  return confirmDiscard;
}
