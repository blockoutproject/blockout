import {
  createQueryClient,
  getSessionQueryKey,
} from "../../../shared/query/query-client";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import {
  getAccountPhoto,
  getGetMyAccountQueryKey,
  getMyAccount,
  getMaintenanceSettings,
  changeApplicationVersionSettings,
} from "../../../../.generated/mobile";
import { apiFetch } from "../../../shared/api/api-fetch";
import { createMaintenanceBypass } from "../state/maintenance-bypass";
import { createAccessObservations } from "../state/access-observations";
import { bindAccessTransport } from "../api/bind-access-transport";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";

jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const environment = { ...process.env };
const accountId = "00000000-0000-4000-8000-000000000180";
let unbind = () => {};
let client = createQueryClient();
beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  client = createQueryClient();
  mockFetch.mockReset().mockImplementation(
    async () =>
      new Response(new Blob(["photo"]), {
        headers: { "Content-Type": "image/png" },
      }),
  );
});
afterEach(() => {
  unbind();
  client.clear();
  process.env = { ...environment };
});

/** Binds real session/cache/transport owners; credentials and HTTP are the only controlled I/O. */
function setup() {
  const session = createSessionGeneration();
  session.setAccount(session.getSnapshot().generation, accountId);
  const bypass = createMaintenanceBypass();
  const observations = createAccessObservations();
  const full = applicationAccessResponse();
  full.maintenance = {
    revision: 1,
    active: true,
    message: "Maintenance",
    imageUrl: null,
  };
  observations.complete(full);
  const account = {
    accountId,
    username: "Operator",
    email: "operator@example.invalid",
    principalCreatedAt: null,
    hasPhoto: true,
    permissions: { bypassMaintenance: true },
  };
  client.setQueryData(
    getSessionQueryKey(
      session.getSnapshot().generation,
      getGetMyAccountQueryKey(),
    ),
    account,
  );
  unbind = bindAccessTransport({
    client,
    session,
    observations,
    bypass,
    getCredentials: async () => ({ accessToken: "renewed" }),
  });
  return { session, bypass, observations, full, account };
}

it("requires an explicit choice then sends intent and credentials through the private photo transport", async () => {
  // Given
  const { session, bypass } = setup();
  const captured = { ...session.getSnapshot(), isCurrent: session.isCurrent };
  await getAccountPhoto(accountId, {
    session: captured,
    headers: { Authorization: "Bearer existing" },
  });
  expect(
    new Headers(mockFetch.mock.lastCall?.[1]?.headers).has(
      "Blockout-Maintenance-Bypass",
    ),
  ).toBe(false);

  // When
  bypass.request(session.getSnapshot(), true);
  await getAccountPhoto(accountId, {
    session: captured,
    headers: { Authorization: "Bearer renewed" },
  });

  // Then
  expect(
    new Headers(mockFetch.mock.lastCall?.[1]?.headers).get(
      "Blockout-Maintenance-Bypass",
    ),
  ).toBe("true");
  expect(
    new Headers(mockFetch.mock.lastCall?.[1]?.headers).get("Authorization"),
  ).toBe("Bearer renewed");
});

it.each([
  "https://identity.example.invalid/token",
  "https://apps.apple.com/app/id1",
  "https://images.example.invalid/photo",
])("never forwards intent or credentials to %s", async (url) => {
  // Given
  const { session, bypass } = setup();
  bypass.request(session.getSnapshot(), true);

  // When / Then
  await expect(apiFetch(url)).rejects.toMatchObject({ kind: "configuration" });
  expect(mockFetch).not.toHaveBeenCalled();
});

it("leaves identification exempt and clears intent on observed grant loss and account boundaries", async () => {
  // Given
  const { session, bypass, account } = setup();
  bypass.request(session.getSnapshot(), true);
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(account), {
      headers: { "Content-Type": "application/json" },
    }),
  );

  // When
  await getMyAccount({
    session: { ...session.getSnapshot(), isCurrent: session.isCurrent },
  });

  // Then
  expect(
    new Headers(mockFetch.mock.lastCall?.[1]?.headers).has(
      "Blockout-Maintenance-Bypass",
    ),
  ).toBe(false);

  // When
  client.setQueryData(
    getSessionQueryKey(
      session.getSnapshot().generation,
      getGetMyAccountQueryKey(),
    ),
    { ...account, permissions: {} },
  );

  // Then
  expect(bypass.active(session.getSnapshot())).toBe(false);

  // When
  bypass.request(session.getSnapshot(), true);
  session.invalidate();
  session.setAccount(session.getSnapshot().generation, accountId);

  // Then
  expect(bypass.active(session.getSnapshot())).toBe(false);
});

