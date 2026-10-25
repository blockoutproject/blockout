import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import type { PropsWithChildren } from "react";
import {
  getAccountPhoto,
  getGetMyAccountQueryKey,
  getMyAccount,
  listClubs,
} from "../../../../.generated/mobile";
import { apiFetch } from "../../../shared/api/api-fetch";
import {
  createQueryClient,
  getSessionQueryKey,
} from "../../../shared/query/query-client";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import { useProfileEditing } from "../../accounts/api/use-profile-editing";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { ApplicationAccessProvider } from "../queries/use-application-access";
import {
  AccessAdmissionProvider,
  useAccessAdmission,
} from "../queries/use-access-admission";
import { useOrdinaryRequest } from "../ordinary-request";
import { createDiscoveryContext } from "../../discovery/api/discovery-context";

jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const environment = { ...process.env };
const account = {
  accountId: "00000000-0000-4000-8000-000000000180",
  username: "Operator",
  email: "operator@example.invalid",
  principalCreatedAt: null,
  hasPhoto: true,
  permissions: { bypassMaintenance: true },
};
let client = createQueryClient();
let full = applicationAccessResponse();

beforeEach(() => {
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
  });
  client = createQueryClient();
  full = applicationAccessResponse();
  full.maintenance = {
    revision: 1,
    active: true,
    message: "Maintenance",
    imageUrl: null,
  };
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|operator180"));
  mockFetch.mockReset().mockImplementation(async (url) => {
    if (String(url).endsWith("/application-access")) return Response.json(full);
    if (String(url).endsWith("/accounts/me")) return Response.json(account);
    return new Response("photo", { headers: { "Content-Type": "image/png" } });
  });
});
afterEach(async () => {
  await cleanup();
  client.clear();
  process.env = { ...environment };
});

/** Mounts the production access/session composition; only native identity and HTTP I/O are controlled. */
function Providers({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={client}>
      <ApplicationAccessProvider>
        <AccountSessionProvider>
          <AccessAdmissionProvider>{children}</AccessAdmissionProvider>
        </AccountSessionProvider>
      </ApplicationAccessProvider>
    </QueryClientProvider>
  );
}

/** Exposes existing business hooks so scenarios can exercise generated calls and real provider state together. */
async function setup() {
  const hook = await renderHook(
    () => ({
      ordinary: useOrdinaryRequest(),
      access: useAccessAdmission(),
      session: useAccountSession(),
      profile: useProfileEditing(account.accountId),
    }),
    { wrapper: Providers },
  );
  await waitFor(() => expect(hook.result.current.access.canBypass).toBe(true));
  return hook;
}

it("requires explicit choice for binary requests while independent identification remains unchanged", async () => {
  // Given
  const { result } = await setup();
  const options = {
    session: result.current.session,
    headers: { Authorization: "Bearer existing" },
  };
  await getAccountPhoto(
    account.accountId,
    result.current.ordinary.request(options),
  );
  expect(
    new Headers(mockFetch.mock.lastCall?.[1]?.headers).has(
      "Blockout-Maintenance-Bypass",
    ),
  ).toBe(false);

  // When
  await act(() => {
    result.current.access.bypassMaintenance();
  });
  await getAccountPhoto(
    account.accountId,
    result.current.ordinary.request(options),
  );

  // Then
  expect(
    new Headers(mockFetch.mock.lastCall?.[1]?.headers).get(
      "Blockout-Maintenance-Bypass",
    ),
  ).toBe("true");
  expect(
    new Headers(mockFetch.mock.lastCall?.[1]?.headers).get("Authorization"),
  ).toBe("Bearer existing");
  await getMyAccount(options);
  expect(
    new Headers(mockFetch.mock.lastCall?.[1]?.headers).has(
      "Blockout-Maintenance-Bypass",
    ),
  ).toBe(false);
});

it.each([
  "https://identity.example.invalid/token",
  "https://apps.apple.com/app/id1",
  "https://images.example.invalid/photo",
])("never forwards captured credentials or intent to %s", async (url) => {
  // Given
  const { result } = await setup();
  await act(() => {
    result.current.access.bypassMaintenance();
  });
  const options = result.current.ordinary.request({
    session: result.current.session,
    headers: { Authorization: "Bearer existing" },
  });
  mockFetch.mockClear();

  // When / Then
  await expect(apiFetch(url, options)).rejects.toMatchObject({
    kind: "configuration",
  });
  expect(mockFetch).not.toHaveBeenCalled();
});

