import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createDivision,
  getCreateDivisionMutationKey,
  getGetDivisionQueryKey,
  getGetMyAccountQueryKey,
} from "../../../../.generated/mobile";
import type {
  AccountResponse,
  DivisionResponse,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "@/shared/api/api-fetch";
import type { PresentationValues } from "../schemas/presentation-schema";
import { useSportingAuthority } from "./classification";
import { invalidateDivisionReads } from "./invalidate-sporting-reads";
import { toDivisionBody } from "./presentation-request";

/** Sends the editorial command without a catalogue prerequisite. */
export function useCreateDivision() {
  const authority = useSportingAuthority("lifecycle");
  const client = useQueryClient();
  const accountId = authority.session.accountId;

  /** Read the original cache at dispatch and settlement, including after this visit unmounts. */
  function hasCurrentGrant() {
    const account = client.getQueryData<AccountResponse | null>(
      getGetMyAccountQueryKey(),
    );
    return (
      account?.accountId === accountId &&
      account.permissions.manageDivisionLifecycle === true
    );
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
        // A late acknowledgement cannot restore a division withdrawn by a current refusal.
        client.setQueryData<DivisionResponse | null>(
          getGetDivisionQueryKey(accepted.id),
          (current) => (current === null ? undefined : accepted),
        );
      }
    },
    // An independently mounted catalogue can refresh even after this visit has closed.
    onSettled: () => invalidateDivisionReads(client),
  });

  return { authority, save, hasCurrentGrant };
}
