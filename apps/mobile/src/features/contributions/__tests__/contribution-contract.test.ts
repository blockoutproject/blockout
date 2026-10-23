import {
  getModeratedStreamContribution,
  getMatch,
  listModeratedStreamContributions,
  listOwnStreamContributions,
  listStreamReports,
} from "../../../../.generated/mobile";
import {
  AccountPermissionsResponse,
  CreateModeratedStreamContributionRequest,
  CreateStreamContributionRequest,
  CreateStreamReactivationRequest,
  CreateStreamReportRequest,
  ListOwnStreamContributionsParams,
  ListModeratedStreamContributions200,
  ModeratedStreamContributionsResponse,
  StreamContributionStateEnum,
  StreamDecisionEnum,
  StreamModerationActionEnum,
  StreamModerationFilterEnum,
  StreamOwnerActionEnum,
  StreamPlatformEnum,
  StreamVersionFilterEnum,
  UpdateModeratedStreamContributionRequest,
  UpdateOwnStreamContributionRequest,
} from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";

const id = "00000000-0000-4000-8000-000000000001";
const instant = "2026-10-24T12:00:00Z";
const version = {
  id,
  url: "https://youtube.com/watch?v=synthetic#part",
  platform: "youtube",
  state: "hidden",
  submittedAt: instant,
  reportCount: Number.MAX_SAFE_INTEGER,
  canApprove: false,
  canReject: false,
  canWithdraw: false,
  canReactivate: true,
  decisions: [{ kind: "hide", at: instant }],
} as const;
const match = {
  id,
  seasonId: id,
  home: { id, name: "Home" },
  away: { id, name: "Away" },
  pool: {
    pool: { id, name: "Pool" },
    season: { id, label: "2026/27", startYear: 2026 },
    classification: {},
  },
  publiclyViewable: false,
};
const moderation = {
  revision: "opaque:α/not-a-counter",
  match,
  counts: {
    active: 0,
    pending: Number.MAX_SAFE_INTEGER,
    hidden: 1,
    reports: Number.MAX_SAFE_INTEGER,
    rejected: Number.MAX_SAFE_INTEGER,
  },
  approvalRequiredAfterReports: true,
  canPublish: false,
  items: [version],
};
const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
  if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
});

it.each([
  ["platform", StreamPlatformEnum],
  ["state", StreamContributionStateEnum],
  ["moderation filter", StreamModerationFilterEnum],
  ["version filter", StreamVersionFilterEnum],
  ["owner action", StreamOwnerActionEnum],
  ["moderation action", StreamModerationActionEnum],
  ["decision", StreamDecisionEnum],
])("keeps the %s vocabulary finite", (_name, schema) => {
  // Given
  const invalid = "future-value";

  // When
  const result = schema.safeParse(invalid);

  // Then
  expect(result.success).toBe(false);
  for (const value of schema.options) expect(schema.parse(value)).toBe(value);
});

it.each([
  [
    CreateStreamContributionRequest,
    { revision: "opaque:a", url: "https://twitch.tv/synthetic" },
  ],
  [
    UpdateOwnStreamContributionRequest,
    { revision: "opaque:a", action: "cancel" },
  ],
  [
    CreateModeratedStreamContributionRequest,
    {
      actorAccountId: id,
      revision: "opaque:a",
      url: "https://fb.watch/synthetic",
    },
  ],
  [
    UpdateModeratedStreamContributionRequest,
    { actorAccountId: id, revision: "opaque:a", action: "approve" },
  ],
  [
    CreateStreamReactivationRequest,
    { actorAccountId: id, revision: "opaque:a" },
  ],
  [CreateStreamReportRequest, { reason: "Synthetic reason" }],
])(
  "validates required command fields with the generated mobile schema",
  (schema, body) => {
    // Given
    const valid = body;

    // When
    // Then: MVC proves strict rejection; Orval request schemas check known field shapes.
    expect(schema.safeParse(valid).success).toBe(true);
    for (const field of Object.keys(body)) {
      expect(schema.safeParse({ ...body, [field]: null }).success).toBe(false);
      expect(schema.safeParse({ ...body, [field]: undefined }).success).toBe(
        false,
      );
    }
    if ("revision" in body)
      expect(schema.safeParse({ ...body, revision: "" }).success).toBe(false);
  },
);

