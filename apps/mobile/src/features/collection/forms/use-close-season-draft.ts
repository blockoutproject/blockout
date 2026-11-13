import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { CollectionSeasonResponse } from "../../../../.generated/schemas/index.zod";
import {
  closeSeasonSchema,
  type CloseSeasonValues,
} from "../schemas/close-season-schema";
import { closeSeasonValues } from "./close-season-values";

/** Original revision and local feedback belong to this mounted editing visit. */
interface DraftState {
  baseline?: CollectionSeasonResponse;
  feedback?: string;
}

/** Seeds the single editable baseline from the first available read; the mounted visit owns it thereafter. */
export function useCloseSeasonDraft(
  season: CollectionSeasonResponse | null | undefined,
) {
  const [state, update] = useState<DraftState>({
    baseline: season ?? undefined,
  });
  if (!state.baseline && season) {
    update({ ...state, baseline: season });
  }
  const form = useForm<CloseSeasonValues>({
    resolver: zodResolver(closeSeasonSchema),
    defaultValues: closeSeasonValues(),
  });
  return {
    form,
    state,
    update,
    discard: () => form.reset(closeSeasonValues()),
  };
}
