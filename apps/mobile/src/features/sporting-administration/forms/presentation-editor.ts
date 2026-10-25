import type { File } from "expo-file-system";
import { deletePreparedImage } from "../../../shared/images/delete-prepared-image";
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
  /** Transfers logo intent to RHF, deleting a replaced prepared copy when no upload still uses it. */
  replaceLogo(logo: PresentationValues["logo"]): void;
  /** Resets accepted defaults or explicitly preserves dirty input, releasing any retired prepared copy. */
  reset(values: PresentationValues, keepDirty?: boolean): void;
  /** Pins the exact upload resource independently of the retained draft lifetime. */
  beginUpload(file: File | undefined): void;
  /** Releases a settled upload when the current draft no longer owns its file. */
  finishUpload(file: File | undefined): void;
  /** Detaches F05 and releases the draft's prepared copy; a pending upload releases its own copy on settlement. */
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
  let uploading: File | undefined;
  let released = false;
  const form = createFormControl<PresentationValues>({
    defaultValues: presentationValues(presentation),
  });
  /** A prepared file is no longer needed only after both the current RHF draft and upload release it. */
  function releaseUnused(file: File | undefined) {
    const logo = form.getValues("logo");
    if (
      file !== uploading &&
      (released || logo.action !== "replace" || logo.prepared !== file)
    )
      deletePreparedImage(file);
  }
  const stopSession = session.subscribe(() => {
    if (!session.isCurrent(session.generation))
      discardPresentationEditor(session.generation, target);
  });
  const editor: PresentationEditor = {
    form,
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
    replaceLogo(logo) {
      const previous = form.getValues("logo");
      form.setValue("logo", logo, { shouldDirty: true, shouldValidate: true });
      releaseUnused(
        previous.action === "replace" ? previous.prepared : undefined,
      );
    },
    reset(values, keepDirty = false) {
      const previous = form.getValues("logo");
      form.reset(values, { keepDirtyValues: keepDirty, keepDirty });
      releaseUnused(
        previous.action === "replace" ? previous.prepared : undefined,
      );
    },
    beginUpload(file) {
      uploading = file;
    },
    finishUpload(file) {
      if (uploading === file) uploading = undefined;
      releaseUnused(file);
    },
    release() {
      if (released) return;
      released = true;
      stopSession();
      const logo = form.getValues("logo");
      form.reset(presentationValues(state.baseline));
      releaseUnused(logo.action === "replace" ? logo.prepared : undefined);
    },
  };
  editors.set(key, editor);
  return editor;
}
