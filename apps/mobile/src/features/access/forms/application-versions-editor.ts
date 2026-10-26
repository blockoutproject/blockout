import { applicationVersionsValues } from "./application-versions-values";
import { createFormControl } from "react-hook-form";
import type { ApplicationVersionsResponse } from "../../../../.generated/schemas/index.zod";
import type {
  SessionGeneration,
  SessionSnapshot,
} from "../../accounts/session/session-generation";
import type { ApplicationVersionsValues } from "../schemas/application-versions-schema";

/** Original revision and explanatory feedback; sent-command recovery belongs to Query. */
interface VersionsEditingState {
  baseline: ApplicationVersionsResponse;
  feedback?: string;
}

/** One session's RHF owner survives protected-route removal independently of pending command recovery. */
interface ApplicationVersionsEditor {
  generation: string;
  accountId: string | null;
  form: ReturnType<typeof createFormControl<ApplicationVersionsValues>>;
  /** Returns immutable editing metadata; RHF exclusively owns field values. */
  getSnapshot(): VersionsEditingState;
  /** Observes revision/recovery changes, including completion while the route is absent. */
  subscribe(listener: () => void): () => void;
  /** Publishes an explicit accepted outcome or required recovery step. */
  update(state: VersionsEditingState): void;
  /** Resets and releases this exact draft, leaving a replacement and sent-command recovery untouched. */
  discard(): void;
}
let current: ApplicationVersionsEditor | undefined;

/** Discards the sole in-memory editor after explicit abandonment or a session/account boundary. */
export function discardApplicationVersionsEditor() {
  current?.discard();
}

/** Retains RHF itself, rather than copying field values into another store or weakening route admission. */
export function applicationVersionsEditor(
  session: SessionSnapshot & Pick<SessionGeneration, "subscribe" | "isCurrent">,
  settings: ApplicationVersionsResponse,
): ApplicationVersionsEditor {
  if (
    current?.generation === session.generation &&
    current.accountId === session.accountId
  )
    return current;
  discardApplicationVersionsEditor();
  let state: VersionsEditingState = { baseline: settings };
  const listeners = new Set<() => void>();
  const stopSession = session.subscribe(() => {
    if (!session.isCurrent(editor.generation)) editor.discard();
  });
  const editor: ApplicationVersionsEditor = {
    generation: session.generation,
    accountId: session.accountId,
    form: createFormControl<ApplicationVersionsValues>({
      defaultValues: applicationVersionsValues(settings),
    }),
    getSnapshot: () => state,
    /** Registers a mounted form for recovery-metadata updates. */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Replaces workflow metadata atomically; no field merging or submission occurs. */
    update(next) {
      state = next;
      listeners.forEach((listener) => listener());
    },
    /** Retained callbacks release only their original editor, even after another account has replaced it. */
    discard() {
      if (current === editor) current = undefined;
      stopSession();
      editor.form.reset(applicationVersionsValues(state.baseline));
    },
  };
  current = editor;
  return editor;
}
