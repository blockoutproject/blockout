import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { ClassificationDetailResponse } from "../../../../.generated/schemas/index.zod";
import type { ClassificationTarget } from "../api/classification";
import {
  classificationSchema,
  type ClassificationValues,
} from "../schemas/classification-schema";
import { classificationValues } from "./classification-values";

/** Owns RHF defaults and fields for this mounted route. */
export function useClassificationDraft(
  kind: ClassificationTarget["kind"],
  current: ClassificationDetailResponse | null,
) {
  const form = useForm<ClassificationValues>({
    resolver: zodResolver(classificationSchema),
    defaultValues: current ? classificationValues(current, kind) : undefined,
  });
  const {
    reset,
    formState: { defaultValues },
  } = form;
  // Only the first response initializes RHF; later reads preserve the mounted draft.
  useEffect(() => {
    if (!defaultValues && current) {
      reset(classificationValues(current, kind));
    }
  }, [current, defaultValues, kind, reset]);
  return form;
}
