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
  baseline: SourceBindingResponse;
  editingUrl: boolean;
  feedback?: string;
}
/** Owns RHF fields and their coherent baseline for the mounted route only. */
export function useSourceCandidateDraft(source: SourceBindingResponse) {
  const [state, update] = useState<DraftState>({
    baseline: source,
    editingUrl: false,
  });
  const form = useForm<SourceCandidateValues>({
    resolver: zodResolver(sourceCandidateSchema),
    defaultValues: sourceCandidateValues(source),
  });
  return {
    form,
    state,
    update,
    discard: () => form.reset(sourceCandidateValues(source)),
  };
}
