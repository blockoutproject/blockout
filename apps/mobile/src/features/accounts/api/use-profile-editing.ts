import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth0 } from "react-native-auth0";
import {
  changeAccountProfile,
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
import { ApiError } from "../../../shared/api/api-fetch";
import { binaryImagePreview } from "../../../shared/api/binary-image-preview";
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

  /**
   * Admits current-session data after cancelling obsolete reads. A profile save preserves concurrent
   * provider evidence; an original reread refreshes it, retaining a reliable date if its snapshot lacks one.
   */
  async function accept(
    account: AccountResponse,
    preserveProviderEvidence = false,
  ) {
    await Promise.all([
      client.cancelQueries({ queryKey: currentKey, exact: true }),
      client.cancelQueries({ queryKey: photoKey, exact: true }),
    ]);
    if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
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

  const original = useQuery({
    queryKey: getSessionQueryKey(
      session.generation,
      getGetAccountQueryKey(accountId),
    ),
    enabled: false,
    gcTime: 0,
    queryFn: async ({ signal }) => {
      const credentials = await auth.getCredentials();
      if (!credentials) throw new ApiError("http", 401);
      return accept(
        await getAccount(
          accountId,
          request({
            signal,
            session,
            headers: { Authorization: `Bearer ${credentials.accessToken}` },
          }),
        ),
      );
    },
  });
  const save = useMutation({
    gcTime: 0,
    mutationFn: async (body: ChangeAccountProfileBody) => {
      const credentials = await auth.getCredentials();
      if (!credentials) throw new ApiError("http", 401);
      return accept(
        await changeAccountProfile(
          accountId,
          body,
          request({
            session,
            headers: { Authorization: `Bearer ${credentials.accessToken}` },
          }),
        ),
        true,
      );
    },
  });
  return { save, original };
}

/** Loads an owner-only binary photo into an ephemeral native preview, outside JSON response validation. */
export function useProfilePhoto(accountId: string, hasPhoto: boolean) {
  const { request } = useOrdinaryRequest();
  const session = useAccountSession();
  const auth = useAuth0();
  return useQuery({
    queryKey: getSessionQueryKey(
      session.generation,
      getGetAccountPhotoQueryKey(accountId),
    ),
    enabled: hasPhoto && session.status === "authenticated",
    gcTime: 0,
    queryFn: async ({ signal }) => {
      const credentials = await auth.getCredentials();
      if (!credentials) throw new ApiError("http", 401);
      const blob = await getAccountPhoto(
        accountId,
        request({
          signal,
          session,
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        }),
      );
      const uri = await binaryImagePreview(blob);
      if (!session.isCurrent(session.generation))
        throw new ApiError("cancelled");
      return uri;
    },
  });
}
