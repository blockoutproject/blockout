import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { ClassificationDetailResponse } from "../../../../.generated/schemas/index.zod";
import type { ClassificationTarget } from "../api/classification";
import {
  classificationSchema,
  type ClassificationValues,
} from "../schemas/classification-schema";
import { classificationValues } from "./classification-values";
import { useClassificationVisit } from "./classification-visit";

/** Original revision and local feedback belong to this mounted editing visit. */
interface DraftState {
  revision: string | undefined;
  feedback?: string;
}

/** Owns RHF defaults and fields with the editing revision for this mounted route. */
export function useClassificationDraft(
  target: ClassificationTarget,
  current: ClassificationDetailResponse | null,
) {
  const [state, update] = useState<DraftState>({ revision: current?.revision });
  const form = useForm<ClassificationValues>({
    resolver: zodResolver(classificationSchema),
    defaultValues: current ? classificationValues(current) : undefined,
  });
  if (!state.revision && current) {
    update({ revision: current.revision });
  }
  const {
    reset,
    formState: { defaultValues },
  } = form;
  // Only the first response initializes RHF; later reads require the explicit revision reread.
  useEffect(() => {
    if (!defaultValues && current) {
      reset(classificationValues(current));
    }
  }, [current, defaultValues, reset]);
  const context = useClassificationVisit();
  const setVisit = context?.setVisit;
  const { kind, id } = target;
  useEffect(() => {
    setVisit?.({ target: { kind, id }, form });
    return () => setVisit?.(undefined);
  }, [setVisit, form, kind, id]);
  return {
    form,
    state,
    update,
    discard: () => form.reset(),
  };
}
