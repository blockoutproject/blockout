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
  baseline: ClassificationDetailResponse;
  feedback?: string;
}
/** Owns RHF fields and their coherent baseline for the mounted route only. */
export function useClassificationDraft(
  target: ClassificationTarget,
  current: ClassificationDetailResponse,
) {
  const [state, update] = useState<DraftState>({ baseline: current });
  const form = useForm<ClassificationValues>({
    resolver: zodResolver(classificationSchema),
    defaultValues: classificationValues(current),
  });
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
    discard: () => form.reset(classificationValues(current)),
  };
}
