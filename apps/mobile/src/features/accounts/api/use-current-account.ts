import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  establishAccount,
  getEstablishAccountMutationKey,
  getGetMyAccountQueryKey,
} from "../../../../.generated/mobile";
import { AccountResponse } from "../../../../.generated/schemas/index.zod";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import {
  useAccountSession,
  type AccountCommandSession,
} from "../session/account-session-provider";
import { currentAccountQuery } from "./current-account-query";

/** Reads the current SDK principal's business profile; restoration never establishes an account. */
export function useCurrentAccount() {
  return useQuery(currentAccountQuery(useAccountSession()));
}

/** Explicit login/retry owns one native mutation; detached callbacks retain their original client. */
export function useEstablishAccount() {
  const { request } = useOrdinaryRequest();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationKey: getEstablishAccountMutationKey(),
    gcTime: 0,
    retry: false,
    networkMode: "always",
    mutationFn: async (session: AccountCommandSession) => {
      const credentials = await session.getCredentials();
      return establishAccount(
        request({
          schema: AccountResponse,
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        }),
      );
    },
    /** The old client may be detached; it never redirects profile data into another principal's cache. */
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: getGetMyAccountQueryKey(),
        exact: true,
      }),
  });
  return mutation;
}
