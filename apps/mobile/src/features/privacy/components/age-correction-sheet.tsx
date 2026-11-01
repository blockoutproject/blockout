import { useRouter, usePreventRemove } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent } from "../../../shared/components/sheet";
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
    if (data.action.type === "GO_BACK" || data.action.type === "POP") {
      if (!age.pending) returnToPrivacy();
    } else {
      setLeaving(true);
      repeat();
    }
  });
  /** Explicit close and acknowledged installation persistence return only while this form remains mounted. */
  function returnToPrivacy() {
    if (!active.current) return;
    setLeaving(true);
    disablePrevention();
    router.replace("/privacy");
  }
  /** Persistence remains installation-owned; obsolete forms cannot navigate after an acknowledged write. */
  function confirm(value: number) {
    const attempt = age.confirm(value);
    return attempt?.then(() => returnToPrivacy());
  }
  return (
    <Sheet
      title="Corriger mon âge"
      onClose={() => {
        if (!age.pending) returnToPrivacy();
      }}
      closeDisabled={age.pending}
    >
      <SheetContent>
        <AgeForm
          key={`${session.subject}:${session.accountId}`}
          pending={age.pending || age.nativePrivacy.pending}
          submitLabel="Enregistrer"
          onSubmit={confirm}
        />
      </SheetContent>
    </Sheet>
  );
}
