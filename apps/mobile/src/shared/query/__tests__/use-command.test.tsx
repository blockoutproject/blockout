import { QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import type { PropsWithChildren } from "react";
import { ApiError, isUncertainMutationFailure } from "../../api/api-fetch";
import { createSessionGeneration } from "../../../features/accounts/session/session-generation";
import { bindSessionQueries, createQueryClient } from "../query-client";
import { useCommand } from "../use-command";

const groupKey = ["session", "command-session", "resource"];
const queryKey = [...groupKey, "read"];
let client: ReturnType<typeof createQueryClient>;

beforeEach(() => {
  client = createQueryClient();
});

afterEach(async () => {
  await cleanup();
  client.clear();
});

/** Real Query context shared by competing command observers; no command lifecycle is mocked. */
function Wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

it("sends one command for two same-turn actions across observers without queueing", async () => {
  // Given
  const response = Promise.withResolvers<string>();
  const write = jest.fn<Promise<string>, [string]>(() => response.promise);
  const hooks = await renderHook(
    () => ({
      first: useCommand(
        { mutationKey: [...groupKey, "save"], mutationFn: write },
        { groupKey, requiresRead: isUncertainMutationFailure },
      ),
      second: useCommand(
        { mutationKey: [...groupKey, "activate"], mutationFn: write },
        { groupKey, requiresRead: isUncertainMutationFailure },
      ),
    }),
    { wrapper: Wrapper },
  );
  let first: Promise<string> | undefined;
  let duplicate: Promise<string> | undefined;

  // When: neither caller can observe a React rerender before the second action.
  await act(() => {
    first = hooks.result.current.first.start("saved");
    duplicate = hooks.result.current.second.start("duplicate");
  });

  // Then
  expect(duplicate).toBeUndefined();
  expect(write).toHaveBeenCalledTimes(1);
  expect(write).toHaveBeenCalledWith("saved", expect.anything());
  await waitFor(() => expect(hooks.result.current.first.pending).toBe(true));
  expect(hooks.result.current.second.pending).toBe(true);
  expect(hooks.result.current.first.executing).toBe(true);
  expect(hooks.result.current.second.executing).toBe(false);

  // When
  await act(async () => {
    response.resolve("accepted");
    await first;
  });

  // Then: completion never resumes the suppressed action.
  await waitFor(() => expect(hooks.result.current.first.pending).toBe(false));
  await waitFor(() => expect(hooks.result.current.first.data).toBe("accepted"));
  expect(write).toHaveBeenCalledTimes(1);
});

it("retains uncertain recovery after the initiating form is discarded and remounted", async () => {
  // Given
  const response = Promise.withResolvers<string>();
  const write = jest.fn<Promise<string>, []>(() => response.promise);
  const useSave = () =>
    useCommand(
      { mutationKey: [...groupKey, "save"], mutationFn: write },
      { groupKey, requiresRead: isUncertainMutationFailure },
    );
  const initiating = await renderHook(useSave, { wrapper: Wrapper });
  let attempt: Promise<unknown> | undefined;
  await act(() => {
    attempt = initiating.result.current.start()?.catch((error) => error);
  });

  // When
  await initiating.unmount();
  const returning = await renderHook(useSave, { wrapper: Wrapper });

  // Then
  expect(returning.result.current.pending).toBe(true);
  expect(returning.result.current.start()).toBeUndefined();

  // When
  await act(async () => {
    response.reject(new ApiError("timeout"));
    await attempt;
  });
  await returning.unmount();
  const reopened = await renderHook(useSave, { wrapper: Wrapper });

  // Then
  expect(reopened.result.current.needsRead).toBe(true);
  expect(reopened.result.current.pending).toBe(false);
  expect(reopened.result.current.start()).toBeUndefined();
  expect(write).toHaveBeenCalledTimes(1);
});

it("keeps uncertain recovery after a cancelled reread returns old successful data", async () => {
  // Given
  client.setQueryData(queryKey, "old");
  const hooks = await renderHook(
    () =>
      useCommand(
        {
          mutationKey: [...groupKey, "save"],
          mutationFn: async () => {
            throw new ApiError("timeout");
          },
        },
        { groupKey, requiresRead: isUncertainMutationFailure },
      ),
    { wrapper: Wrapper },
  );
  await act(async () => {
    await hooks.result.current.start()?.catch(() => {});
  });
  const reading = Promise.withResolvers<string>();
  const observer = new QueryObserver(client, {
    queryKey,
    enabled: false,
    queryFn: () => reading.promise,
  });

  // When
  const reconciliation = hooks.result.current.reconcile([queryKey], () =>
    observer.refetch(),
  );
  await client.cancelQueries({ queryKey, exact: true });
  const result = await reconciliation;

  // Then
  expect(result.result.data).toBe("old");
  expect(result.reconciled).toBe(false);
  await waitFor(() => expect(hooks.result.current.needsRead).toBe(true));
  expect(hooks.result.current.start()).toBeUndefined();
  observer.destroy();
  reading.resolve("late");
});

it("allows a new explicit command only after a fresh successful reconciliation", async () => {
  // Given
  const write = jest
    .fn<Promise<string>, []>()
    .mockRejectedValueOnce(new ApiError("timeout"))
    .mockResolvedValue("saved again");
  const hooks = await renderHook(
    () =>
      useCommand(
        { mutationKey: [...groupKey, "save"], mutationFn: write },
        { groupKey, requiresRead: isUncertainMutationFailure },
      ),
    { wrapper: Wrapper },
  );
  await act(async () => {
    await hooks.result.current.start()?.catch(() => {});
  });

  // When
  let reconciled = false;
  await act(async () => {
    const reading = await hooks.result.current.reconcile([queryKey], () =>
      client.query({ queryKey, queryFn: async () => "current" }),
    );
    reconciled = reading.reconciled;
  });

  // Then: a successful read itself never sends the command again.
  expect(reconciled).toBe(true);
  await waitFor(() => expect(hooks.result.current.needsRead).toBe(false));
  expect(write).toHaveBeenCalledTimes(1);

  // When
  await act(async () => {
    await hooks.result.current.start();
  });

  // Then
  expect(write).toHaveBeenCalledTimes(2);
  await waitFor(() => expect(hooks.result.current.data).toBe("saved again"));
});

it("preserves a definite refusal on the initiating observer without blocking a corrected command", async () => {
  // Given
  const refusal = new ApiError("http", 422);
  const write = jest
    .fn<Promise<string>, []>()
    .mockRejectedValueOnce(refusal)
    .mockResolvedValue("corrected");
  const hooks = await renderHook(
    () =>
      useCommand(
        { mutationKey: [...groupKey, "save"], mutationFn: write },
        { groupKey, requiresRead: isUncertainMutationFailure },
      ),
    { wrapper: Wrapper },
  );

  // When
  await act(async () => {
    await hooks.result.current.start()?.catch(() => {});
  });

  // Then
  await waitFor(() => expect(hooks.result.current.error).toBe(refusal));
  expect(hooks.result.current.status).toBe("error");
  await waitFor(() => expect(hooks.result.current.needsRead).toBe(false));

  // When
  await act(async () => {
    await hooks.result.current.start();
  });

  // Then
  await waitFor(() => expect(hooks.result.current.data).toBe("corrected"));
  expect(write).toHaveBeenCalledTimes(2);
});

it("removes retained command recovery at the existing business session boundary", async () => {
  // Given
  const session = createSessionGeneration();
  const generation = session.getSnapshot().generation;
  const privateGroup = ["session", generation, "resource"];
  const unbind = bindSessionQueries(
    client,
    session.subscribe,
    session.isCurrent,
  );
  const hooks = await renderHook(
    () =>
      useCommand(
        {
          mutationKey: [...privateGroup, "save"],
          mutationFn: async () => {
            throw new ApiError("timeout");
          },
        },
        { groupKey: privateGroup, requiresRead: isUncertainMutationFailure },
      ),
    { wrapper: Wrapper },
  );
  await act(async () => {
    await hooks.result.current.start()?.catch(() => {});
  });
  await waitFor(() => expect(hooks.result.current.needsRead).toBe(true));

  // When
  await act(() => session.invalidate());

  // Then
  await waitFor(() => expect(hooks.result.current.needsRead).toBe(false));
  expect(client.getMutationCache().getAll()).toHaveLength(0);
  unbind();
});

it("ignores an old confirmation after the same observer changes resource", async () => {
  // Given
  const write = jest.fn<Promise<string>, [string]>().mockResolvedValue("saved");
  const hook = await renderHook(
    ({ resource }: { resource: string }) =>
      useCommand(
        { mutationKey: [...groupKey, resource], mutationFn: write },
        {
          groupKey: [...groupKey, resource],
          requiresRead: isUncertainMutationFailure,
        },
      ),
    { wrapper: Wrapper, initialProps: { resource: "original" } },
  );
  const heldStart = hook.result.current.start;

  // When
  await hook.rerender({ resource: "replacement" });
  const result = heldStart("original values");

  // Then
  expect(result).toBeUndefined();
  expect(write).not.toHaveBeenCalled();
});

it("keeps recovery when fresh data fails the owning revision acceptance rule", async () => {
  // Given
  const hook = await renderHook(
    () =>
      useCommand(
        {
          mutationKey: [...groupKey, "save"],
          mutationFn: async () => {
            throw new ApiError("timeout");
          },
        },
        { groupKey, requiresRead: isUncertainMutationFailure },
      ),
    { wrapper: Wrapper },
  );
  await act(async () => {
    await hook.result.current.start()?.catch(() => {});
  });
  await waitFor(() => expect(hook.result.current.needsRead).toBe(true));

  // When
  let accepted = true;
  await act(async () => {
    const result = await hook.result.current.reconcile(
      [queryKey],
      () => client.query({ queryKey, queryFn: async () => ({ revision: 2 }) }),
      (current) => current.revision >= 3,
    );
    accepted = result.reconciled;
  });

  // Then
  expect(accepted).toBe(false);
  expect(hook.result.current.needsRead).toBe(true);
  expect(hook.result.current.start()).toBeUndefined();
});
