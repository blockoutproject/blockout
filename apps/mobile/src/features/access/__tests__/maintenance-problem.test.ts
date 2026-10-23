import { ApiError, apiFetch } from "../../../shared/api/api-fetch";
import { readMaintenanceProblem } from "../api/maintenance-problem";

const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));

/** Exercises the real generated-schema transport before the feature's semantic decision. */
async function refused(body: unknown, status = 503): Promise<unknown> {
  mockFetch.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/problem+json" },
    }),
  );
  try {
    await apiFetch("/clubs");
  } catch (error) {
    return error;
  }
  throw new Error("Expected a refusal");
}

const maintenance = {
  revision: 7,
  active: true,
  message: "Pause en cours",
  imageUrl: null,
};
const problem = {
  type: "urn:blockout:problem:maintenance",
  title: "Service Unavailable",
  status: 503,
  maintenance,
};

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://backend.example.invalid";
  mockFetch.mockReset();
});

afterAll(() => {
  if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
});

it("returns only the current maintenance restriction from a validated HTTP refusal", async () => {
  // Given
  const error = await refused({
    ...problem,
    extra: true,
    maintenance: { ...maintenance, extra: true },
  });

  // When
  const result = readMaintenanceProblem(error);

  // Then
  expect(result).toMatchObject(maintenance);
});

it.each([
  [
    "generic dependency",
    { ...problem, type: "urn:blockout:problem:unavailable" },
  ],
  ["unknown category", { ...problem, type: "urn:blockout:problem:future" }],
  ["missing maintenance", { ...problem, maintenance: undefined }],
  [
    "inactive maintenance",
    { ...problem, maintenance: { ...maintenance, active: false } },
  ],
  [
    "blank message",
    { ...problem, maintenance: { ...maintenance, message: "  " } },
  ],
  [
    "null message",
    { ...problem, maintenance: { ...maintenance, message: null } },
  ],
  [
    "wrong active type",
    { ...problem, maintenance: { ...maintenance, active: "true" } },
  ],
  [
    "unsafe revision",
    { ...problem, maintenance: { ...maintenance, revision: 9007199254740992 } },
  ],
  [
    "negative revision",
    { ...problem, maintenance: { ...maintenance, revision: -1 } },
  ],
  ["inconsistent status", { ...problem, status: 500 }],
])(
  "keeps %s unavailable without inventing maintenance or admission",
  async (_name, body) => {
    // Given
    const error = await refused(body);

    // When
    const result = readMaintenanceProblem(error);

    // Then
    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(ApiError);
  },
);

it("does not interpret an ordinary object or non-HTTP failure as a server restriction", () => {
  // Given
  const failures = [
    problem,
    new Error("unavailable"),
    new ApiError("schema", 503, problem),
  ];

  // When / Then
  for (const error of failures)
    expect(readMaintenanceProblem(error)).toBeUndefined();
});
