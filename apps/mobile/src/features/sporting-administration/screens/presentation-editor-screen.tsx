import { useState } from "react";
import { useAccountSession } from "../../accounts/current-account";
import type { PresentationTarget } from "../api/presentation";
import { discardPresentationEditor } from "../forms/presentation-editor";
import { useEditorDiscard } from "../forms/use-editor-discard";
import { PresentationScreen } from "./presentation-screen";

/** All presentation routes share the same native removal guard and session-owned draft. */
export function PresentationEditorScreen({
  target,
}: {
  target: PresentationTarget;
}) {
  const session = useAccountSession();
  const [dirty, setDirty] = useState(false);
  useEditorDiscard(dirty, () => {
    discardPresentationEditor(session.generation, target);
    setDirty(false);
  });
  return <PresentationScreen target={target} onDirtyChange={setDirty} />;
}
