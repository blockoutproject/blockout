import { QueryClient } from "@tanstack/react-query";
import { createCollectionQueries } from "../api/collection-queries";
import {
  activateCollectionSeason,
  getCollectionControl,
  getCollectionSource,
  listCollectionResults,
} from "../../../../.generated/mobile";
import type {
  CollectionControlResponse,
  CollectionResultResponse,
  CollectionSeasonResponse,
  SourceBindingResponse,
  SourceCatalogueResponse,
} from "../../../../.generated/schemas/index.zod";

const control: CollectionControlResponse = {
  id: "00000000-0000-4000-8000-000000000001",
  family: "club-sheets",

  enabled: false,
  pendingRequestId: null,
  lastAttemptAt: null,
  lastSuccessAt: null,
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
  if (originalApiUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  }
});

it("accepts explicit nullable evidence and additive fields through the generated client", async () => {
  // Given
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ ...control, future: true }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    }),
  );

  // When
  const result = await getCollectionControl(control.id);

  // Then
  expect(result).toEqual(control);
  expect(result).not.toHaveProperty("cycle");
  expect(result).not.toHaveProperty("seasonId");
});

it("reads legacy result pages and preserves new search criteria and evidence", async () => {
  // Given
  const controlId = "00000000-0000-4000-8000-000000000004";
  const row: CollectionResultResponse = {
    scopeId: "00000000-0000-4000-8000-000000000002",
    scopeLabel: "D1 masculine · Saison régulière",
    stage: "calendar",
    phase: "acquisition",
    outcome: "failed",
    observedAt: "2026-10-24T12:00:00Z",
    lastSuccessAt: null,
    reasonType: "urn:blockout:acquisition:technical",
  };
  const legacy = { items: [row], page: 0, hasNext: true };
  const source = {
    id: "00000000-0000-4000-8000-000000000003",
    label: "D1 masculine",
    phaseReference: "42",
  };
  const filtered = {
    items: [{ ...row, source }],
    page: 0,
    hasNext: false,
    summary: { success: 12, partial: 2, failed: 1, unconfirmed: 0 },
  };
  mockFetch
    .mockResolvedValueOnce(Response.json(legacy))
    .mockResolvedValueOnce(Response.json(filtered));

  // When
  const previousPage = await listCollectionResults(controlId, { size: 1 });
  const filteredPage = await listCollectionResults(controlId, {
    size: 1,
    query: "régulière calendrier",
    status: "failed",
    sourceId: source.id,
    stage: "calendar",
  });

  // Then
  expect(previousPage).toEqual(legacy);
  expect(filteredPage).toEqual(filtered);
  const request = new URL(String(mockFetch.mock.calls[1][0]));
  expect(Object.fromEntries(request.searchParams)).toEqual({
    size: "1",
    query: "régulière calendrier",
    status: "failed",
    sourceId: source.id,
    stage: "calendar",
  });
});

it("reads an empty source and a retained catalogue with pools grouped by pack", async () => {
  // Given
  const empty: SourceCatalogueResponse = {
    id: "00000000-0000-4000-8000-000000000005",
    seasonId: "00000000-0000-4000-8000-000000000006",
    provider: "ffvb",
    organizerReference: "ABCCS",
    label: "Championnats nationaux",
    candidateUrl: null,
    acceptedUrl: "https://provider.example.invalid/official",
    locked: true,
    validation: "qualified",
    validatedAt: "2026-10-16T11:48:00Z",
    seasonEvidence: "2026/2027",
    reason: null,
    launched: false,
    packs: [],
    phases: [],
  };
  const source: SourceCatalogueResponse = {
    ...empty,
    catalog: {
      status: "unavailable",
      observedAt: "2026-10-17T12:00:00Z",
      lastCompleteAt: "2026-10-16T11:48:00Z",
      reason: "The source responded with HTTP 503.",
    },
    packs: [
      {
        id: "00000000-0000-4000-8000-000000000007",
        label: "Nationale 2",
        pools: [
          { id: "00000000-0000-4000-8000-000000000008", label: "Poule A" },
        ],
      },
    ],
  };
  mockFetch
    .mockResolvedValueOnce(Response.json(empty))
    .mockResolvedValueOnce(Response.json(source));

  // When
  const emptyResponse = await getCollectionSource(empty.id);
  const currentResponse = await getCollectionSource(source.id);

  // Then
  expect(emptyResponse).toEqual(empty);
  expect(currentResponse).toEqual(source);
});

