import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { CollectionSeasonResponse } from "../../../../.generated/schemas/index.zod";
import {
  createSourceSchema,
  type CreateSourceValues,
} from "../schemas/create-source-schema";
import { createSourceValues } from "./create-source-values";

/** Original revision and local feedback belong to this mounted editing visit. */
interface DraftState {
  baseline: CollectionSeasonResponse;
  selected: string[] | null;
  adding: boolean;
  feedback?: string;
}
/** Owns RHF fields and their coherent baseline for the mounted route only. */
export function useProviderPreparationDraft(season: CollectionSeasonResponse) {
  const [state, update] = useState<DraftState>({
    baseline: season,
    selected: null,
    adding: false,
  });
  const form = useForm<CreateSourceValues>({
    resolver: zodResolver(createSourceSchema),
    defaultValues: createSourceValues(),
  });
  return {
    form,
    state,
    update,
    discard: () => form.reset(createSourceValues()),
  };
}
