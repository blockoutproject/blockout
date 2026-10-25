import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth0 } from "react-native-auth0";
import {
  establishAccount,
  getEstablishAccountMutationKey,
  getGetMyAccountQueryKey,
  getMyAccount,
} from "../../../../.generated/mobile";
import { AccountResponse } from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import {
  useAccountSession,
  type AccountSession,
} from "../session/account-session-provider";

/**
 * Reads the local profile on restoration; absence never establishes an account.
 * The shared request publishes F05 identity once, independently of observer count.
 */
export function useCurrentAccount() {
  const session = useAccountSession();
  const auth = useAuth0();
  return useQuery(
    queryOptions({
      // The root observer retains the active account; detached private generations retain no cache.
      gcTime: 0,
      queryKey: getSessionQueryKey(
        session.generation,
        getGetMyAccountQueryKey(),
      ),
      enabled: session.status === "authenticated",
      queryFn: async ({ signal }) => {
        try {
          const credentials = await auth.getCredentials();
          if (!credentials) throw new ApiError("http", 401);
          const account = await getMyAccount({
            signal,
            session,
            headers: { Authorization: `Bearer ${credentials.accessToken}` },
          });
          if (signal.aborted || !session.isCurrent(session.generation))
            throw new ApiError("cancelled");
          session.setAccount(session.generation, account.accountId);
          if (!session.isCurrent(session.generation))
            throw new ApiError("cancelled");
          return account;
        } catch (error) {
          if (signal.aborted || !session.isCurrent(session.generation))
            throw new ApiError("cancelled");
          if (
            error instanceof ApiError &&
            error.status === 404 &&
            session.accountId
          )
            session.invalidate();
          throw error;
        }
      },
    }),
  );
}

/**
 * Explicit mutation only: login success or a targeted user retry supplies the captured session.
 * The generated POST has two success statuses, so its canonical response schema is supplied explicitly.
 * For an existing cached lifecycle, only provider evidence changes; concurrent profile edits survive.
 */
export function useEstablishAccount() {
  const { request } = useOrdinaryRequest();
  const auth = useAuth0();
  const client = useQueryClient();
  const currentSession = useAccountSession();
  return useMutation({
    mutationKey: getSessionQueryKey(
      currentSession.generation,
      getEstablishAccountMutationKey(),
    ),
    gcTime: 0,
    mutationFn: async (session: AccountSession) => {
      try {
        const credentials = await auth.getCredentials();
        if (!credentials) throw new ApiError("http", 401);
        const account = await establishAccount(
          request({
            session,
            schema: AccountResponse,
            headers: { Authorization: `Bearer ${credentials.accessToken}` },
          }),
        );
        const queryKey = getSessionQueryKey(
          session.generation,
          getGetMyAccountQueryKey(),
        );
        await client.cancelQueries({ queryKey, exact: true });
        if (!session.isCurrent(session.generation))
          throw new ApiError("cancelled");
        client.setQueryData<AccountResponse>(queryKey, (current) =>
          current?.accountId === account.accountId
            ? {
                ...current,
                email: account.email,
                principalCreatedAt:
                  account.principalCreatedAt ?? current.principalCreatedAt,
              }
            : account,
        );
        session.setAccount(session.generation, account.accountId);
        return account;
      } catch (error) {
        // Credential preparation precedes the shared transport's generation guard.
        if (!session.isCurrent(session.generation))
          throw new ApiError("cancelled");
        throw error;
      }
    },
  });
}
