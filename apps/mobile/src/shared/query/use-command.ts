import {
  hashKey,
  useIsMutating,
  useMutation,
  useMutationState,
  useQueryClient,
  type MutationKey,
  type QueryKey,
  type QueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { useLayoutEffect, useRef } from "react";

/**
 * Commands sharing one resource exclude each other and retain contract-required recovery together.
 * The predicate is identical for every command in the group and separates confirmed refusals
 * from outcomes requiring a current read.
 */
export interface CommandPolicy {
  groupKey: MutationKey;
  requiresRead(error: unknown): boolean;
}

/** A generated command keeps native Query callbacks; retries, queues and retention have one owner. */
type CommandOptions<TData, TError, TVariables, TContext> = Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  "gcTime" | "retry" | "retryDelay" | "scope" | "networkMode" | "mutationKey"
> & { mutationKey: MutationKey };

/**
 * Atomically starts native Query work or suppresses a busy/unreconciled group. The callback must
 * create its mutation synchronously; session-establishing commands supply their new attribution here.
 */
export function startCommand<TData>(
  client: QueryClient,
  { groupKey, requiresRead }: CommandPolicy,
  execute: () => Promise<TData>,
): Promise<TData> | undefined {
  const filters = { mutationKey: groupKey };
  if (
    client.isMutating(filters) ||
    client
      .getMutationCache()
      .findAll({ ...filters, status: "error" })
      .some(({ state }) => requiresRead(state.error))
  )
    return;
  return execute();
}

/** Retires settled native records while preserving the family's unresolved failures and every active command. */
export function retireSettledCommands(
  client: QueryClient,
  groupKey: MutationKey,
  retainError: (error: unknown) => boolean,
) {
  const cache = client.getMutationCache();
  cache.findAll({ mutationKey: groupKey }).forEach((entry) => {
    if (
      entry.state.status !== "pending" &&
      !(entry.state.status === "error" && retainError(entry.state.error))
    )
      cache.remove(entry);
  });
}

/**
 * Uses Query as the sole command owner across controls, route removal and draft disposal.
 * A synchronous cache check prevents duplicate execution without queueing. Only failures requiring
 * reconciliation remain after settlement; session cache cleanup owns their final lifetime.
 */
export function useCommand<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: CommandOptions<TData, TError, TVariables, TContext>,
  { groupKey, requiresRead }: CommandPolicy,
) {
  const client = useQueryClient();
  const filters = { mutationKey: groupKey };
  const commandIdentity = hashKey(options.mutationKey);
  const currentIdentity = useRef<string | undefined>(commandIdentity);
  useLayoutEffect(() => {
    currentIdentity.current = commandIdentity;
    return () => {
      currentIdentity.current = undefined;
    };
  }, [commandIdentity]);
  const mutation = useMutation({
    ...options,
    gcTime: Infinity,
    retry: false,
    networkMode: "always",
  });
  const pending = useIsMutating(filters) > 0;
  const executing =
    useIsMutating({ mutationKey: options.mutationKey, exact: true }) > 0;
  const recovery = useMutationState({
    filters: { ...filters, status: "error" },
    select: ({ state }) => requiresRead(state.error),
  });
  const needsRead = recovery.some(Boolean);

  /**
   * Starts the native mutation before yielding, or ignores an already busy/unreconciled resource.
   * Undefined is a suppressed action, never a successful response. Callers must not reset/navigate.
   */
  function start(variables: TVariables): Promise<TData> | undefined {
    if (currentIdentity.current !== commandIdentity) return;
    const attempt = startCommand(client, { groupKey, requiresRead }, () =>
      mutation.mutateAsync(variables),
    );
    if (!attempt) return;
    return attempt.finally(() =>
      retireSettledCommands(client, groupKey, requiresRead),
    );
  }

  /**
   * Releases captured recovery only after every required read accepts fresh data without an active
   * command. Cancelled refetches can return old successful data; their unchanged counts prove nothing.
   * The feature's predicate checks original identity/revision before recovery is released. Returns
   * the native read result so the feature still owns dirty-field merging and refusal copy.
   */
  async function reconcile<TResult>(
    queryKeys: readonly QueryKey[],
    read: () => Promise<TResult>,
    accept: (result: TResult) => boolean = () => true,
  ): Promise<{ result: TResult; reconciled: boolean }> {
    const cache = client.getMutationCache();
    const failures = cache.findAll({ ...filters, status: "error" });
    const before = queryKeys.map(
      (queryKey) => client.getQueryState(queryKey)?.dataUpdateCount ?? 0,
    );
    const wasPending = client.isMutating(filters) > 0;
    const result = await read();
    const reconciled =
      !wasPending &&
      !client.isMutating(filters) &&
      accept(result) &&
      queryKeys.length > 0 &&
      queryKeys.every((queryKey, index) => {
        const current = client.getQueryState(queryKey);
        return (
          current?.status === "success" &&
          current.dataUpdateCount > before[index]
        );
      });
    if (reconciled) failures.forEach((failure) => cache.remove(failure));
    return { result, reconciled };
  }

  return {
    data: mutation.data,
    error: mutation.error,
    status: mutation.status,
    pending,
    /** Reads the native group immediately for coordination with native media preparation. */
    isPending: () => client.isMutating(filters) > 0,
    executing,
    needsRead,
    start,
    reconcile,
  };
}
