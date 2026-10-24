import { createFormControl } from "react-hook-form";
import type { CollectionSeasonResponse } from "../../../../.generated/schemas/index.zod";
import type {
  SessionGeneration,
  SessionSnapshot,
} from "../../accounts/session/session-generation";

/** Exact user input belongs to RHF; whitespace is significant. */
export interface CloseSeasonValues {
  confirmation: string;
}
/** The editing revision and uncertainty survive admission removal alongside the original RHF control. */
interface ClosureState {
  baseline: CollectionSeasonResponse;
  needsRead: boolean;
  feedback?: string;
}
/** One season's transient closure draft; no persistence or automatic command replay. */
interface ClosureEditor {
  generation: string;
  seasonId: string;
  form: ReturnType<typeof createFormControl<CloseSeasonValues>>;
  /** Returns the revision against which the operator is currently deciding. */
  getSnapshot(): ClosureState;
  /** Observes revision and feedback; field subscription remains RHF-owned. */
  subscribe(listener: () => void): () => void;
  /** Publishes an accepted response or explicit reread without replacing entered text. */
  update(state: ClosureState): void;
  /** Removes the F05 lifecycle observer. */
  release(): void;
}
let current: ClosureEditor | undefined;

/** Explicit cancel/discard and F05 invalidation release the single retained closure draft. */
export function discardCloseSeasonEditor() {
  current?.release();
  current = undefined;
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
  let state: ClosureState = { baseline: season, needsRead: false };
  const listeners = new Set<() => void>();
  const editor: ClosureEditor = {
    generation: session.generation,
    seasonId: season.id,
    form: createFormControl<CloseSeasonValues>({
      defaultValues: { confirmation: "" },
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
      if (!session.isCurrent(editor.generation)) {
        editor.release();
        if (current === editor) current = undefined;
      }
    }),
  };
  current = editor;
  return editor;
}