it("clears intent on a successful complete inactive check and never restores it at cold start", () => {
  // Given
  const { session, bypass, observations, full } = setup();
  bypass.request(session.getSnapshot(), true);

  // When
  observations.complete({
    ...full,
    maintenance: {
      ...full.maintenance,
      revision: 2,
      active: false,
      message: null,
    },
  });

  // Then
  expect(bypass.active(session.getSnapshot())).toBe(false);
  expect(createMaintenanceBypass().active(session.getSnapshot())).toBe(false);
});

it("discards an old generation's photo refusal without introducing a restriction", async () => {
  // Given
  const { session, observations } = setup();
  let finish: (value: Response) => void = () => {};
  mockFetch.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const request = getAccountPhoto(accountId, {
    session: { ...session.getSnapshot(), isCurrent: session.isCurrent },
  });
  await Promise.resolve();

  // When
  session.invalidate();
  finish(
    new Response(
      JSON.stringify({
        type: "urn:blockout:problem:maintenance",
        title: "Maintenance",
        status: 503,
        detail: "Blocked",
        maintenance: {
          revision: 9,
          active: true,
          message: "Late",
          imageUrl: null,
        },
      }),
      { status: 503, headers: { "Content-Type": "application/problem+json" } },
    ),
  );

  // Then
  await expect(request).rejects.toMatchObject({ kind: "cancelled" });
  expect(observations.getSnapshot().maintenance?.revision).toBe(1);
});

it("supplies silently renewed credentials for a bypassed otherwise public backend read", async () => {
  // Given
  const { session, bypass } = setup();
  bypass.request(session.getSnapshot(), true);
  mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

  // When
  await apiFetch("/sporting-results");

  // Then
  const headers = new Headers(mockFetch.mock.lastCall?.[1]?.headers);
  expect(headers.get("Authorization")).toBe("Bearer renewed");
  expect(headers.get("Blockout-Maintenance-Bypass")).toBe("true");
});

it("never lends a bypass to an unsatisfied native minimum", async () => {
  // Given
  const { session, bypass, observations, full } = setup();
  bypass.request(session.getSnapshot(), true);
  observations.versions({
    ...full.versions,
    revision: 2,
    ios: {
      minimumVersion: "9000.0.0",
      storeUrl: "https://apps.apple.com/app/id123",
    },
    android: {
      minimumVersion: "9000.0.0",
      storeUrl:
        "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout",
    },
  });

  // When
  await getAccountPhoto(accountId, {
    session: { ...session.getSnapshot(), isCurrent: session.isCurrent },
    headers: { Authorization: "Bearer existing" },
  });

  // Then
  expect(
    new Headers(mockFetch.mock.lastCall?.[1]?.headers).has(
      "Blockout-Maintenance-Bypass",
    ),
  ).toBe(false);
});

it("observes partial generated reads and saves without opening ordinary access", async () => {
  // Given
  const { observations, session } = setup();
  const options = {
    session: { ...session.getSnapshot(), isCurrent: session.isCurrent },
  };
  mockFetch.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        revision: 5,
        active: false,
        message: "Prepared",
        imageUrl: null,
      }),
      { headers: { "Content-Type": "application/json" } },
    ),
  );

  // When
  await getMaintenanceSettings(options);

  // Then
  expect(observations.getSnapshot().maintenance?.revision).toBe(5);
  expect(observations.getSnapshot().complete).toBeUndefined();

  // When
  const versions = { ...applicationAccessResponse().versions, revision: 7 };
  mockFetch.mockResolvedValueOnce(
    new Response(JSON.stringify(versions), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  await changeApplicationVersionSettings(
    { revision: 6, ios: { minimumVersion: null } },
    options,
  );

  // Then
  expect(observations.getSnapshot().versions?.revision).toBe(7);
  expect(observations.getSnapshot().complete).toBeUndefined();
});
