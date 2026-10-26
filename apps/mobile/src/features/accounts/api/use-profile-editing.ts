import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth0 } from "react-native-auth0";
import {
  changeAccountProfile,
  getChangeAccountProfileMutationKey,
  getAccount,
  getAccountPhoto,
  getGetAccountQueryKey,
  getGetAccountPhotoQueryKey,
  getGetMyAccountQueryKey,
} from "../../../../.generated/mobile";
import type {
  AccountResponse,
  ChangeAccountProfileBody,
} from "../../../../.generated/schemas/index.zod";
import {
  ApiError,
  isUncertainMutationFailure,
} from "../../../shared/api/api-fetch";
import { useCommand } from "../../../shared/query/use-command";
import { binaryImagePreview } from "../../../shared/api/binary-image-preview";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { useAccountSession } from "../session/account-session-provider";

/** Owns one original-target save and explicit reconciliation through the generated clients and private cache. */
export function useProfileEditing(accountId: string) {
  const { request } = useOrdinaryRequest();
  const session = useAccountSession();
  const auth = useAuth0();
  const client = useQueryClient();
  const photoKey = getSessionQueryKey(
    session.generation,
    getGetAccountPhotoQueryKey(accountId),
  );
  const currentKey = getSessionQueryKey(
    session.generation,
    getGetMyAccountQueryKey(),
  );

  /** A delayed credential lookup cannot authorize edits after the current account read becomes unusable. */
  function assertCurrentAccount() {
    if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
    const current = client.getQueryState<AccountResponse>(currentKey);
    if (
      current?.status !== "success" ||
      current.data?.accountId !== accountId ||
      session.accountId !== accountId
    )
      throw new ApiError("http", 403);
  }

  /**
   * Admits current-session data after cancelling obsolete reads. A profile save preserves concurrent
   * provider evidence; an original reread refreshes it, retaining a reliable date if its snapshot lacks one.
   */
  async function accept(
    account: AccountResponse,
    preserveProviderEvidence = false,
    signal?: AbortSignal,
  ) {
    await Promise.all([
      client.cancelQueries({ queryKey: currentKey, exact: true }),
      client.cancelQueries({ queryKey: photoKey, exact: true }),
    ]);
    if (signal?.aborted) throw new ApiError("cancelled");
    if (!session.isCurrent(session.generation)) {
      // A received write stays acknowledged; only a cancelled read must reject its cache result.
      if (signal) throw new ApiError("cancelled");
      return account;
    }
    const accepted = client.setQueryData<AccountResponse>(
      currentKey,
      (current) =>
        current?.accountId === account.accountId
          ? {
              ...account,
              email: preserveProviderEvidence ? current.email : account.email,
              principalCreatedAt: preserveProviderEvidence
                ? (current.principalCreatedAt ?? account.principalCreatedAt)
                : (account.principalCreatedAt ?? current.principalCreatedAt),
            }
          : account,
    );
    void client.invalidateQueries({ queryKey: photoKey, exact: true });
    return accepted ?? account;
  }

  const originalKey = getSessionQueryKey(
    session.generation,
    getGetAccountQueryKey(accountId),
  );
  const original = useQuery(
    queryOptions({
      queryKey: originalKey,
      enabled: false,
      gcTime: 0,
      queryFn: async ({ signal }) => {
        const credentials = await auth.getCredentials();
        if (!credentials) throw new ApiError("http", 401);
        const options = request({
          signal,
          session,
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        });
        return accept(
          await getAccount(accountId, options),
          false,
          options.signal ?? signal,
        );
      },
    }),
  );
  const groupKey = getSessionQueryKey(session.generation, [
    ...getChangeAccountProfileMutationKey(),
    accountId,
  ]);
  const save = useCommand(
    {
      mutationKey: groupKey,
      mutationFn: async (body: ChangeAccountProfileBody) => {
        assertCurrentAccount();
        const credentials = await auth.getCredentials();
        assertCurrentAccount();
        if (!credentials) throw new ApiError("http", 401);
        return changeAccountProfile(
          accountId,
          body,
          request({
            session,
            headers: { Authorization: `Bearer ${credentials.accessToken}` },
          }),
        );
      },
      /** Publishes acknowledged profile fields while retaining newer provider evidence. */
      onSuccess: function acceptSavedProfile(account) {
        return accept(account, true);
      },
    },
    { groupKey, requiresRead: isUncertainMutationFailure },
  );
  /** A fresh original-account response resolves uncertainty without reapplying the editing draft. */
  function reread() {
    return save.reconcile(
      [originalKey],
      () => original.refetch(),
      (result) =>
        session.isCurrent(session.generation) &&
        !result.isError &&
        result.data?.accountId === accountId,
    );
  }

  return { save, original, reread };
}

/** Loads the displayed owner-only photo; a prepared replacement or removal disables this remote preview. */
export function useProfilePhoto(accountId: string, enabled: boolean) {
  const { request } = useOrdinaryRequest();
  const session = useAccountSession();
  const auth = useAuth0();
  return useQuery(
    queryOptions<string | null>({
      queryKey: getSessionQueryKey(
        session.generation,
        getGetAccountPhotoQueryKey(accountId),
      ),
      enabled: enabled && session.status === "authenticated",
      gcTime: 0,
      queryFn: async ({ signal, client, queryKey }) => {
        const previousError = client.getQueryState(queryKey)?.error;
        try {
          const credentials = await auth.getCredentials();
          if (!credentials) throw new ApiError("http", 401);
          const options = request({
            signal,
            session,
            headers: { Authorization: `Bearer ${credentials.accessToken}` },
          });
          const blob = await getAccountPhoto(accountId, options);
          const uri = await binaryImagePreview(blob, options.signal);
          if (!session.isCurrent(session.generation) || options.signal?.aborted)
            throw new ApiError("cancelled");
          return uri;
        } catch (error) {
          if (signal.aborted || !session.isCurrent(session.generation))
            throw new ApiError("cancelled");
          // Null removes only the URI; Query's accepted-read timestamp distinguishes refresh from initial failure.
          if (isAccessDenied(error))
            client.getQueryCache().find({ queryKey, exact: true })?.setState({
              data: null,
            });
          throw isAccessDenied(previousError) ? previousError : error;
        }
      },
    }),
  );
}
