import { accountResponse } from "../../accounts/test-support/account-response";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import type { PropsWithChildren } from "react";
import { getAccountPhoto, getMyAccount } from "../../../../.generated/mobile";
import { apiFetch } from "../../../shared/api/api-fetch";
import { createQueryClient } from "../../../shared/query/query-client";
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
const account = accountResponse({
  accountId: "00000000-0000-4000-8000-000000000180",
  username: "Operator",
  email: "operator@example.invalid",
  hasPhoto: true,
  permissions: { bypassMaintenance: true },
});
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
async function renderAccessHooks() {
  const hook = await renderHook(
    () => ({
      ordinary: useOrdinaryRequest(),
      access: useAccessAdmission(),
      session: useAccountSession(),
      profile: useProfileEditing(account.accountId),
    }),
    { wrapper: Providers },
  );
  return hook;
}

it("requires explicit choice for binary requests while independent identification remains unchanged", async () => {
  // Given
  const { result } = await renderAccessHooks();
  await waitFor(() => expect(result.current.access.canBypass).toBe(true));
  const options = {
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
  const { result } = await renderAccessHooks();
  await waitFor(() => expect(result.current.access.canBypass).toBe(true));
  await act(() => {
    result.current.access.bypassMaintenance();
  });
  const options = result.current.ordinary.request({
    headers: { Authorization: "Bearer existing" },
  });
  mockFetch.mockClear();

  // When
  const request = apiFetch(url, options);

  // Then
  await expect(request).rejects.toMatchObject({
    kind: "configuration",
  });
  expect(mockFetch).not.toHaveBeenCalled();
});

it("clears personal choice only after a successful complete inactive check", async () => {
  // Given
  const { result } = await renderAccessHooks();
  await waitFor(() => expect(result.current.access.canBypass).toBe(true));
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

it.each([401, 403])(
  "clears current personal intent after its HTTP %i refusal",
  async (status) => {
    // Given
    const { result } = await renderAccessHooks();
    await waitFor(() => expect(result.current.access.canBypass).toBe(true));
    await act(() => {
      result.current.access.bypassMaintenance();
    });
    const options = result.current.ordinary.request({
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
