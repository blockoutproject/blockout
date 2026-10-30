import { useQueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
import { changeAccountProfile } from "../../../../.generated/mobile";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../session/account-session-provider";
import { useCurrentAccount } from "../api/use-current-account";
import { accountResponse } from "../test-support/account-response";
import { credentialsFor, mockAuth0 } from "../test-support/native-auth0";

jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../test-support/native-auth0",
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
const env = { ...process.env };
const account = accountResponse();

beforeEach(() => {
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
  });
  jest.mocked(initializeV2Installation).mockReset().mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|a"));
  mockAuth0.webAuth.mockReset().mockResolvedValue(credentialsFor("auth0|b"));
  mockAuth0.webAuthLogout.mockReset().mockResolvedValue();
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockFetch.mockReset().mockImplementation(async () => Response.json(account));
});
afterEach(async () => {
  await cleanup();
  process.env = { ...env };
  jest.restoreAllMocks();
});

/** Reads the actual native/business boundary together; only SDK I/O and HTTPS are controlled. */
function useIdentity() {
  return { session: useAccountSession(), account: useCurrentAccount() };
}

it("keeps consumers behind F14 initialization before restoring native identity", async () => {
  // Given
  const initialization = Promise.withResolvers<void>();
  jest
    .mocked(initializeV2Installation)
    .mockReturnValueOnce(initialization.promise);
  await render(
    <AccountSessionProvider fallback={<Text>Preparing installation</Text>}>
      <Text>Application</Text>
    </AccountSessionProvider>,
  );
  // When / Then
  expect(screen.getByText("Preparing installation")).toBeOnTheScreen();
  expect(screen.queryByText("Application")).not.toBeOnTheScreen();
  expect(mockAuth0.hasValidCredentials).not.toHaveBeenCalled();
  // When
  await act(async () => initialization.resolve());
  // Then
  expect(await screen.findByText("Application")).toBeOnTheScreen();
  expect(mockAuth0.hasValidCredentials).toHaveBeenCalled();
});

it("restores through Auth0 and derives the business UUID from the native account query", async () => {
  // Given
  const hook = await renderHook(useIdentity, {
    wrapper: AccountSessionProvider,
  });
  // When / Then
  await waitFor(() =>
    expect(hook.result.current.account.data).toEqual(account),
  );
  expect(hook.result.current.session.subject).toBe("auth0|a");
  expect(hook.result.current.session.accountId).toBe(account.accountId);
  expect(hook.result.current.session.status).toBe("authenticated");
  expect(
    mockFetch.mock.calls.every(([, options]) => options?.method !== "POST"),
  ).toBe(true);
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
});

it("retains guest navigation after initialization failure and retries explicitly", async () => {
  // Given
  jest
    .mocked(initializeV2Installation)
    .mockRejectedValueOnce(new Error("Storage unavailable"));
  const hook = await renderHook(useAccountSession, {
    wrapper: AccountSessionProvider,
  });
  await waitFor(() =>
    expect(hook.result.current.status).toBe("initialization-error"),
  );
  expect(mockFetch).not.toHaveBeenCalled();
  // When
  await act(() => hook.result.current.retryInitialization());
  // Then
  await waitFor(() => expect(hook.result.current.status).toBe("authenticated"));
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
});

it("does not dispatch an original account command with a different principal's credentials", async () => {
  // Given
  const hook = await renderHook(useIdentity, {
    wrapper: AccountSessionProvider,
  });
  await waitFor(() =>
    expect(hook.result.current.session.accountId).toBe(account.accountId),
  );
  const original = hook.result.current.session;
  mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|b"));
  // When
  await act(async () => {
    const write = original
      .getCredentials()
      .then((credentials) =>
        changeAccountProfile(
          account.accountId,
          { metadata: { username: "Alice" } },
          { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
        ),
      );
    await expect(write).rejects.toMatchObject({ kind: "cancelled" });
  });
  // Then
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PATCH"),
  ).toBe(false);
});

it("returns the SDK's explicit login principal without establishing on restoration", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  const hook = await renderHook(useAccountSession, {
    wrapper: AccountSessionProvider,
  });
  expect(hook.result.current.status).toBe("guest");
  mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|b"));
  // When
  let login: Awaited<ReturnType<typeof hook.result.current.signIn>>;
  await act(async () => {
    login = await hook.result.current.signIn("https://api.example.invalid");
  });
  // Then
  expect(login?.subject).toBe("auth0|b");
  await expect(login?.getCredentials()).resolves.toEqual(
    credentialsFor("auth0|b"),
  );
  expect(mockAuth0.webAuth).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "POST"),
  ).toBe(false);
});

it("does not restore A's native identity after B has signed in while A credentials were pending", async () => {
  // Given
  const credentialsA = { ...credentialsFor("auth0|a"), accessToken: "token-a" };
  const credentialsB = { ...credentialsFor("auth0|b"), accessToken: "token-b" };
  const accountB = accountResponse({
    accountId: "00000000-0000-4000-8000-000000000002",
    username: "Bob",
  });
  mockAuth0.getCredentials.mockResolvedValue(credentialsA);
  mockAuth0.webAuth.mockResolvedValue(credentialsB);
  mockFetch.mockImplementation(async (_url, options) =>
    Response.json(
      new Headers(options?.headers).get("Authorization") === "Bearer token-b"
        ? accountB
        : account,
    ),
  );
  const hook = await renderHook(
    () => ({ ...useIdentity(), client: useQueryClient() }),
    { wrapper: AccountSessionProvider },
  );
  await waitFor(() =>
    expect(hook.result.current.session.accountId).toBe(account.accountId),
  );
  const original = hook.result.current.session;
  const delayed = Promise.withResolvers<typeof credentialsA>();
  mockAuth0.getCredentials
    .mockReturnValueOnce(delayed.promise)
    .mockResolvedValue(credentialsB);
  let oldRead: Promise<unknown> | undefined;
  await act(async () => {
    oldRead = original.getCredentials();
  });
  await act(async () => {
    await hook.result.current.session.signIn("https://api.example.invalid");
  });
  await waitFor(() =>
    expect(hook.result.current.session.accountId).toBe(accountB.accountId),
  );
  const currentClient = hook.result.current.client;
  // Freeze any unintended new restoration so a transient wrong native identity cannot hide itself.
  const nextCredentials = Promise.withResolvers<typeof credentialsB>();
  mockAuth0.getCredentials.mockReturnValue(nextCredentials.promise);
  try {
    // When
    await act(async () => {
      delayed.resolve(credentialsA);
      await oldRead;
    });
    // Then
    expect(hook.result.current.session.subject).toBe("auth0|b");
    expect(hook.result.current.session.accountId).toBe(accountB.accountId);
    expect(hook.result.current.client).toBe(currentClient);
    expect(hook.result.current.account.data).toEqual(accountB);
  } finally {
    await act(async () => nextCredentials.resolve(credentialsB));
  }
});
