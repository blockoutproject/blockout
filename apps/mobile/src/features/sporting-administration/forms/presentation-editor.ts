import type { File } from "expo-file-system";
import { deleteOwnedImage } from "../../../shared/images/delete-owned-image";
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

/** Revision and feedback accompany the original-target RHF draft; Query owns command recovery. */
interface PresentationEditingState {
  baseline: Presentation;
  feedback?: string;
}
/** A session-scoped native form survives temporary protected-route removal without copying its values. */
interface PresentationEditor {
  form: ReturnType<typeof createFormControl<PresentationValues>>;
  /** Reads immutable original revision and feedback metadata; field values stay exclusively in RHF. */
  getSnapshot(): PresentationEditingState;
  /** Observes metadata while the native form is mounted. */
  subscribe(listener: () => void): () => void;
  /** Publishes a confirmed outcome or feedback, also while the route is absent. */
  update(state: PresentationEditingState): void;
  /** Transfers logo intent to RHF, deleting a replaced prepared copy when no upload still uses it. */
  replaceLogo(logo: PresentationValues["logo"]): void;
  /** Resets accepted defaults or explicitly preserves dirty input, releasing any retired prepared copy. */
  reset(values: PresentationValues, keepDirty?: boolean): void;
  /** Pins the exact upload resource independently of the retained draft lifetime. */
  beginUpload(file: File | undefined): void;
  /** Releases a settled upload when the current draft no longer owns its file. */
  finishUpload(file: File | undefined): void;
  /** Discards this exact draft and its assets; a later response cannot retire a replacement editor. */
  discard(): void;
}
const editors = new Map<string, PresentationEditor>();

/** Retains RHF itself using its documented standalone API, alongside its original revision and feedback. */
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
      deleteOwnedImage(file);
  }
  const stopSession = session.subscribe(() => {
    if (!session.isCurrent(session.generation)) editor.discard();
  });
  const editor: PresentationEditor = {
    form,
    getSnapshot: () => state,
    /** Subscribes mounted consumers only to revision/feedback metadata; RHF owns field subscriptions. */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Publishes outcome feedback, including while its route is absent. */
    update(next) {
      state = next;
      listeners.forEach((listener) => listener());
    },
    /** Retires the old prepared asset only after transferring editable logo intent to RHF. */
    replaceLogo(logo) {
      const previous = form.getValues("logo");
      form.setValue("logo", logo, { shouldDirty: true, shouldValidate: true });
      releaseUnused(
        previous.action === "replace" ? previous.prepared : undefined,
      );
    },
    /** Publishes accepted defaults and releases only resources no longer retained by RHF or upload. */
    reset(values, keepDirty = false) {
      const previous = form.getValues("logo");
      form.reset(values, { keepDirtyValues: keepDirty, keepDirty });
      releaseUnused(
        previous.action === "replace" ? previous.prepared : undefined,
      );
    },
    /** Keeps the accepted command’s exact file alive independently from subsequent draft changes. */
    beginUpload(file) {
      uploading = file;
    },
    /** Settles only this upload loan, preserving a resource still referenced by the draft. */
    finishUpload(file) {
      if (uploading === file) uploading = undefined;
      releaseUnused(file);
    },
    /** Detaches the session observer and releases draft resources once, without cancelling an upload loan. */
    discard() {
      if (released) return;
      released = true;
      if (editors.get(key) === editor) editors.delete(key);
      stopSession();
      const logo = form.getValues("logo");
      form.reset(presentationValues(state.baseline));
      releaseUnused(logo.action === "replace" ? logo.prepared : undefined);
    },
  };
  editors.set(key, editor);
  return editor;
}
