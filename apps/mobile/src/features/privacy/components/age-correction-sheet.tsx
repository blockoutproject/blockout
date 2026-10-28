import { useRouter, usePreventRemove } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Sheet } from "../../../shared/components/sheet";
import { AgeForm } from "../../advertising/forms/age-form";
import { useAgeDeclaration } from "../../advertising/age-declaration-provider";
import { useAccountSession } from "../../accounts/current-account";

/** Replaces the privacy menu with the same neutral form; dismissal never changes the declaration. */
export function AgeCorrectionSheet() {
  const router = useRouter();
  const age = useAgeDeclaration();
  const session = useAccountSession();
  const active = useRef(true);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  /** Native swipe/back returns to privacy after removal, without revealing an older stacked sheet. */
  const disablePrevention = usePreventRemove(!leaving, ({ data, repeat }) => {
    if (data.action.type === "GO_BACK" || data.action.type === "POP")
      returnToPrivacy();
    else {
      setLeaving(true);
      repeat();
    }
  });

  /** Explicit close and successful save share the same caller, with captured F05 attribution. */
  function returnToPrivacy() {
    if (
      !active.current ||
      !session.isCurrent(session.generation) ||
      session.getSnapshot().accountId !== session.accountId
    )
      return;
    setLeaving(true);
    disablePrevention();
    router.replace("/privacy");
  }

  /** Persistence remains installation-owned; obsolete forms cannot navigate after an acknowledged write. */
  function confirm(value: number) {
    const attempt = age.confirm(value);
    return attempt?.then(returnToPrivacy);
  }
  return (
    <Sheet
      title="Corriger mon âge"
      onClose={returnToPrivacy}
      scrollable={false}
    >
      <AgeForm
        key={`${session.generation}:${session.accountId}`}
        pending={age.pending || age.nativePrivacy.pending}
        submitLabel="Enregistrer"
        onSubmit={confirm}
      />
    </Sheet>
  );
}