it("admits erased attribution and hidden dateless private sporting context through the generated client", async () => {
  // Given
  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        ...moderation,
        future: true,
        match: { ...match, future: true },
      }),
      { headers: { "Content-Type": "application/json" } },
    ),
  );

  // When
  const result = await listModeratedStreamContributions(id);

  // Then
  expect(result).toEqual(moderation);
  expect(result.match).not.toHaveProperty("schedule");
  expect(result.match).not.toHaveProperty("result");
  expect(result.items[0]).not.toHaveProperty("authorName");
  expect(result.items[0].decisions[0]).not.toHaveProperty("actorName");
});

it("validates a JSON body once before Query accepts it", async () => {
  // Given
  const response = new Response(JSON.stringify(moderation), {
    headers: { "Content-Type": "application/json" },
  });
  const readJson = jest.spyOn(response, "json");
  const validate = jest.spyOn(ListModeratedStreamContributions200, "parse");
  mockFetch.mockResolvedValue(response);
  const client = createQueryClient();

  // When
  const result = await client.fetchQuery({
    queryKey: ["contract"],
    queryFn: () => listModeratedStreamContributions(id),
  });

  // Then
  expect(result.revision).toBe(moderation.revision);
  expect(readJson).toHaveBeenCalledTimes(1);
  expect(validate).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  client.clear();
});

it.each([
  ["required revision absent", { revision: undefined }],
  ["revision null", { revision: null }],
  ["empty revision", { revision: "" }],
  ["numeric revision", { revision: 1 }],
  ["required items absent", { items: undefined }],
  ["optional active version null", { activeContribution: null }],
  ["unknown platform", { items: [{ ...version, platform: "unknown" }] }],
  ["unknown state", { items: [{ ...version, state: "unknown" }] }],
  [
    "unknown decision",
    { items: [{ ...version, decisions: [{ kind: "unknown", at: instant }] }] },
  ],
  ["null erased author", { items: [{ ...version, authorName: null }] }],
  [
    "null erased actor",
    {
      items: [
        {
          ...version,
          decisions: [{ kind: "hide", at: instant, actorName: null }],
        },
      ],
    },
  ],
  [
    "unsafe reports",
    { counts: { ...moderation.counts, reports: Number.MAX_SAFE_INTEGER + 1 } },
  ],
  ["fractional reports", { counts: { ...moderation.counts, reports: 0.5 } }],
  ["negative reports", { counts: { ...moderation.counts, reports: -1 } }],
  ["overflow page", { nextPage: 107374183 }],
  ["null page", { nextPage: null }],
  ["zero continuation", { nextPage: 0 }],
  ["oversized page", { items: Array.from({ length: 21 }, () => version) }],
  ["null private schedule", { match: { ...match, schedule: null } }],
  ["null private result", { match: { ...match, result: null } }],
])(
  "rejects %s before admitting private data into Query",
  async (_name, invalid) => {
    // Given
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ...moderation, ...invalid }), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = createQueryClient();
    const key = ["invalid-contract"];

    // When
    const result = client.fetchQuery({
      queryKey: key,
      queryFn: () => listModeratedStreamContributions(id),
    });

    // Then
    await expect(result).rejects.toMatchObject({ kind: "schema" });
    expect(client.getQueryData(key)).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    client.clear();
  },
);

it("accepts twenty items, the maximum page and a full JavaScript-safe report count", async () => {
  // Given
  const report = { id, reportedAt: instant, reason: null };
  const body = {
    count: Number.MAX_SAFE_INTEGER,
    items: Array.from({ length: 20 }, () => report),
    nextPage: 107374182,
  };
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
    }),
  );

  // When
  const result = await listStreamReports(id, id, { page: 107374182 });

  // Then
  expect(result).toEqual(body);
  expect(String(mockFetch.mock.calls[0][0])).toContain("page=107374182");
  expect(ListOwnStreamContributionsParams.parse({ page: 107374182 }).page).toBe(
    107374182,
  );
  for (const page of [-1, 107374183, 0.5, null])
    expect(ListOwnStreamContributionsParams.safeParse({ page }).success).toBe(
      false,
    );
});

