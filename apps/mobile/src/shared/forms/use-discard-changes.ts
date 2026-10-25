import { useLayoutEffect, useRef } from "react";
import { usePreventRemove } from "expo-router";
import { useActionConfirmation } from "./use-action-confirmation";

/** Confirms dirty-form navigation once; an unchanged live draft owns disposal and continuation. */
export function useDiscardChanges(dirty: boolean, discard: () => void) {
  const confirm = useActionConfirmation();
  const currentDirty = useRef(dirty);
  useLayoutEffect(() => {
    currentDirty.current = dirty;
  }, [dirty]);
  usePreventRemove(dirty, async ({ repeat }) => {
    const accepted = await confirm({
      title: "Abandonner les modifications ?",
      message: "Votre brouillon n’a pas été enregistré.",
      confirmLabel: "Abandonner",
      cancelLabel: "Continuer la saisie",
      destructive: true,
    });
    if (!accepted || !currentDirty.current) return;
    discard();
    repeat();
  });
}
