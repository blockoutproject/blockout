import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { ApplicationVersionsResponse } from "../../../../.generated/schemas/index.zod";
import {
  applicationVersionsSchema,
  type ApplicationVersionsValues,
} from "../schemas/application-versions-schema";
import { applicationVersionsValues } from "./application-versions-values";

/** Original revision and local feedback belong to this mounted editing visit. */
interface DraftState {
  baseline: ApplicationVersionsResponse;
  feedback?: string;
}
/** Owns RHF fields and their coherent baseline for the mounted route only. */
export function useApplicationVersionsDraft(
  settings: ApplicationVersionsResponse,
) {
  const [state, update] = useState<DraftState>({ baseline: settings });
  const form = useForm<ApplicationVersionsValues>({
    resolver: zodResolver(applicationVersionsSchema),
    defaultValues: applicationVersionsValues(settings),
  });
  return {
    form,
    state,
    update,
    discard: () => form.reset(applicationVersionsValues(settings)),
  };
}
