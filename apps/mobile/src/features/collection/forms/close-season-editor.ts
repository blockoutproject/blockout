import { createFormControl } from "react-hook-form";
import type { CollectionSeasonResponse } from "../../../../.generated/schemas/index.zod";
import type {
  SessionGeneration,
  SessionSnapshot,
} from "../../accounts/session/session-generation";
import type { CloseSeasonValues } from "../schemas/close-season-schema";
import { closeSeasonValues } from "./close-season-values";

/** Original decision revision and recovery feedback accompany the exact typed label. */
interface CloseSeasonEditingState {
  baseline: CollectionSeasonResponse;
  feedback?: string;
}

/** One season's transient closure draft; no persistence or automatic command replay. */
interface ClosureEditor {
  generation: string;
  seasonId: string;
  form: ReturnType<typeof createFormControl<CloseSeasonValues>>;
  /** Returns the revision and feedback for the operator’s current decision. */
  getSnapshot(): CloseSeasonEditingState;
  /** Observes decision metadata; field subscription remains RHF-owned. */
  subscribe(listener: () => void): () => void;
  /** Publishes an accepted response, explicit reread or feedback without replacing entered text. */
  update(state: CloseSeasonEditingState): void;
  /** Resets and releases this exact typed decision without retiring a later replacement. */
  discard(): void;
}
let current: ClosureEditor | undefined;

/** Discards typed text and its editing revision; sent-command reconciliation has an independent session lifetime. */
export function discardCloseSeasonEditor() {
  current?.discard();
}

/** Keeps exact typed input and its original decision revision through temporary protected-route removal. */
export function closeSeasonEditor(
  session: SessionSnapshot & Pick<SessionGeneration, "isCurrent" | "subscribe">,
  season: CollectionSeasonResponse,
): ClosureEditor {
  if (
    current?.generation === session.generation &&
    current.seasonId === season.id
  )
    return current;
  discardCloseSeasonEditor();
  let state: CloseSeasonEditingState = { baseline: season };
  const listeners = new Set<() => void>();
  const stopSession = session.subscribe(() => {
    if (!session.isCurrent(session.generation)) editor.discard();
  });
  const editor: ClosureEditor = {
    generation: session.generation,
    seasonId: season.id,
    form: createFormControl<CloseSeasonValues>({
      defaultValues: closeSeasonValues(),
    }),
    getSnapshot: () => state,
    /** Observes decision metadata without replacing the typed confirmation. */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Publishes explicit outcomes; only an accepted response or reread advances the revision. */
    update(next) {
      state = next;
      listeners.forEach((listener) => listener());
    },
    /** Clears only this original owner; a late callback cannot discard its replacement. */
    discard() {
      if (current === editor) current = undefined;
      stopSession();
      editor.form.reset(closeSeasonValues());
    },
  };
  current = editor;
  return editor;
}
