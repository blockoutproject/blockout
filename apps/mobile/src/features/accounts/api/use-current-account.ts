import {
  queryOptions,
  mutationOptions,
  MutationObserver,
  useMutationState,
  useIsMutating,
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
import { isAccessDenied } from "../../../shared/api/access-denied";
import { startCommand } from "../../../shared/query/use-command";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import {
  useAccountSession,
  type AccountCommandSession,
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
      queryFn: async ({ signal, client, queryKey }) => {
        const previousError = client.getQueryState(queryKey)?.error;
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
          // Only a successful account read can lift an observed refusal, never a later network failure.
          throw isAccessDenied(previousError) ? previousError : error;
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
  const groupKey = getSessionQueryKey(
    currentSession.generation,
    getEstablishAccountMutationKey(),
  );
  const pending = useIsMutating({ mutationKey: groupKey, exact: true }) > 0;
  const states = useMutationState({
    filters: { mutationKey: groupKey, exact: true },
    select: ({ state }) => ({ status: state.status, error: state.error }),
  });
  const latest = states.at(-1);

  /** Captures the successful login's new generation before native Query receives the command. */
  function createEstablishmentOptions(session: AccountCommandSession) {
    const mutationKey = getSessionQueryKey(
      session.generation,
      getEstablishAccountMutationKey(),
    );
    return mutationOptions({
      mutationKey,
      gcTime: Infinity,
      retry: false,
      networkMode: "always",
      mutationFn: async () => {
        try {
          if (!session.isCurrent(session.generation))
            throw new ApiError("cancelled");
          const credentials = await auth.getCredentials();
          if (!credentials) throw new ApiError("http", 401);
          return await establishAccount(
            request({
              session,
              schema: AccountResponse,
              headers: { Authorization: `Bearer ${credentials.accessToken}` },
            }),
          );
        } catch (error) {
          if (!session.isCurrent(session.generation))
            throw new ApiError("cancelled");
          throw error;
        }
      },
      /** Publishes current provider evidence without replacing concurrent editable profile fields. */
      onSuccess: async function acceptEstablishedAccount(account) {
        const queryKey = getSessionQueryKey(
          session.generation,
          getGetMyAccountQueryKey(),
        );
        await client.cancelQueries({ queryKey, exact: true });
        if (!session.isCurrent(session.generation)) return;
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
      },
    });
  }

  /** Starts only explicit establishment, with its captured authenticated generation and no queued duplicate. */
  function start(session: AccountCommandSession) {
    if (!session.isCurrent(session.generation)) return;
    const options = createEstablishmentOptions(session);
    return startCommand(
      client,
      { groupKey: options.mutationKey, requiresRead: () => false },
      () => {
        const cache = client.getMutationCache();
        cache
          .findAll({ mutationKey: options.mutationKey, exact: true })
          .forEach((entry) => cache.remove(entry));
        const observer = new MutationObserver(client, options);
        return observer.mutate().finally(() => observer.reset());
      },
    );
  }
  return {
    start,
    pending,
    status: latest?.status ?? "idle",
    error: latest?.error,
  };
}