it("clears intent on observed grant loss even when the grant returns before React renders", async () => {
  // Given
  const { result } = await setup();
  await act(() => {
    result.current.access.bypassMaintenance();
  });
  const intent = result.current.ordinary.bypass;
  const key = getSessionQueryKey(
    result.current.session.generation,
    getGetMyAccountQueryKey(),
  );

  // When
  await act(() => {
    client.setQueryData(key, { ...account, permissions: {} });
    client.setQueryData(key, account);
  });

  // Then
  expect(result.current.ordinary.bypass).toBeUndefined();
  expect(intent?.signal.aborted).toBe(true);
  expect(result.current.access.ordinary).toBe(false);
});

it.each([account.accountId, "00000000-0000-4000-8000-000000000181"])(
  "does not reuse intent after a session boundary returning to %s",
  async (nextAccount) => {
    // Given
    const { result } = await setup();
    await act(() => {
      result.current.access.bypassMaintenance();
    });
    const options = result.current.ordinary.request({
      session: result.current.session,
      headers: { Authorization: "Bearer existing" },
    });

    // When
    await act(() => {
      result.current.session.invalidate();
      result.current.session.setAccount(
        result.current.session.getSnapshot().generation,
        nextAccount,
      );
    });
    mockFetch.mockClear();

    // Then
    await expect(
      getAccountPhoto(account.accountId, options),
    ).rejects.toMatchObject({ kind: "cancelled" });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.ordinary.bypass).toBeUndefined();
  },
);

it("clears personal choice only after a successful complete inactive check", async () => {
  // Given
  const { result } = await setup();
  await act(() => {
    result.current.access.bypassMaintenance();
  });
  full = {
    ...full,
    maintenance: { revision: 2, active: false, message: null, imageUrl: null },
  };

  // When
  await act(async () => {
    await result.current.access.retry();
  });

  // Then
  await waitFor(() => expect(result.current.ordinary.bypass).toBeUndefined());
});

it("rejects a profile command when bypass is cleared during native credential preparation", async () => {
  // Given
  const { result } = await setup();
  await act(() => {
    result.current.access.bypassMaintenance();
  });
  const credentials =
    Promise.withResolvers<ReturnType<typeof credentialsFor>>();
  const credentialReads = mockAuth0.getCredentials.mock.calls.length;
  mockAuth0.getCredentials.mockReturnValueOnce(credentials.promise);
  let completion = Promise.resolve<unknown>(undefined);
  await act(() => {
    completion = result.current.profile.save
      .mutateAsync({ metadata: { username: "Updated" } })
      .catch((error: unknown) => error);
  });
  await waitFor(() =>
    expect(mockAuth0.getCredentials).toHaveBeenCalledTimes(credentialReads + 1),
  );
  const before = mockFetch.mock.calls.length;

  // When
  await act(async () => {
    result.current.access.bypass.clear();
    credentials.resolve(credentialsFor("auth0|operator180"));
    expect(await completion).toMatchObject({ kind: "cancelled" });
  });

  // Then
  expect(mockFetch).toHaveBeenCalledTimes(before);
});

it.each(["typed maintenance", "generic 503"])(
  "observes an ordinary %s refusal through the caller's options",
  async (kind) => {
    // Given
    const { result } = await setup();
    const options = result.current.ordinary.request({
      session: result.current.session,
    });
    const problem = {
      type: "urn:blockout:problem:unavailable",
      title: "Unavailable",
      status: 503,
      ...(kind === "typed maintenance"
        ? {
            type: "urn:blockout:problem:maintenance",
            maintenance: {
              revision: 9,
              active: true,
              message: "Latest",
              imageUrl: null,
            },
          }
        : {}),
    };
    mockFetch.mockResolvedValueOnce(
      Response.json(problem, {
        status: 503,
        headers: { "Content-Type": "application/problem+json" },
      }),
    );

    // When
    await act(async () => {
      await expect(
        getAccountPhoto(account.accountId, options),
      ).rejects.toMatchObject({ status: 503 });
    });

    // Then
    expect(result.current.access.snapshot.complete).toBeUndefined();
    if (kind === "typed maintenance")
      expect(result.current.access.snapshot.maintenance?.revision).toBe(9);
    else expect(result.current.access.snapshot.maintenance?.revision).toBe(1);
  },
);

