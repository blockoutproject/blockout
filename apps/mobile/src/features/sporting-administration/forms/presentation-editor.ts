import { createFormControl } from "react-hook-form";
import type { Presentation, PresentationTarget } from "../api/presentation";
import type {
  SessionGeneration,
  SessionSnapshot,
} from "../../accounts/session/session-generation";
import {
  presentationValues,
  type PresentationValues,
} from "./presentation-values";

/** Revision and recovery belong to the same original-target draft as its sole RHF control. */
interface PresentationEditingState {
  baseline: Presentation;
  needsRead: boolean;
  feedback?: string;
}
/** A session-scoped native form survives temporary protected-route removal without copying its values. */
interface PresentationEditor {
  form: ReturnType<typeof createFormControl<PresentationValues>>;
  /** Reads immutable original revision and recovery metadata; field values stay exclusively in RHF. */
  getSnapshot(): PresentationEditingState;
  /** Observes metadata while the native form is mounted. */
  subscribe(listener: () => void): () => void;
  /** Publishes a confirmed outcome or recovery requirement, also while the route is absent. */
  update(state: PresentationEditingState): void;
  /** Detaches the F05 invalidation observer after explicit discard or session end. */
  release(): void;
}
const editors = new Map<string, PresentationEditor>();

/** Removes only the explicitly abandoned original-target editor; F05 invalidation clears the session's editors. */
export function discardPresentationEditor(
  generation: string,
  target: PresentationTarget,
) {
  const key = `${generation}:${target.kind}:${target.id}`;
  editors.get(key)?.release();
  editors.delete(key);
}

/** Retains RHF itself using its documented standalone API, alongside original revision and uncertainty. */
export function presentationEditor(
  session: SessionSnapshot & Pick<SessionGeneration, "subscribe" | "isCurrent">,
  target: PresentationTarget,
  presentation: Presentation,
): PresentationEditor {
  const key = `${session.generation}:${target.kind}:${target.id}`;
  const existing = editors.get(key);
  if (existing) return existing;
  let state: PresentationEditingState = {
    baseline: presentation,
    needsRead: false,
  };
  const listeners = new Set<() => void>();
  const editor: PresentationEditor = {
    form: createFormControl<PresentationValues>({
      defaultValues: presentationValues(presentation),
    }),
    getSnapshot: () => state,
    /** Subscribes mounted consumers only to revision/recovery metadata; RHF owns field subscriptions. */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Publishes a confirmed outcome or required reread, including while its route is absent. */
    update(next) {
      state = next;
      listeners.forEach((listener) => listener());
    },
    release: session.subscribe(() => {
      if (!session.isCurrent(session.generation))
        discardPresentationEditor(session.generation, target);
    }),
  };
  editors.set(key, editor);
  return editor;
}
