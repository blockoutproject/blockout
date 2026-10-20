import { isCancelledError } from "@tanstack/react-query";
import {
  eraseAccount,
  getAccount,
  getAccountPhoto,
  getGetApplicationAccessQueryKey,
  getGetAccountQueryKey,
  getGetAccountQueryOptions,
} from "../../../../.generated/mobile";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import { createSessionGeneration } from "../../../features/accounts/session/session-generation";
import { applicationAccessResponse } from "../../api/test-support/application-access";
import {
  bindSessionQueries,
  createQueryClient,
  getSessionQueryKey,
} from "../query-client";

const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
const account: AccountResponse = {
  accountId: "00000000-0000-4000-8000-000000000001",
  username: "Alice",
  email: "alice@example.invalid",
  principalCreatedAt: null,
  hasPhoto: false,
  permissions: {},
};
let client: ReturnType<typeof createQueryClient>;
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));

beforeEach(() => {
  jest.useFakeTimers();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
  client = createQueryClient();
});

afterEach(async () => {
  client.clear();
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
  jest.restoreAllMocks();
  if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
});

it.each(["B", "A"] as const)(
  "removes old private queries across A → guest → %s despite late network completion",
  async (nextAccount) => {
    // Given: real F05 owner, Query and generated consumer; only HTTP is controlled.
    const session = createSessionGeneration();
    session.setAccount(session.getSnapshot().generation, "A");
    const captured = { ...session.getSnapshot(), isCurrent: session.isCurrent };
    const unsubscribe = bindSessionQueries(
      client,
      session.subscribe,
      session.isCurrent,
    );
    const publicKey = getGetApplicationAccessQueryKey();
    const privateKey = getGetAccountQueryKey(account.accountId);
    const oldKey = getSessionQueryKey(captured.generation, privateKey);
    client.setQueryData(publicKey, applicationAccessResponse());
    client.setQueryData(oldKey, account);
    const response = Promise.withResolvers<Response>();
    mockFetch.mockReturnValueOnce(response.promise);
    const pending = client
      .fetchQuery(
        getGetAccountQueryOptions(account.accountId, {
          query: { queryKey: oldKey },
          request: { session: captured },
        }),
      )
      .catch((error: unknown) => error);

    // When
    session.invalidate();
    session.setAccount(session.getSnapshot().generation, nextAccount);
    const currentKey = getSessionQueryKey(
      session.getSnapshot().generation,
      privateKey,
    );
    const currentData = { ...account, username: "Current" };
    client.setQueryData(currentKey, currentData);
    response.resolve(
      new Response(JSON.stringify({ ...account, username: "Obsolete" }), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    // Then
    expect(isCancelledError(await pending)).toBe(true);
    expect(mockFetch.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(client.getQueryState(oldKey)).toBeUndefined();
    expect(client.getQueryData(currentKey)).toEqual(currentData);
    expect(client.getQueryData(publicKey)).toEqual(applicationAccessResponse());
    expect(mockFetch).toHaveBeenCalledTimes(1);
    unsubscribe();
  },
);

it.each(["JSON", "binary", "empty mutation", "HTTP failure"] as const)(
  "rejects a late %s result even when the caller supplied no cancellation signal",
  async (kind) => {
    // Given
    const owner = createSessionGeneration();
    const session = { ...owner.getSnapshot(), isCurrent: owner.isCurrent };
    const response = Promise.withResolvers<Response>();
    mockFetch.mockReturnValueOnce(response.promise);
    const pending =
      kind === "binary"
        ? getAccountPhoto("account-a", { session })
        : kind === "empty mutation"
          ? eraseAccount("account-a", { session })
          : getAccount(account.accountId, { session });
    const result = pending.catch((error: unknown) => error);

    // When
    owner.invalidate();
    response.resolve(
      kind === "empty mutation"
        ? new Response(null, { status: 204 })
        : kind === "HTTP failure"
          ? new Response(null, { status: 403 })
          : kind === "binary"
            ? new Response("photo", {
                headers: { "Content-Type": "image/png" },
              })
            : new Response(JSON.stringify(account), {
                headers: { "Content-Type": "application/json" },
              }),
    );

    // Then
    expect(await result).toMatchObject({ kind: "cancelled" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  },
);

it("rejects a request prepared by an old session before sending it", async () => {
  // Given
  const owner = createSessionGeneration();
  const session = { ...owner.getSnapshot(), isCurrent: owner.isCurrent };
  owner.invalidate();
  mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

  // When
  const result = eraseAccount("account-a", { session });

  // Then
  await expect(result).rejects.toMatchObject({ kind: "cancelled" });
  expect(mockFetch).not.toHaveBeenCalled();
});

it.each([false, true])(
  "checks the session after reading the body (session changed: %s)",
  async (changed) => {
    // Given
    const owner = createSessionGeneration();
    const session = { ...owner.getSnapshot(), isCurrent: owner.isCurrent };
    const body = Promise.withResolvers<AccountResponse>();
    const reading = Promise.withResolvers<void>();
    const response = new Response(null, {
      headers: { "Content-Type": "application/json" },
    });
    jest.spyOn(response, "json").mockImplementation(() => {
      reading.resolve();
      return body.promise;
    });
    mockFetch.mockResolvedValue(response);
    const pending = getAccount(account.accountId, { session });
    const result = pending.catch((error: unknown) => error);
    await reading.promise;

    // When
    if (changed) owner.invalidate();
    body.resolve(account);

    // Then
    if (changed) expect(await result).toMatchObject({ kind: "cancelled" });
    else expect(await result).toEqual(account);
    expect(mockFetch.mock.calls[0][1]).not.toHaveProperty("session");
  },
);
