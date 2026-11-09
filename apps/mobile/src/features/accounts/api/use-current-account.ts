import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  establishAccount,
  getEstablishAccountMutationKey,
  getGetMyAccountQueryKey,
} from "../../../../.generated/mobile";
import { AccountResponse } from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
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

/**
 * Derives account availability from the existing native session and shared Query outcome.
 * Known matching data remains usable through technical failures; current 401/403/404 withdraw it.
 * `hasLoadedAccount` reports a prior successful read in this Query lifetime, including after withdrawal.
 * `refusal` is only the latest read's HTTP refusal or absence, without retained error history.
 * `canEnter` releases a guest or an admitted stack; SDK setup failures retain their existing public journey.
 * These client facts never grant server authorization or replay a suspended command.
 */
export function useAccountAvailability() {
  const session = useAccountSession();
  const account = useCurrentAccount();
  const hasLoadedAccount = account.dataUpdatedAt > 0;
  const refusal =
    account.error instanceof ApiError &&
    account.error.kind === "http" &&
    [401, 403, 404].includes(account.error.status ?? 0)
      ? account.error
      : undefined;
  return {
    session,
    account,
    usable:
      session.status === "authenticated" &&
      session.accountId !== null &&
      account.data?.accountId === session.accountId &&
      !refusal,
    hasLoadedAccount,
    canEnter:
      hasLoadedAccount ||
      session.status === "guest" ||
      session.status === "initialization-error",
    refusal,
  };
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
