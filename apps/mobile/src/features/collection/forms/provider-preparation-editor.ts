import { createFormControl } from "react-hook-form";
import type {
  CollectionProviderEnum,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import type {
  SessionSnapshot,
  SessionGeneration,
} from "../../accounts/session/session-generation";
import type { CreateSourceValues } from "../schemas/create-source-schema";
import { createSourceValues } from "./create-source-values";

/** The exact provider launch selection and addition draft retain their original season revision on recovery. */
interface ProviderEditingState {
  baseline: CollectionSeasonResponse;
  selected: string[] | null;
  adding: boolean;
  feedback?: string;
}
/** One current provider workspace survives admission removal without persistence or a draft registry. */
export interface ProviderPreparationEditor {
  generation: string;
  seasonId: string;
  provider: CollectionProviderEnum;
  form: ReturnType<typeof createFormControl<CreateSourceValues>>;
  /** Returns immutable selection/revision metadata, without copying RHF fields. */
  getSnapshot(): ProviderEditingState;
  /** Observes selection/revision changes for mounted provider screens. */
  subscribe(listener: () => void): () => void;
  /** Publishes this provider's explicit editing outcome. */
  update(state: ProviderEditingState): void;
  /** Resets and releases this exact candidate draft without retiring a later replacement. */
  discard(): void;
}
let providerEditor: ProviderPreparationEditor | undefined;

/** Releases the manual provider draft and selected command scope after deliberate discard or session invalidation. */
export function discardProviderPreparationEditor() {
  providerEditor?.discard();
}

/** Retains RHF and command context for one season/provider while Expo temporarily removes protected routes. */
export function providerPreparationEditor(
  session: SessionSnapshot & Pick<SessionGeneration, "subscribe" | "isCurrent">,
  season: CollectionSeasonResponse,
  provider: CollectionProviderEnum,
): ProviderPreparationEditor {
  if (
    providerEditor?.generation === session.generation &&
    providerEditor.seasonId === season.id &&
    providerEditor.provider === provider
  )
    return providerEditor;
  discardProviderPreparationEditor();
  let state: ProviderEditingState = {
    baseline: season,
    selected: null,
    adding: false,
  };
  const listeners = new Set<() => void>();
  const stopSession = session.subscribe(() => {
    if (!session.isCurrent(session.generation)) editor.discard();
  });
  const editor: ProviderPreparationEditor = {
    generation: session.generation,
    seasonId: season.id,
    provider,
    form: createFormControl<CreateSourceValues>({
      defaultValues: createSourceValues(),
    }),
    getSnapshot: () => state,
    /** Observes selection/revision changes independently from RHF's field lifecycle. */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Replaces only bounded provider metadata, without reading or submitting remote data. */
    update(next) {
      state = next;
      listeners.forEach((listener) => listener());
    },
    /** Clears only this original owner; a late callback cannot discard its replacement. */
    discard() {
      if (providerEditor === editor) providerEditor = undefined;
      stopSession();
      editor.form.reset(createSourceValues());
    },
  };
  providerEditor = editor;
  return editor;
}
