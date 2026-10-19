import {
  changeApplicationVersionSettings,
  getAccount,
  getApplicationAccess,
  getGetApplicationAccessQueryOptions,
  getMyAccount,
} from "../../../../.generated/mobile";
import type {
  GetApplicationAccess200,
  GetMyAccount200,
} from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";

const accountId = "00000000-0000-4000-8000-000000000001";
const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));

/** Builds a complete synthetic public snapshot; no business admission is inferred here. */
function accessResponse(): GetApplicationAccess200 {
  return {
    maintenance: { revision: 0, active: false, message: null, imageUrl: null },
    versions: {
      revision: 0,
      ios: { minimumVersion: null, storeUrl: null },
      android: { minimumVersion: null, storeUrl: null },
      message: null,
    },
  };
}

/** Supplies an existing account with no projected privilege. */
function accountResponse(): GetMyAccount200 {
  return {
    accountId,
    username: "Synthetic",
    email: "fixture@example.invalid",
    principalCreatedAt: null,
    hasPhoto: false,
    permissions: {},
  };
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
});

it("accepts complete nullable groups and the maximum safe revisions", async () => {
  // Given
  const body = accessResponse();
  body.maintenance.revision = Number.MAX_SAFE_INTEGER;
  body.versions.revision = Number.MAX_SAFE_INTEGER;
  mockFetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        ...body,
        future: true,
        versions: {
          ...body.versions,
          ios: { ...body.versions.ios, future: true },
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    ),
  );

  // When
  const result = await getApplicationAccess();

  // Then
  expect(result).toStrictEqual(body);
});

it.each<[string, unknown]>([
  ["missing maintenance", { ...accessResponse(), maintenance: undefined }],
  ["missing versions", { ...accessResponse(), versions: undefined }],
  [
    "missing platform",
    {
      ...accessResponse(),
      versions: { ...accessResponse().versions, ios: undefined },
    },
  ],
  [
    "missing nullable field",
    {
      ...accessResponse(),
      versions: { ...accessResponse().versions, message: undefined },
    },
  ],
  ...[-1, 0.5, Number.MAX_SAFE_INTEGER + 1, "0"].map<[string, unknown]>(
    (revision) => [
      `invalid revision ${JSON.stringify(revision)}`,
      {
        ...accessResponse(),
        maintenance: { ...accessResponse().maintenance, revision },
      },
    ],
  ),
])("rejects %s before Query admission", async (_scenario, body) => {
  // Given
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(body), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  const client = createQueryClient();
  const options = getGetApplicationAccessQueryOptions();

  try {
    // When
    const request = client.fetchQuery(options);

    // Then
    await expect(request).rejects.toMatchObject({ kind: "schema" });
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
  } finally {
    client.clear();
  }
});

it.each([
  ["absent", {}],
  ["false", { manageMaintenance: false }],
  ["true", { manageMaintenance: true }],
])(
  "preserves %s capabilities without inferring other rights",
  async (_scenario, permissions) => {
    // Given
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          ...accountResponse(),
          permissions: { ...permissions, future: true },
          future: true,
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );

    // When
    const result = await getMyAccount();

    // Then
    expect(result.permissions).toStrictEqual(permissions);
    expect(result.permissions.bypassMaintenance).toBeUndefined();
  },
);

it.each([
  ["missing permissions", undefined],
  ["null permissions", null],
  ["null capability", { manageMaintenance: null }],
  ["string capability", { manageMaintenance: "true" }],
  ["numeric capability", { manageMaintenance: 1 }],
])("rejects %s instead of granting access", async (_scenario, permissions) => {
  // Given
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ ...accountResponse(), permissions }), {
      headers: { "Content-Type": "application/json" },
    }),
  );

  // When
  const request = getMyAccount();

  // Then
  await expect(request).rejects.toMatchObject({ kind: "schema" });
});

it.each([
  ["omission", { revision: 0, ios: {} }],
  [
    "explicit removal",
    {
      revision: 0,
      ios: { minimumVersion: null, storeUrl: null },
      message: null,
    },
  ],
])("preserves %s in generated partial requests", async (_scenario, change) => {
  // Given
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(accessResponse().versions), {
      headers: { "Content-Type": "application/json" },
    }),
  );

  // When
  await changeApplicationVersionSettings(change);

  // Then
  expect(mockFetch).toHaveBeenCalledWith(
    "https://api.example.invalid/administration/application-versions",
    expect.objectContaining({ method: "PATCH", body: JSON.stringify(change) }),
  );
});

it.each([
  ["unavailable", undefined],
  [
    "maintenance",
    {
      revision: 4,
      active: true,
      message: "Maintenance en cours",
      imageUrl: null,
    },
  ],
])("retains the canonical %s refusal", async (category, maintenance) => {
  // Given
  const problem = {
    type: `urn:blockout:problem:${category}`,
    title: "Service Unavailable",
    status: 503,
    ...(maintenance ? { maintenance } : {}),
  };
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(problem), {
      status: 503,
      headers: {
        "Content-Type": "application/problem+json",
        "Cache-Control": "no-store",
      },
    }),
  );

  // When
  const request = getAccount(accountId);

  // Then
  await expect(request).rejects.toMatchObject({
    kind: "http",
    status: 503,
    problem,
  });
});