it("rejects a mixed-provider source list before admitting any rows to Query", async () => {
  // Given
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const known: SourceBindingResponse = {
    id: "00000000-0000-4000-8000-000000000005",
    seasonId: "00000000-0000-4000-8000-000000000006",
    provider: "ffvb",
    organizerReference: "ABCCS",
    label: "Championnats nationaux",
    candidateUrl: null,
    acceptedUrl: "https://provider.example.invalid/official",
    locked: true,
    validation: "qualified",
    validatedAt: null,
    seasonEvidence: "2026/2027",
    reason: null,
    launched: false,
  };
  const unknown = {
    ...known,
    id: "00000000-0000-4000-8000-000000000009",
    provider: "unknown-provider",
    organizerReference: "future",
    label: "Future source",
  };
  const options = createCollectionQueries({
    enabled: true,
    request: async () => ({}),
  }).sources(known.seasonId);
  mockFetch
    .mockResolvedValueOnce(Response.json({ items: [known, unknown] }))
    .mockResolvedValueOnce(Response.json({ items: [known] }));

  try {
    // When
    const mixedRead = client.fetchQuery(options);

    // Then
    await expect(mixedRead).rejects.toMatchObject({ kind: "schema" });
    expect(client.getQueryData(options.queryKey)).toBeUndefined();

    // When
    const supportedRead = await client.fetchQuery(options);

    // Then
    expect(supportedRead).toEqual({ items: [known] });
    expect(client.getQueryData(options.queryKey)).toEqual({ items: [known] });
  } finally {
    client.clear();
  }
});

it("activates the confirmed season through a bodyless command", async () => {
  // Given
  const season: CollectionSeasonResponse = {
    id: "00000000-0000-4000-8000-000000000006",
    label: "2026/2027",
    startYear: 2026,
    state: "active",
  };
  mockFetch.mockResolvedValue(Response.json(season));

  // When
  const activated = await activateCollectionSeason(season.id);

  // Then
  expect(activated).toEqual(season);
  const [url, options] = mockFetch.mock.calls[0];
  expect(new URL(String(url)).pathname).toBe(
    `/administration/collection-seasons/${season.id}/activation`,
  );
  expect(options?.method).toBe("POST");
  expect(options?.body).toBeUndefined();
});

it.each([
  ["an unknown family", { family: "unknown" }],
  ["an omitted required nullable timestamp", { lastSuccessAt: undefined }],
  ["a null optional season", { seasonId: null }],
  ["an invalid known timestamp", { lastAttemptAt: "not-a-date" }],
  ["an impossible calendar date", { lastAttemptAt: "2026-02-31T12:00:00Z" }],
])(
  "rejects %s before accepting collection state",
  async (_scenario, invalid) => {
    // Given
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ...control, ...invalid }), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    // When
    const request = getCollectionControl(control.id);

    // Then
    await expect(request).rejects.toMatchObject({ kind: "schema" });
  },
);

it.each([403, 404])(
  "shows the current technical error after a %i withdrawal without restoring the season",
  async (status) => {
    // Given
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const season: CollectionSeasonResponse = {
      id: control.id,
      label: "2026/2027",
      startYear: 2026,

      state: "active",
    };
    const options = createCollectionQueries({
      enabled: true,
      request: async () => ({}),
    }).season(season.id);
    client.setQueryData(options.queryKey, season);
    mockFetch.mockResolvedValue(
      Response.json({ status, title: "Refused" }, { status }),
    );

    try {
      // When
      await expect(client.fetchQuery(options)).rejects.toMatchObject({
        status,
      });

      // Then
      expect(client.getQueryData(options.queryKey)).toBeUndefined();

      // When
      mockFetch.mockResolvedValue(
        Response.json({ status: 503, title: "Unavailable" }, { status: 503 }),
      );
      await expect(client.fetchQuery(options)).rejects.toMatchObject({
        status: 503,
      });

      // Then
      expect(client.getQueryState(options.queryKey)?.error).toMatchObject({
        status: 503,
      });
      expect(client.getQueryData(options.queryKey)).toBeUndefined();
    } finally {
      client.clear();
    }
  },
);