it("never downgrades a captured public discovery bypass after its intent is cleared", async () => {
  // Given
  const { result } = await setup();
  await act(() => {
    result.current.access.bypassMaintenance();
  });
  const intent = result.current.ordinary.bypass;
  expect(intent).toBeDefined();
  const request = result.current.ordinary.request({
    session: result.current.session,
    headers: { Authorization: "Bearer existing" },
  });
  const context = createDiscoveryContext("club", {}, request);
  expect(context.queryKey[0]).toBe("session");

  // When
  await act(() => {
    result.current.access.bypass.clear();
  });
  mockFetch.mockClear();

  // Then
  await expect(
    listClubs(context.params, context.request),
  ).rejects.toMatchObject({ kind: "cancelled" });
  expect(mockFetch).not.toHaveBeenCalled();
});

it("rechecks the minimum version after native credential preparation", async () => {
  // Given
  const { result } = await setup();
  await act(() => {
    result.current.access.bypassMaintenance();
  });
  const credentials =
    Promise.withResolvers<ReturnType<typeof credentialsFor>>();
  const credentialReads = mockAuth0.getCredentials.mock.calls.length;
  mockAuth0.getCredentials.mockReturnValueOnce(credentials.promise);
  let completion = Promise.resolve<unknown>(undefined);
  await act(() => {
    completion = result.current.profile.save
      .mutateAsync({ metadata: { username: "Updated" } })
      .catch((error: unknown) => error);
  });
  await waitFor(() =>
    expect(mockAuth0.getCredentials).toHaveBeenCalledTimes(credentialReads + 1),
  );
  const before = mockFetch.mock.calls.length;

  // When
  await act(async () => {
    result.current.access.observations.versions({
      ...full.versions,
      revision: 2,
      ios: { ...full.versions.ios, minimumVersion: "9000.0.0" },
      android: { ...full.versions.android, minimumVersion: "9000.0.0" },
    });
    credentials.resolve(credentialsFor("auth0|operator180"));
    expect(await completion).toMatchObject({ kind: "cancelled" });
  });

  // Then
  expect(mockFetch).toHaveBeenCalledTimes(before);
  expect(result.current.access.ordinary).toBe(false);
});

it("discards an old session's refusal before publishing access observations", async () => {
  // Given
  const { result } = await setup();
  const options = result.current.ordinary.request({
    session: result.current.session,
  });
  const response = Promise.withResolvers<Response>();
  mockFetch.mockReturnValueOnce(response.promise);
  const pending = getAccountPhoto(account.accountId, options).catch(
    (error: unknown) => error,
  );

  // When
  await act(async () => {
    result.current.session.invalidate();
    response.resolve(
      Response.json(
        {
          type: "urn:blockout:problem:maintenance",
          title: "Maintenance",
          status: 503,
          maintenance: {
            revision: 9,
            active: true,
            message: "Obsolete",
            imageUrl: null,
          },
        },
        {
          status: 503,
          headers: { "Content-Type": "application/problem+json" },
        },
      ),
    );
    expect(await pending).toMatchObject({ kind: "cancelled" });
  });

  // Then
  expect(result.current.access.snapshot.maintenance?.revision).toBe(1);
});

it.each([401, 403])(
  "clears current personal intent after its HTTP %i refusal",
  async (status) => {
    // Given
    const { result } = await setup();
    await act(() => {
      result.current.access.bypassMaintenance();
    });
    const options = result.current.ordinary.request({
      session: result.current.session,
      headers: { Authorization: "Bearer existing" },
    });
    mockFetch.mockResolvedValueOnce(new Response(null, { status }));

    // When
    await act(async () => {
      await expect(
        getAccountPhoto(account.accountId, options),
      ).rejects.toMatchObject({ kind: "http", status });
    });

    // Then
    expect(result.current.ordinary.bypass).toBeUndefined();
    expect(result.current.access.snapshot.maintenance?.revision).toBe(1);
  },
);

it("aborts the captured bypass intent when its provider is removed", async () => {
  // Given
  const hook = await setup();
  await act(async () => {
    hook.result.current.access.bypassMaintenance();
  });
  const captured = hook.result.current.ordinary.bypass;
  expect(captured?.signal.aborted).toBe(false);

  // When
  await hook.unmount();

  // Then: an intent retained by asynchronous work cannot outlive its provider.
  expect(captured?.signal.aborted).toBe(true);
});
