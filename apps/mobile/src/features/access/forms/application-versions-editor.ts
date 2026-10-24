import { createFormControl } from "react-hook-form";
import type { ApplicationVersionsResponse } from "../../../../.generated/schemas/index.zod";
import type {
  SessionGeneration,
  SessionSnapshot,
} from "../../accounts/session/session-generation";
import type { ApplicationVersionsValues } from "../schemas/application-versions-settings";

/** Revision and recovery feedback belonging to the retained editing snapshot. */
interface VersionsEditingState {
  baseline: ApplicationVersionsResponse;
  needsRead: boolean;
  feedback?: string;
}

/** One session's RHF owner survives protected-route removal; revisions and uncertainty stay with that draft. */
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
  /** Detaches the F05 lifetime observer when this editor is discarded. */
  release(): void;
}
let current: ApplicationVersionsEditor | undefined;

/** Discards the sole in-memory editor after explicit abandonment or a session/account boundary. */
export function discardApplicationVersionsEditor() {
  current?.release();
  current = undefined;
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
  let state: VersionsEditingState = { baseline: settings, needsRead: false };
  const listeners = new Set<() => void>();
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
    /** Replaces recovery metadata atomically; no field merging or submission occurs. */
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

/** Maps absent transport values into explicit editing strings, without creating publishable defaults. */
export function applicationVersionsValues(
  settings: ApplicationVersionsResponse,
): ApplicationVersionsValues {
  return {
    ios: {
      minimumVersion: settings.ios.minimumVersion ?? "",
      storeUrl: settings.ios.storeUrl ?? "",
    },
    android: {
      minimumVersion: settings.android.minimumVersion ?? "",
      storeUrl: settings.android.storeUrl ?? "",
    },
    message: settings.message ?? "",
  };
}
