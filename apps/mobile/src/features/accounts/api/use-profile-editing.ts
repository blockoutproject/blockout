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
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useAccountSession } from "../session/account-session-provider";

/** A lost or invalid successful response can follow a committed write and requires an original reread. */
export function isUncertainProfileSave(error: unknown) {
  return (
    error instanceof ApiError &&
    (["network", "timeout", "schema", "cancelled"].includes(error.kind) ||
      (error.status !== undefined && error.status >= 500))
  );
}

/** Owns one original-target save and explicit reconciliation through the generated clients and private cache. */
export function useProfileEditing(accountId: string) {
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

  /** Admits confirmed current-session data after cancelling obsolete profile and photo reads. */
  async function accept(account: AccountResponse) {
    await Promise.all([
      client.cancelQueries({ queryKey: currentKey, exact: true }),
      client.cancelQueries({ queryKey: photoKey, exact: true }),
    ]);
    if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
    client.setQueryData(currentKey, account);
    void client.invalidateQueries({ queryKey: photoKey, exact: true });
    return account;
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
        await getAccount(accountId, {
          signal,
          session,
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        }),
      );
    },
  });
  const save = useMutation({
    gcTime: 0,
    mutationFn: async (body: ChangeAccountProfileBody) => {
      const credentials = await auth.getCredentials();
      if (!credentials) throw new ApiError("http", 401);
      return accept(
        await changeAccountProfile(accountId, body, {
          session,
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        }),
      );
    },
  });
  return { save, original };
}

/** Loads an owner-only binary photo into an ephemeral native preview, outside JSON response validation. */
export function useProfilePhoto(accountId: string, hasPhoto: boolean) {
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
      const blob = await getAccountPhoto(accountId, {
        signal,
        session,
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });
      const uri = await photoPreview(blob);
      if (!session.isCurrent(session.generation))
        throw new ApiError("cancelled");
      return uri;
    },
  });
}

/** Converts a validated binary response into an in-memory URI supported by native Image. */
function photoPreview(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ApiError("network"));
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new ApiError("schema"));
    reader.readAsDataURL(blob);
  });
}