it.each([undefined, 42])(
  "rejects an erased report reason represented as %s",
  async (reason) => {
    // Given
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          count: 1,
          items: [{ id, reportedAt: instant, reason }],
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );

    // When
    const result = listStreamReports(id, id);

    // Then
    await expect(result).rejects.toMatchObject({ kind: "schema" });
  },
);

it("accepts optional genuine schedule/result without deriving public viewability", () => {
  // Given
  const body = {
    ...moderation,
    match: {
      ...match,
      schedule: {
        localDate: "2026-10-24",
        timeZone: "Europe/Paris",
        observedAt: instant,
      },
      result: { state: "final", specialLabel: "Forfeit", observedAt: instant },
    },
  };

  // When
  const result = ModeratedStreamContributionsResponse.parse(body);

  // Then
  expect(result.match.publiclyViewable).toBe(false);
  expect(result.match.schedule).not.toHaveProperty("instant");
  expect(result.match.result?.state).toBe("final");
});

it.each([
  {},
  { moderateStreamLinks: false },
  { moderateStreamLinks: true, future: true },
])(
  "grants moderation only through literal true in the additive account projection",
  (permissions) => {
    // Given
    // When
    const result = AccountPermissionsResponse.parse(permissions);

    // Then
    expect(result.moderateStreamLinks === true).toBe(
      permissions.moderateStreamLinks === true,
    );
    expect(result.bypassMaintenance).toBeUndefined();
    for (const invalid of [null, "true", 1])
      expect(
        AccountPermissionsResponse.safeParse({ moderateStreamLinks: invalid })
          .success,
      ).toBe(false);
  },
);

it("keeps a shared conflict as an HTTP error instead of successful contribution data", async () => {
  // Given
  mockFetch.mockResolvedValue(
    new Response(
      '{"type":"urn:blockout:problem:stale-revision","title":"Conflict","status":409}',
      { status: 409, headers: { "Content-Type": "application/problem+json" } },
    ),
  );

  // When
  const result = getModeratedStreamContribution(id, id);

  // Then
  await expect(result).rejects.toMatchObject({
    kind: "http",
    status: 409,
    problem: { type: "urn:blockout:problem:stale-revision" },
  });
});

it("preserves an opaque owner revision and nullable-independent quota context", async () => {
  // Given
  const body = {
    revision: "opaque:α/not-a-counter",
    eligibility: { canSubmit: false, requiresApproval: true },
    quota: {
      versionsUsed: 3,
      dailyMatchesUsed: 3,
      matchCountedToday: true,
      dayEndsAt: instant,
    },
    items: [],
  };
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
    }),
  );

  // When
  const result = await listOwnStreamContributions(id, id);

  // Then
  expect(result).toEqual(body);
  expect(result.eligibility).not.toHaveProperty("reason");
  expect(result.eligibility).not.toHaveProperty("eligibleAt");
});

it.each(["contributed", "professional", "absent"])(
  "accepts the public %s stream projection without private attribution",
  async (kind) => {
    // Given: link/ID pairing is the producer's business invariant, not a generated cross-field check.
    const body = {
      match: {
        id,
        pool: match.pool,
        home: match.home,
        away: match.away,
        schedule: {
          localDate: "2026-10-24",
          timeZone: "Europe/Paris",
          observedAt: instant,
        },
        category: "upcoming",
      },
      documents: [],
      ...(kind === "contributed"
        ? { streamUrl: version.url, streamContributionId: id }
        : kind === "professional"
          ? { streamUrl: "https://professional.example.invalid/watch" }
          : {}),
    };
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(body), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    // When
    const result = await getMatch(id);

    // Then
    expect(result).toEqual(body);
    expect(result).not.toHaveProperty("authorName");
    expect(result).not.toHaveProperty("reportCount");
    if (kind !== "contributed")
      expect(result).not.toHaveProperty("streamContributionId");
  },
);
