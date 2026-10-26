import { createFormControl } from "react-hook-form";
import type { SourceBindingResponse } from "../../../../.generated/schemas/index.zod";
import type {
  SessionSnapshot,
  SessionGeneration,
} from "../../accounts/session/session-generation";
import type { SourceCandidateValues } from "../schemas/source-candidate-schema";
import { sourceCandidateValues } from "./source-candidate-values";

/** Candidate revision and presentation state survive protected-route removal with RHF. */
interface SourceEditingState {
  baseline: SourceBindingResponse;
  editingUrl: boolean;
  feedback?: string;
}
/** The bounded source editor retains the actual RHF control, never a second copy of field values. */
interface SourceEditor {
  generation: string;
  sourceId: string;
  form: ReturnType<typeof createFormControl<SourceCandidateValues>>;
  /** Returns immutable revision/presentation metadata; RHF owns the fields separately. */
  getSnapshot(): SourceEditingState;
  /** Observes metadata changes while the source form is mounted. */
  subscribe(listener: () => void): () => void;
  /** Publishes an outcome for this draft without owning command status. */
  update(state: SourceEditingState): void;
  /** Resets and releases this exact draft without retiring a later replacement. */
  discard(): void;
}
let sourceEditor: SourceEditor | undefined;

/** Releases the source draft after explicit discard or a F05 session boundary. */
export function discardSourcePreparationEditor() {
  sourceEditor?.discard();
}

/** Retains one current source's RHF/revision until deliberate discard, another source, or session invalidation. */
export function sourcePreparationEditor(
  session: SessionSnapshot & Pick<SessionGeneration, "subscribe" | "isCurrent">,
  source: SourceBindingResponse,
): SourceEditor {
  if (
    sourceEditor?.generation === session.generation &&
    sourceEditor.sourceId === source.id
  )
    return sourceEditor;
  discardSourcePreparationEditor();
  let state: SourceEditingState = {
    baseline: source,
    editingUrl: false,
  };
  const listeners = new Set<() => void>();
  const stopSession = session.subscribe(() => {
    if (!session.isCurrent(session.generation)) editor.discard();
  });
  const editor: SourceEditor = {
    generation: session.generation,
    sourceId: source.id,
    form: createFormControl<SourceCandidateValues>({
      defaultValues: sourceCandidateValues(source),
    }),
    getSnapshot: () => state,
    /** Observes revision/presentation metadata; RHF separately owns field subscriptions. */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Publishes an explicit outcome for this source draft only. */
    update(next) {
      state = next;
      listeners.forEach((listener) => listener());
    },
    /** Clears only this original owner; a late callback cannot discard its replacement. */
    discard() {
      if (sourceEditor === editor) sourceEditor = undefined;
      stopSession();
      editor.form.reset(sourceCandidateValues(state.baseline));
    },
  };
  sourceEditor = editor;
  return editor;
}
