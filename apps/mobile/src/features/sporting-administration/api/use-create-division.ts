import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createDivision,
  getCreateDivisionMutationKey,
  getGetDivisionQueryKey,
} from "../../../../.generated/mobile";
import type { DivisionResponse } from "../../../../.generated/schemas/index.zod";
import { ApiError } from "@/shared/api/api-fetch";
import type { PresentationValues } from "../schemas/presentation-schema";
import {
  hasCurrentDivisionLifecycleGrant,
  useSportingAuthority,
} from "./classification";
import { invalidateDivisionCatalogue } from "./invalidate-sporting-reads";
import { toDivisionBody } from "./presentation-request";

/** Sends the editorial command without a catalogue prerequisite. */
export function useCreateDivision() {
  const authority = useSportingAuthority("lifecycle");
  const client = useQueryClient();
  const accountId = authority.session.accountId;

  /** Read the original cache at dispatch and settlement, including after this visit unmounts. */
  function hasCurrentGrant() {
    return hasCurrentDivisionLifecycleGrant(client, accountId);
  }

  const save = useMutation({
    mutationKey: getCreateDivisionMutationKey(),
    mutationFn: async (values: PresentationValues) => {
      const options = await authority.request();
      if (!hasCurrentGrant()) {
        throw new ApiError("cancelled");
      }
      return createDivision(toDivisionBody(values), options);
    },
    onSuccess: (accepted) => {
      if (hasCurrentGrant()) {
        // Keep an exact read that another visit has already resolved, including a refusal.
        client.setQueryData<DivisionResponse | null>(
          getGetDivisionQueryKey(accepted.id),
          (current) => (current === undefined ? accepted : undefined),
        );
      }
    },
    // An independently mounted catalogue can refresh even after this visit has closed.
    onSettled: () => invalidateDivisionCatalogue(client),
  });

  return { authority, save, hasCurrentGrant };
}
