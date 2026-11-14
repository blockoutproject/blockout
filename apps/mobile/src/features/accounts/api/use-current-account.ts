import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getEstablishAccountMutationKey,
  getGetMyAccountQueryKey,
} from "../../../../.generated/mobile";
import { ApiError } from "@/shared/api/api-fetch";
import { useOrdinaryRequest } from "@/features/access/ordinary-request";
import {
  useAccountSession,
  type AccountCommandSession,
} from "../session/account-session-provider";
import { currentAccountQuery } from "./current-account-query";
import { establishAccountForSession } from "./establish-account";

/** Reads the current SDK principal's business profile; restoration never establishes an account. */
export function useCurrentAccount() {
  return useQuery(currentAccountQuery(useAccountSession()));
}

/**
 * Derives account availability from the existing native session and shared Query outcome.
 * Known matching data remains usable through technical failures; current 401/403/404 withdraw it.
 * `refusal` is only the latest read's HTTP refusal or absence, without retained error history.
 * These client facts never grant server authorization or replay a suspended command.
 */
export function useAccountAvailability() {
  const session = useAccountSession();
  const account = useCurrentAccount();
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
      account.data?.accountId === session.accountId,
    refusal,
  };
}

/** Explicit establishment reuses the captured native principal; it never starts hosted login. */
export function useEstablishAccount() {
  const { request } = useOrdinaryRequest();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationKey: getEstablishAccountMutationKey(),
    gcTime: 0,
    retry: false,
    networkMode: "always",
    mutationFn: (session: AccountCommandSession) =>
      establishAccountForSession(session, request),
    /** The old client may be detached; it never redirects profile data into another principal's cache. */
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: getGetMyAccountQueryKey(),
        exact: true,
      }),
  });
  return mutation;
}
