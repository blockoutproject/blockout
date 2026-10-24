import { isCancelledError } from "@tanstack/react-query";
import {
  createStreamReport,
  getOwnStreamReport,
  getGetMatchQueryKey,
  listOwnStreamContributions,
} from "../../../../.generated/mobile";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import {
  bindSessionQueries,
  createQueryClient,
} from "../../../shared/query/query-client";
import { contributionKeys } from "../api/contribution-keys";

const accountId = "00000000-0000-4000-8000-000000000001";
const matchId = "00000000-0000-4000-8000-000000000002";
const versionId = "00000000-0000-4000-8000-000000000003";
const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));
let client: ReturnType<typeof createQueryClient>;

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
  if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
});

it("separates account, session, match, version and exact filters in private keys", () => {
  // Given
  const actor = { generation: "session-a", accountId };
  const filters = {
    query: "Club %_",
    platform: "youtube",
    state: "to-review",
  } as const;

  // When
  const key = contributionKeys.moderation(actor, filters);

  // Then
  expect(key.slice(0, 2)).toEqual(["session", actor.generation]);
  expect(key).not.toEqual(
    contributionKeys.moderation({ ...actor, accountId: "B" }, filters),
  );
  expect(key).not.toEqual(
    contributionKeys.moderation({ ...actor, generation: "new" }, filters),
  );
  for (const changed of [
    { query: "other" },
    { seasonId: matchId },
    { platform: "twitch" },
    { state: "all" },
  ] as const) {
    expect(key).not.toEqual(
      contributionKeys.moderation(actor, { ...filters, ...changed }),
    );
  }
  expect(contributionKeys.own(actor, matchId)).not.toEqual(
    contributionKeys.own(actor, "other"),
  );
  expect(contributionKeys.ownVersion(actor, matchId, versionId)).not.toEqual(
    contributionKeys.ownVersion(actor, matchId, "other"),
  );
  expect(
    contributionKeys.versions(actor, matchId, { state: "historical" }),
  ).not.toEqual(
    contributionKeys.versions(actor, matchId, { state: "pending" }),
  );
  expect(contributionKeys.reports(actor, matchId, versionId)).not.toEqual(
    contributionKeys.reports(actor, "other", versionId),
  );
  expect(contributionKeys.ownReport(actor, versionId)).not.toEqual(
    contributionKeys.ownReport(actor, "other"),
  );
  expect(contributionKeys.moderate(actor, matchId, versionId)).not.toEqual(
    contributionKeys.moderate(actor, matchId, "other"),
  );
  expect(contributionKeys.submit(actor, matchId)).not.toEqual(
    contributionKeys.publish(actor, matchId),
  );
  expect(contributionKeys.updateOwn(actor, matchId, versionId)).not.toEqual(
    contributionKeys.reactivate(actor, matchId, versionId),
  );
  expect(contributionKeys.report(actor, versionId)).not.toEqual(
    contributionKeys.ownReport(actor, versionId),
  );
});

it("uses the infinite query page parameter without splitting the traversal key", async () => {
  // Given
  const actor = { generation: "a", accountId };
  const pages: number[] = [];
  const key = contributionKeys.own(actor, matchId);
  mockFetch.mockImplementation(async (_url) => {
    pages.push(Number(new URL(String(_url)).searchParams.get("page")));
    return new Response(
      JSON.stringify({
        revision: "opaque:first",
        eligibility: { canSubmit: false, requiresApproval: true },
        quota: {
          versionsUsed: 3,
          dailyMatchesUsed: 3,
          matchCountedToday: true,
          dayEndsAt: "2026-10-25T22:00:00Z",
        },
        items: [],
        ...(pages.length === 1 ? { nextPage: 1 } : {}),
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  });

  // When
  const result = await client.fetchInfiniteQuery({
    queryKey: key,
    initialPageParam: 0,
    pages: 2,
    queryFn: ({ pageParam }) =>
      listOwnStreamContributions(accountId, matchId, { page: pageParam }),
    getNextPageParam: (page) => page.nextPage,
  });

  // Then
  expect(result.pageParams).toEqual([0, 1]);
  expect(pages).toEqual([0, 1]);
  expect(client.getQueryCache().getAll()).toHaveLength(1);
});

it.each(["B", accountId])(
  "rejects late callbacks through A → guest → %s without relying on cancellation",
  async (nextAccount) => {
    // Given: the real F05 session, F13 transport and Query; HTTP ignores cancellation.
    const owner = createSessionGeneration();
    owner.setAccount(owner.getSnapshot().generation, accountId);
    const captured = {
      ...owner.getSnapshot(),
      accountId,
      isCurrent: owner.isCurrent,
    };
    const unsubscribe = bindSessionQueries(
      client,
      owner.subscribe,
      owner.isCurrent,
    );
    const key = contributionKeys.ownReport(captured, versionId);
    const publicKey = getGetMatchQueryKey(matchId);
    client.setQueryData(publicKey, "public");
    const read = Promise.withResolvers<Response>();
    const write = Promise.withResolvers<Response>();
    mockFetch
      .mockReturnValueOnce(read.promise)
      .mockReturnValueOnce(write.promise);
    const pendingRead = client
      .fetchQuery({
        queryKey: key,
        queryFn: () =>
          getOwnStreamReport(accountId, versionId, { session: captured }),
      })
      .catch((error: unknown) => error);
    const success = jest.fn();
    const pendingWrite = createStreamReport(
      accountId,
      versionId,
      { reason: "Synthetic reason" },
      { session: captured },
    )
      .then(success)
      .catch((error: unknown) => error);

    // When
    owner.invalidate();
    owner.setAccount(owner.getSnapshot().generation, nextAccount);
    const current = { ...owner.getSnapshot(), accountId: nextAccount };
    const currentKey = contributionKeys.ownReport(current, versionId);
    client.setQueryData(currentKey, { reported: false });
    read.resolve(
      new Response('{"reported":true}', {
        headers: { "Content-Type": "application/json" },
      }),
    );
    write.resolve(
      new Response('{"reported":true}', {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    // Then
    expect(isCancelledError(await pendingRead)).toBe(true);
    expect(await pendingWrite).toMatchObject({ kind: "cancelled" });
    expect(success).not.toHaveBeenCalled();
    expect(client.getQueryState(key)).toBeUndefined();
    expect(client.getQueryData(currentKey)).toEqual({ reported: false });
    expect(client.getQueryData(publicKey)).toBe("public");
    expect(mockFetch).toHaveBeenCalledTimes(2);
    unsubscribe();
  },
);

it("refuses a command captured before a same-account return before sending it", async () => {
  // Given
  const owner = createSessionGeneration();
  owner.setAccount(owner.getSnapshot().generation, accountId);
  const captured = { ...owner.getSnapshot(), isCurrent: owner.isCurrent };
  owner.invalidate();
  owner.setAccount(owner.getSnapshot().generation, accountId);

  // When
  const result = createStreamReport(
    accountId,
    versionId,
    { reason: "Synthetic" },
    { session: captured },
  );

  // Then
  await expect(result).rejects.toMatchObject({ kind: "cancelled" });
  expect(mockFetch).not.toHaveBeenCalled();
});
