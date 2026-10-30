import { listOwnStreamContributions } from "../../../../.generated/mobile";
import { createQueryClient } from "../../../shared/query/query-client";
import { contributionKeys } from "../api/contribution-keys";

const accountId = "00000000-0000-4000-8000-000000000001";
const matchId = "00000000-0000-4000-8000-000000000002";
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
