import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { SourceBindingResponse } from "../../../../.generated/schemas/index.zod";
import {
  sourceCandidateSchema,
  type SourceCandidateValues,
} from "../schemas/source-candidate-schema";
import { sourceCandidateValues } from "./source-candidate-values";

/** Original revision and local feedback belong to this mounted editing visit. */
interface DraftState {
  baseline?: SourceBindingResponse;
  editingUrl: boolean;
  feedback?: string;
}

/** Seeds the single editable baseline from the first available read; the mounted visit owns it thereafter. */
export function useSourceCandidateDraft(
  source: SourceBindingResponse | null | undefined,
) {
  const [state, update] = useState<DraftState>({
    baseline: source ?? undefined,
    editingUrl: false,
  });
  if (!state.baseline && source) {
    update({ ...state, baseline: source });
  }
  const form = useForm<SourceCandidateValues>({
    resolver: zodResolver(sourceCandidateSchema),
    defaultValues: { candidateUrl: "" },
    values: state.baseline ? sourceCandidateValues(state.baseline) : undefined,
    resetOptions: { keepDirtyValues: true, keepDirty: true, keepErrors: true },
  });
  return {
    form,
    state,
    update,
    discard: () => {
      if (state.baseline) {
        form.reset(sourceCandidateValues(state.baseline), {
          keepDirtyValues: false,
          keepDirty: false,
          keepErrors: false,
        });
      }
    },
  };
}
