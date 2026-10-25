import { createFormControl } from "react-hook-form";
import { z } from "zod";
import type { ClassificationDetailResponse } from "../../../../.generated/schemas/index.zod";
import type {
  SessionGeneration,
  SessionSnapshot,
} from "../../accounts/session/session-generation";
import type { ClassificationTarget } from "../api/classification";

/** Complete editing intent; null is represented by the explicit inherit/remove choice. */
export const classificationSchema = z
  .object({
    custom: z.boolean(),
    divisionId: z.string(),
    format: z.enum(["6x6", "4x4", "2x2"]),
    gender: z.enum(["female", "male", "mixed"]),
  })
  .superRefine((value, context) => {
    if (value.custom && !z.string().uuid().safeParse(value.divisionId).success)
      context.addIssue({
        code: "custom",
        path: ["divisionId"],
        message: "Choisissez une division active.",
      });
  });
/** RHF owns this complete editable snapshot, independently of server cache refreshes. */
export type ClassificationValues = z.infer<typeof classificationSchema>;
/** Defaults use the setting, retaining inheritance as a separate visible choice. */
export function classificationValues(
  current: ClassificationDetailResponse,
): ClassificationValues {
  return {
    custom: current.setting !== null,
    divisionId: current.setting?.divisionId ?? "",
    format: current.setting?.format ?? "6x6",
    gender: current.setting?.gender ?? "female",
  };
}
/** Original revision and required reread survive temporary route removal with the form. */
interface EditingState {
  baseline: ClassificationDetailResponse;
  needsRead: boolean;
  feedback?: string;
}
/** One session-scoped RHF draft; values have no mirror or persistence. */
interface ClassificationEditor {
  form: ReturnType<typeof createFormControl<ClassificationValues>>;
  /** Returns current revision/recovery metadata. */
  getSnapshot(): EditingState;
  /** Observes metadata independently of field subscriptions. */
  subscribe(listener: () => void): () => void;
  /** Publishes only explicit read/write outcomes. */
  update(state: EditingState): void;
  /** Detaches session lifetime ownership. */
  release(): void;
}
const editors = new Map<string, ClassificationEditor>();
/** Explicit discard and F05 invalidation release only this original-target draft. */
export function discardClassificationEditor(
  generation: string,
  target: ClassificationTarget,
) {
  const key = `${generation}:${target.kind}:${target.id}`;
  editors.get(key)?.release();
  editors.delete(key);
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
  let state: EditingState = { baseline: current, needsRead: false };
  const listeners = new Set<() => void>();
  const editor: ClassificationEditor = {
    form: createFormControl<ClassificationValues>({
      defaultValues: classificationValues(current),
    }),
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(next) {
      state = next;
      listeners.forEach((listener) => listener());
    },
    release: session.subscribe(() => {
      if (!session.isCurrent(session.generation))
        discardClassificationEditor(session.generation, target);
    }),
  };
  editors.set(key, editor);
  return editor;
}
