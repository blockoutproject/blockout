import {
  getDivision,
  getPoolPresentation,
  getTeamLogo,
  setPoolPresentation,
} from "../../../../.generated/mobile";
import type {
  DivisionResponse,
  PoolPresentationResponse,
} from "../../../../.generated/schemas/index.zod";

const poolId = "00000000-0000-4000-8000-000000000001";
const division: DivisionResponse = {
  id: "00000000-0000-4000-8000-000000000002",
  revision: "0",
  name: "Synthetic division",
  color: "#112233",
  gradient: null,
  logo: { effectiveUrl: null, manualUrl: null, automaticUrl: null },
  active: true,
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

/** Supplies only the required synthetic presentation; optional short-name presence stays visible. */
function poolPresentation(): PoolPresentationResponse {
  return {
    id: poolId,
    revision: "revision-1",
    names: {
      sourceName: "Synthetic pool",
      effectiveName: "Synthetic pool",
      manualName: null,
    },
  };
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalApiUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  }
});

it.each([
  ["explicit null", null],
  ["three colors", ["#112233", "#aAbBcC", "#778899"]],
])("preserves a division gradient with %s", async (_scenario, gradient) => {
  // Given
  const body = { ...division, gradient };
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
    }),
  );

  // When
  const result = await getDivision(division.id);

  // Then
  expect(result).toStrictEqual(body);
});

it.each([
  ["invalid color", { color: "blue" }],
  ["null color", { color: null }],
  ["omitted gradient", { gradient: undefined }],
  ["short gradient", { gradient: ["#112233", "#445566"] }],
  ["long gradient", { gradient: ["#112233", "#445566", "#778899", "#AABBCC"] }],
  ["null gradient color", { gradient: ["#112233", null, "#778899"] }],
  ["invalid gradient color", { gradient: ["#112233", "blue", "#778899"] }],
])("rejects a division response with %s", async (_scenario, invalid) => {
  // Given
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ ...division, ...invalid }), {
      headers: { "Content-Type": "application/json" },
    }),
  );

  // When
  const request = getDivision(division.id);

  // Then
  await expect(request).rejects.toMatchObject({ kind: "schema" });
});

it.each([
  ["omitted", {}],
  ["explicit null", { manualShortName: null }],
  ["supplied", { manualShortName: "Pool A" }],
])(
  "preserves %s short-name presence in a generated response",
  async (_scenario, shortName) => {
    // Given
    const body = poolPresentation();
    const names = { ...body.names, ...shortName };
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ...body, names }), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    // When
    const result = await getPoolPresentation(poolId);

    // Then
    expect(result.names).toStrictEqual(names);
  },
);

it.each([
  ["explicit null", { manualName: null, manualShortName: null }],
  [
    "supplied values",
    { manualName: "Synthetic pool", manualShortName: "Pool A" },
  ],
])(
  "retains %s in the generated replacement request",
  async (_scenario, names) => {
    // Given
    const change = {
      revision: "revision-1",
      ...names,
    };
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(poolPresentation()), {
        headers: { "Content-Type": "application/json" },
      }),
    );

    // When
    await setPoolPresentation(poolId, change);

    // Then
    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.example.invalid/administration/pools/${poolId}/presentation`,
      expect.objectContaining({ method: "PUT", body: JSON.stringify(change) }),
    );
  },
);

it("rejects an omitted required nullable name in a generated response", async () => {
  // Given
  const body = poolPresentation();
  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        ...body,
        names: {
          sourceName: body.names.sourceName,
          effectiveName: body.names.effectiveName,
        },
      }),
      { headers: { "Content-Type": "application/json" } },
    ),
  );

  // When
  const request = getPoolPresentation(poolId);

  // Then
  await expect(request).rejects.toMatchObject({ kind: "schema" });
});

it("selects automatic team artwork independently through the generated binary client", async () => {
  // Given
  const teamId = "00000000-0000-4000-8000-000000000193";
  mockFetch.mockResolvedValue(
    new Response("synthetic-image", {
      headers: { "Content-Type": "image/png" },
    }),
  );

  // When
  const image = await getTeamLogo(teamId, { selection: "automatic" });

  // Then
  expect(String(mockFetch.mock.calls[0][0])).toBe(
    `https://api.example.invalid/teams/${teamId}/logo?selection=automatic`,
  );
  expect(image).toBeInstanceOf(Blob);
  expect(await image.text()).toBe("synthetic-image");
});
