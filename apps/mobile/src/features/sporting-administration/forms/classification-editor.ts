import { classificationValues } from "./classification-values";
import type { ClassificationValues } from "../schemas/classification-schema";
import { createFormControl } from "react-hook-form";
import type { ClassificationDetailResponse } from "../../../../.generated/schemas/index.zod";
import type {
  SessionGeneration,
  SessionSnapshot,
} from "../../accounts/session/session-generation";
import type { ClassificationTarget } from "../api/classification";

/** Original revision and feedback survive temporary route removal; Query owns command recovery. */
interface EditingState {
  baseline: ClassificationDetailResponse;
  feedback?: string;
}
/** One session-scoped RHF draft; values have no mirror or persistence. */
interface ClassificationEditor {
  form: ReturnType<typeof createFormControl<ClassificationValues>>;
  /** Returns current revision/presentation metadata. */
  getSnapshot(): EditingState;
  /** Observes metadata independently of field subscriptions. */
  subscribe(listener: () => void): () => void;
  /** Publishes only explicit read/write outcomes. */
  update(state: EditingState): void;
  /** Removes this exact draft and detaches session lifetime ownership. */
  discard(): void;
}
const editors = new Map<string, ClassificationEditor>();
/** Native selection routes reuse the original RHF draft; a direct link cannot invent an editing baseline. */
export function findClassificationEditor(
  generation: string,
  target: ClassificationTarget,
) {
  return editors.get(`${generation}:${target.kind}:${target.id}`);
}
/** Uses RHF's standalone control to retain dirty input through protected-route suspension. */
export function classificationEditor(
  session: SessionSnapshot & Pick<SessionGeneration, "subscribe" | "isCurrent">,
  target: ClassificationTarget,
  current: ClassificationDetailResponse,
): ClassificationEditor {
  const key = `${session.generation}:${target.kind}:${target.id}`;
  const existing = editors.get(key);
  if (existing) return existing;
  let state: EditingState = { baseline: current };
  const listeners = new Set<() => void>();
  const stopSession = session.subscribe(() => {
    if (!session.isCurrent(session.generation)) editor.discard();
  });
  const editor: ClassificationEditor = {
    form: createFormControl<ClassificationValues>({
      defaultValues: classificationValues(current),
    }),
    getSnapshot: () => state,
    /** Observes draft metadata separately from RHF field subscriptions. */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Publishes only explicit outcomes for the retained original-target draft. */
    update(next) {
      state = next;
      listeners.forEach((listener) => listener());
    },
    /** Identity ownership prevents a stale callback from discarding a replacement with the same target. */
    discard() {
      if (editors.get(key) === editor) editors.delete(key);
      stopSession();
      editor.form.reset(classificationValues(state.baseline));
    },
  };
  editors.set(key, editor);
  return editor;
}
