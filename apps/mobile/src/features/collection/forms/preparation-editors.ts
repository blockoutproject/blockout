import { createFormControl } from "react-hook-form";
import type {
  CollectionProviderEnum,
  CollectionSeasonResponse,
  SourceBindingResponse,
} from "../../../../.generated/schemas/index.zod";
import type {
  SessionSnapshot,
  SessionGeneration,
} from "../../accounts/session/session-generation";
import type {
  CreateSourceValues,
  SourceCandidateValues,
} from "../schemas/source-candidate";

/** Candidate revision and presentation state survive protected-route removal with RHF. */
interface SourceEditingState {
  baseline: SourceBindingResponse;
  editingUrl: boolean;
  feedback?: string;
}
/** The bounded source editor retains the actual RHF control, never a second copy of field values. */
interface SourceEditor {
  generation: string;
  sourceId: string;
  form: ReturnType<typeof createFormControl<SourceCandidateValues>>;
  /** Returns immutable revision/presentation metadata; RHF owns the fields separately. */
  getSnapshot(): SourceEditingState;
  /** Observes metadata changes while the source form is mounted. */
  subscribe(listener: () => void): () => void;
  /** Publishes an outcome for this draft without owning command status. */
  update(state: SourceEditingState): void;
  /** Detaches the F05 lifetime observer after this draft is discarded. */
  release(): void;
}
let sourceEditor: SourceEditor | undefined;

/** Releases the source draft after explicit discard or a F05 session boundary. */
export function discardSourcePreparationEditor() {
  sourceEditor?.release();
  sourceEditor = undefined;
}

/** Retains one current source's RHF/revision until deliberate discard, another source, or session invalidation. */
export function sourcePreparationEditor(
  session: SessionSnapshot & Pick<SessionGeneration, "subscribe" | "isCurrent">,
  source: SourceBindingResponse,
): SourceEditor {
  if (
    sourceEditor?.generation === session.generation &&
    sourceEditor.sourceId === source.id
  )
    return sourceEditor;
  discardSourcePreparationEditor();
  let state: SourceEditingState = {
    baseline: source,
    editingUrl: false,
  };
  const listeners = new Set<() => void>();
  const editor: SourceEditor = {
    generation: session.generation,
    sourceId: source.id,
    form: createFormControl<SourceCandidateValues>({
      defaultValues: { candidateUrl: source.candidateUrl ?? "" },
    }),
    getSnapshot: () => state,
    /** Observes revision/presentation metadata; RHF separately owns field subscriptions. */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Publishes an explicit outcome for this source draft only. */
    update(next) {
      state = next;
      listeners.forEach((listener) => listener());
    },
    release: session.subscribe(() => {
      if (!session.isCurrent(editor.generation)) {
        editor.release();
        if (sourceEditor === editor) sourceEditor = undefined;
      }
    }),
  };
  sourceEditor = editor;
  return editor;
}

/** The exact provider launch selection and addition draft retain their original season revision on recovery. */
interface ProviderEditingState {
  baseline: CollectionSeasonResponse;
  selected: string[] | null;
  adding: boolean;
  feedback?: string;
}
/** One current provider workspace survives admission removal without persistence or a draft registry. */
interface ProviderEditor {
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
  /** Detaches the F05 observer when this provider draft is discarded. */
  release(): void;
}
let providerEditor: ProviderEditor | undefined;

/** Releases the manual provider draft and selected command scope after deliberate discard or session invalidation. */
export function discardProviderPreparationEditor() {
  providerEditor?.release();
  providerEditor = undefined;
}

/** Retains RHF and command context for one season/provider while Expo temporarily removes protected routes. */
export function providerPreparationEditor(
  session: SessionSnapshot & Pick<SessionGeneration, "subscribe" | "isCurrent">,
  season: CollectionSeasonResponse,
  provider: CollectionProviderEnum,
): ProviderEditor {
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
  const editor: ProviderEditor = {
    generation: session.generation,
    seasonId: season.id,
    provider,
    form: createFormControl<CreateSourceValues>({
      defaultValues: { organizerReference: "", candidateUrl: "" },
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
    release: session.subscribe(() => {
      if (!session.isCurrent(editor.generation)) {
        editor.release();
        if (providerEditor === editor) providerEditor = undefined;
      }
    }),
  };
  providerEditor = editor;
  return editor;
}
