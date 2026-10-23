import { isCancelledError } from "@tanstack/react-query";
import {
  getTeamFollowState,
  getPoolFollowState,
  getGetTeamFollowStateQueryOptions,
  getReplaceTeamFollowStateMutationOptions,
} from "../../../../.generated/mobile";
import { createSessionGeneration } from "../../accounts";
import {
  bindSessionQueries,
  createQueryClient,
} from "../../../shared/query/query-client";
import {
  captureFollowingOwner,
  followStateKey,
  followMutationKey,
  followListKey,
  personalCalendarKey,
  followOptionsKey,
  followerCountKey,
  type FollowingOwner,
} from "../api/following-keys";

const a = "00000000-0000-4000-8000-000000000001";
const b = "00000000-0000-4000-8000-000000000002";
const target = { type: "team", id: b } as const;
const mockFetch = jest.fn();
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
/** Requires the scenario's established F05 capture without an unsafe non-null assertion. */
function requireOwner(owner: FollowingOwner | null): FollowingOwner {
  if (!owner) throw new Error("Scenario requires an established owner");
  return owner;
}

const originalUrl = process.env.EXPO_PUBLIC_API_URL;
let client: ReturnType<typeof createQueryClient>;
beforeEach(() => {
  jest.useFakeTimers();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  client = createQueryClient();
  mockFetch.mockReset();
});
afterEach(async () => {
  client.clear();
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

it("leaves guests and unavailable profiles without a private context", () => {
  // Given
  const session = createSessionGeneration();

  // When
  const owner = captureFollowingOwner({
    ...session.getSnapshot(),
    isCurrent: session.isCurrent,
  });

  // Then
  expect(owner).toBeNull();
  expect(mockFetch).not.toHaveBeenCalled();
});

it("detaches account and generation without consulting entitlements", () => {
  // Given
  const session = createSessionGeneration();
  session.setAccount(session.getSnapshot().generation, a);
  const input = { ...session.getSnapshot(), isCurrent: session.isCurrent };

  // When
  const owner = requireOwner(captureFollowingOwner(input));
  input.accountId = b;

  // Then
  expect(owner.accountId).toBe(a);
  expect(Object.isFrozen(owner)).toBe(true);
});

it("distinguishes target type, identity, owner and same-account sessions", () => {
  // Given
  const session = createSessionGeneration();
  session.setAccount(session.getSnapshot().generation, a);
  const owner = requireOwner(
    captureFollowingOwner({
      ...session.getSnapshot(),
      isCurrent: session.isCurrent,
    }),
  );
  const state = followStateKey(owner, target);
  const mutation = followMutationKey(owner, target);

  // When
  session.invalidate();
  session.setAccount(session.getSnapshot().generation, a);
  const returned = requireOwner(
    captureFollowingOwner({
      ...session.getSnapshot(),
      isCurrent: session.isCurrent,
    }),
  );

  // Then
  expect(state).not.toEqual(followStateKey(returned, target));
  expect(mutation).not.toEqual(followMutationKey(returned, target));
  expect(followStateKey(returned, target)).not.toEqual(
    followStateKey(returned, { type: "pool", id: b }),
  );
  expect(followMutationKey(returned, target)).not.toEqual(
    followMutationKey(returned, { type: "pool", id: b }),
  );
  expect(followMutationKey(returned, target)).not.toEqual(
    followMutationKey(returned, { type: "team", id: a }),
  );
});

it("freezes list and calendar selections with all response inputs", () => {
  // Given
  const session = createSessionGeneration();
  session.setAccount(session.getSnapshot().generation, a);
  const owner = requireOwner(
    captureFollowingOwner({
      ...session.getSnapshot(),
      isCurrent: session.isCurrent,
    }),
  );
  const input = { seasonId: a };
  const first = followListKey(owner, "team", input);
  const calendar = personalCalendarKey(owner, {
    category: "upcoming",
    timeZone: "Europe/Paris",
    seasonId: a,
  });

  // When
  input.seasonId = b;

  // Then
  expect(first).toEqual(followListKey(owner, "team", { seasonId: a }));
  expect(first).not.toEqual(followListKey(owner, "team", input));
  expect(first).not.toEqual(followListKey(owner, "pool", { seasonId: a }));
  expect(calendar).not.toEqual(
    personalCalendarKey(owner, {
      category: "completed",
      timeZone: "Europe/Paris",
      seasonId: a,
    }),
  );
  expect(calendar).not.toEqual(
    personalCalendarKey(owner, {
      category: "upcoming",
      timeZone: "America/New_York",
      seasonId: a,
    }),
  );
  expect(calendar).not.toEqual(
    personalCalendarKey(owner, {
      category: "upcoming",
      timeZone: "Europe/Paris",
      seasonId: b,
    }),
  );
  expect(first).not.toEqual(followListKey(owner, "team"));
});

it("keeps public counts account-independent and separates explicit bypass", () => {
  // Given
  const session = createSessionGeneration();
  session.setAccount(session.getSnapshot().generation, a);
  const owner = requireOwner(
    captureFollowingOwner({
      ...session.getSnapshot(),
      isCurrent: session.isCurrent,
    }),
  );
  const publicKey = followerCountKey(target);
  const bypassKey = followerCountKey(target, owner);

  // When
  session.invalidate();
  session.setAccount(session.getSnapshot().generation, b);
  const other = requireOwner(
    captureFollowingOwner({
      ...session.getSnapshot(),
      isCurrent: session.isCurrent,
    }),
  );

  // Then
  expect(publicKey).toEqual(followerCountKey(target));
  expect(publicKey).not.toEqual(bypassKey);
  expect(bypassKey).not.toEqual(followerCountKey(target, other));
  expect(followOptionsKey(other)).not.toEqual(followOptionsKey(other, true));
});

it.each(["guest", "B", "A", "B → A"] as const)(
  "rejects obsolete reads across A → %s",
  async (destination) => {
    // Given: real F05 generation, shared Query cleanup and generated F13 transport.
    const session = createSessionGeneration();
    session.setAccount(session.getSnapshot().generation, a);
    const owner = requireOwner(
      captureFollowingOwner({
        ...session.getSnapshot(),
        isCurrent: session.isCurrent,
      }),
    );
    const unsubscribe = bindSessionQueries(
      client,
      session.subscribe,
      session.isCurrent,
    );
    const oldKey = followStateKey(owner, target);
    const publicKey = followerCountKey(target);
    client.setQueryData(publicKey, { count: 7 });
    const response = Promise.withResolvers<Response>();
    mockFetch.mockReturnValue(response.promise);
    const pending = client
      .fetchQuery(
        getGetTeamFollowStateQueryOptions(owner.accountId, target.id, {
          query: { queryKey: oldKey },
          request: { session: owner },
        }),
      )
      .catch((error: unknown) => error);

    // When
    session.invalidate();
    if (destination !== "guest")
      session.setAccount(
        session.getSnapshot().generation,
        destination === "A" ? a : b,
      );
    if (destination === "B → A") {
      session.invalidate();
      session.setAccount(session.getSnapshot().generation, a);
    }
    const nextOwner = captureFollowingOwner({
      ...session.getSnapshot(),
      isCurrent: session.isCurrent,
    });
    const currentKey = nextOwner ? followStateKey(nextOwner, target) : null;
    if (currentKey) client.setQueryData(currentKey, { following: false });
    response.resolve(Response.json({ following: true }));

    // Then
    expect(isCancelledError(await pending)).toBe(true);
    expect(client.getQueryData(oldKey)).toBeUndefined();
    if (currentKey)
      expect(client.getQueryData(currentKey)).toEqual({ following: false });
    expect(client.getQueryData(publicKey)).toEqual({ count: 7 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    unsubscribe();
  },
);

it.each(["B", "A", "B → A"] as const)(
  "rejects late mutation success after A → guest → %s",
  async (destination) => {
    // Given
    const session = createSessionGeneration();
    session.setAccount(session.getSnapshot().generation, a);
    const owner = requireOwner(
      captureFollowingOwner({
        ...session.getSnapshot(),
        isCurrent: session.isCurrent,
      }),
    );
    const response = Promise.withResolvers<Response>();
    const started = Promise.withResolvers<void>();
    mockFetch.mockImplementation(() => {
      started.resolve();
      return response.promise;
    });
    const onSuccess = jest.fn();
    const mutation = client.getMutationCache().build(
      client,
      getReplaceTeamFollowStateMutationOptions({
        mutation: {
          mutationKey: followMutationKey(owner, target),
          onSuccess,
        },
        request: { session: owner },
      }),
    );
    const pending = mutation
      .execute({
        accountId: owner.accountId,
        teamId: target.id,
        data: { following: true },
      })
      .catch((error: unknown) => error);
    await started.promise;

    // When
    session.invalidate();
    session.setAccount(
      session.getSnapshot().generation,
      destination === "A" ? a : b,
    );
    if (destination === "B → A") {
      session.invalidate();
      session.setAccount(session.getSnapshot().generation, a);
    }
    response.resolve(Response.json({ following: true }));

    // Then
    expect(await pending).toMatchObject({ kind: "cancelled" });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  },
);

it("rejects erased or retired context before sending another private request", async () => {
  // Given
  const session = createSessionGeneration();
  session.setAccount(session.getSnapshot().generation, a);
  const input = { ...session.getSnapshot(), isCurrent: session.isCurrent };
  const owner = requireOwner(captureFollowingOwner(input));
  session.invalidate();

  // When
  const result = getPoolFollowState(owner.accountId, target.id, {
    session: owner,
  });

  // Then
  expect(captureFollowingOwner(input)).toBeNull();
  await expect(result).rejects.toMatchObject({ kind: "cancelled" });
  expect(mockFetch).not.toHaveBeenCalled();
});

it("preserves an established identity when profile retrieval is unavailable", async () => {
  // Given
  const session = createSessionGeneration();
  session.setAccount(session.getSnapshot().generation, a);
  const owner = requireOwner(
    captureFollowingOwner({
      ...session.getSnapshot(),
      isCurrent: session.isCurrent,
    }),
  );
  mockFetch.mockResolvedValue(new Response(null, { status: 503 }));

  // When
  const response = getTeamFollowState(owner.accountId, target.id, {
    session: owner,
  });

  // Then
  await expect(response).rejects.toMatchObject({ kind: "http", status: 503 });
  expect(session.getSnapshot().accountId).toBe(a);
});
