import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getClubContacts,
  getGetClubContactsQueryKey,
  getGetMyAccountQueryKey,
  getSetClubContactsMutationKey,
  setClubContacts,
} from "../../../../.generated/mobile";
import type {
  AccountResponse,
  ClubContactsResponse,
  SetClubContactsBody,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "@/shared/api/api-fetch";
import { useSportingAuthority } from "./classification";
import { invalidateSportingReads } from "./invalidate-sporting-reads";
import { createSportingReader } from "./sporting-administration-queries";

export type ClubContacts = ClubContactsResponse;

export type ClubContactPatch = SetClubContactsBody;

/** Keeps private contact reads and acknowledged changes within the original account and club. */
export function useClubContacts(clubId: string, enabled: boolean) {
  const authority = useSportingAuthority("presentation");
  const client = useQueryClient();
  const { accountId } = authority.session;
  const queryKey = [...getGetClubContactsQueryKey(clubId), accountId];
  const read = createSportingReader(authority);
  const query = useQuery<ClubContacts | null>({
    queryKey,
    enabled: enabled && authority.enabled && accountId !== null,
    gcTime: 0,
    queryFn: (context) =>
      read(context, (options) => getClubContacts(clubId, options)),
  });

  /** Credential retrieval and a preceding presentation change may outlive the original grant. */
  function canUseContacts() {
    const account = client.getQueryData<AccountResponse | null>(
      getGetMyAccountQueryKey(),
    );
    return (
      account?.accountId === accountId &&
      account.permissions.manageSportingPresentation &&
      client.getQueryData<ClubContacts | null>(queryKey) != null
    );
  }

  const save = useMutation({
    mutationKey: [...queryKey, ...getSetClubContactsMutationKey()],
    gcTime: 0,
    mutationFn: async (patch: ClubContactPatch): Promise<ClubContacts> => {
      const options = await authority.request();
      if (!canUseContacts()) {
        throw new ApiError("cancelled");
      }
      const accepted = await setClubContacts(clubId, patch, options);
      if (!canUseContacts()) {
        throw new ApiError("cancelled");
      }
      return accepted;
    },
    onSuccess: (accepted) => {
      // A late acknowledgement cannot recreate a refused or released read.
      client.setQueryData<ClubContacts | null>(queryKey, (current) =>
        current == null ? undefined : accepted,
      );
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey, exact: true });
      invalidateSportingReads(client);
    },
  });
  return { query, save };
}
