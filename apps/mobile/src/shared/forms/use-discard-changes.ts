import { useLayoutEffect, useRef } from "react";
import { usePreventRemove } from "expo-router";
import { useActionConfirmation } from "./use-action-confirmation";

/**
 * Confirms dirty-form navigation once. A caller that has reset its accepted draft can disable
 * prevention before issuing a new navigation action in the same event.
 */
export function useDiscardChanges(dirty: boolean, discard: () => void) {
  const confirm = useActionConfirmation();
  const currentDirty = useRef(dirty);
  useLayoutEffect(() => {
    currentDirty.current = dirty;
  }, [dirty]);

  return usePreventRemove(dirty, ({ repeat }) => {
    if (!currentDirty.current) {
      repeat();
      return;
    }
    void confirm({
      title: "Abandonner les modifications ?",
      message: "Votre brouillon n’a pas été enregistré.",
      confirmLabel: "Abandonner",
      cancelLabel: "Continuer la saisie",
      destructive: true,
    }).then((accepted) => {
      // The dialog may outlive a draft saved while the question was open.
      if (accepted && currentDirty.current) {
        discard();
        repeat();
      }
    });
  });
}
