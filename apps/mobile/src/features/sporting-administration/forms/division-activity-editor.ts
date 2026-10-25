import type { DivisionResponse } from "../../../../.generated/schemas/index.zod";
import type {
  SessionGeneration,
  SessionSnapshot,
} from "../../accounts/session/session-generation";
/** The original lifecycle decision survives route suspension until explicit recovery or F05 invalidation. */
interface ActivityState {
  baseline: DivisionResponse;
  needsRead: boolean;
  feedback?: string;
}
/** Holds only lifecycle revision/recovery metadata, never presentation or a second server cache. */
interface ActivityEditor {
  /** Reads the current decision snapshot. */
  getSnapshot(): ActivityState;
  /** Observes explicit command/read outcomes. */
  subscribe(listener: () => void): () => void;
  /** Publishes the next decision snapshot. */
  update(next: ActivityState): void;
  /** Releases the session observer. */
  release(): void;
}
const editors = new Map<string, ActivityEditor>();
/** Retains the original activity decision after uncertainty; reopening a list cannot silently authorize a retry. */
export function divisionActivityEditor(
  session: SessionSnapshot & Pick<SessionGeneration, "subscribe" | "isCurrent">,
  division: DivisionResponse,
): ActivityEditor {
  const key = `${session.generation}:${division.id}`;
  const current = editors.get(key);
  if (current) return current;
  let state: ActivityState = { baseline: division, needsRead: false };
  const listeners = new Set<() => void>();
  const editor: ActivityEditor = {
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
      if (!session.isCurrent(session.generation)) {
        editor.release();
        editors.delete(key);
      }
    }),
  };
  editors.set(key, editor);
  return editor;
}
