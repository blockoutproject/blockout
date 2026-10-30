import { listOwnStreamContributions } from "../../../../.generated/mobile";
import { createQueryClient } from "../../../shared/query/query-client";
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

it("separates original account, match, version and exact filters in generated private keys", () => {
  // Given
  const actor = { subject: "auth0|a", accountId };
  const filters = {
    query: "Club %_",
    platform: "youtube",
    state: "to-review",
  } as const;

  // When
  const key = contributionKeys.moderation(actor, filters);

  // Then
  expect(key).not.toEqual(
    contributionKeys.moderation({ ...actor, accountId: "B" }, filters),
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
  const actor = { subject: "auth0|a", accountId };
  const pages: number[] = [];
  const key = contributionKeys.own(actor, matchId);
  mockFetch.mockImplementation(async (_url) => {
    pages.push(Number(new URL(String(_url)).searchParams.get("page")));
    return new Response(
      JSON.stringify({
        revision: "opaque:first",
        proposalCount: 0,
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
