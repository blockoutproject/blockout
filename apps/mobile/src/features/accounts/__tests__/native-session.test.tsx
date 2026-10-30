import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import { CredentialsManagerErrorCodes } from "react-native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../session/account-session-provider";
import { credentialsFor, mockAuth0 } from "../test-support/native-auth0";
import { accountResponse } from "../test-support/account-response";

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
  fetch: async () =>
    Response.json(
      jest.requireActual("../test-support/account-response").accountResponse(),
    ),
}));
const env = { ...process.env };
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
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuth.mockReset().mockResolvedValue(credentialsFor("auth0|a"));
  mockAuth0.webAuthLogout.mockReset().mockResolvedValue();
});
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  process.env = { ...env };
});
/** Waits for the real native account observer so the next controlled SDK call belongs to the action. */
async function restoredSession() {
  const hook = await renderHook(useAccountSession, {
    wrapper: AccountSessionProvider,
  });
  await waitFor(() =>
    expect(hook.result.current.accountId).toBe(accountResponse().accountId),
  );
  return hook;
}

it.each([
  CredentialsManagerErrorCodes.NO_NETWORK,
  CredentialsManagerErrorCodes.RENEW_FAILED,
  CredentialsManagerErrorCodes.LARGE_MIN_TTL,
])("keeps native %s credential failures recoverable", async (code) => {
  // Given
  const hook = await restoredSession();
  mockAuth0.getCredentials.mockRejectedValueOnce({
    code,
    message: "Credentials unavailable",
  });
  // When
  await act(async () => {
    await expect(hook.result.current.getCredentials()).rejects.toMatchObject({
      code,
    });
  });
  // Then
  expect(hook.result.current.status).toBe("authenticated");
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  // When
  await act(async () => {
    await hook.result.current.getCredentials();
  });
  // Then
  expect(hook.result.current.status).toBe("authenticated");
});

it.each([
  CredentialsManagerErrorCodes.NO_CREDENTIALS,
  CredentialsManagerErrorCodes.NO_REFRESH_TOKEN,
  CredentialsManagerErrorCodes.INVALID_CREDENTIALS,
  CredentialsManagerErrorCodes.SESSION_EXPIRED,
  CredentialsManagerErrorCodes.DPOP_KEY_MISSING,
  CredentialsManagerErrorCodes.DPOP_KEY_MISMATCH,
  CredentialsManagerErrorCodes.DPOP_NOT_CONFIGURED,
  "invalid_grant",
])("requires explicit sign-in after confirmed native %s", async (code) => {
  // Given
  const hook = await restoredSession();
  mockAuth0.getCredentials.mockRejectedValueOnce({
    code,
    message: "Credentials unavailable",
  });
  // When
  await act(async () => {
    await expect(hook.result.current.getCredentials()).rejects.toMatchObject({
      code,
    });
  });
  // Then
  expect(hook.result.current.status).toBe("reauthentication-required");
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
});

it.each(["success", "cancelled", "failed"] as const)(
  "reports ordinary SDK logout when browser outcome is %s",
  async (outcome) => {
    // Given
    const hook = await restoredSession();
    const browser = Promise.withResolvers<void>();
    mockAuth0.webAuthLogout.mockReturnValueOnce(browser.promise);
    let logout: Promise<void> | undefined;
    // When
    await act(async () => {
      logout = hook.result.current.signOut();
    });
    expect(hook.result.current.status).toBe("signing-out");
    await act(async () => {
      if (outcome === "success") browser.resolve();
      else
        browser.reject({
          message: outcome,
          code:
            outcome === "cancelled"
              ? "a0.session.user_cancelled"
              : "a0.network_error",
        });
      if (outcome === "success") await logout;
      else await expect(logout).rejects.toBeDefined();
    });
    // Then
    expect(hook.result.current.status).toBe(
      outcome === "success" ? "guest" : "authenticated",
    );
    expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(
      outcome === "success" ? 1 : 0,
    );
  },
);

it("clears credentials locally without browser logout", async () => {
  // Given
  const hook = await restoredSession();
  // When
  await act(async () => {
    await hook.result.current.clearCredentials();
  });
  // Then
  expect(hook.result.current.status).toBe("guest");
  expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1);
  expect(mockAuth0.webAuthLogout).not.toHaveBeenCalled();
});

it("does not retry a native storage failure after browser logout", async () => {
  // Given
  const hook = await restoredSession();
  mockAuth0.clearCredentials.mockRejectedValueOnce({
    code: CredentialsManagerErrorCodes.STORE_FAILED,
    message: "Storage unavailable",
  });
  // When
  await act(async () => {
    await expect(hook.result.current.signOut()).rejects.toMatchObject({
      code: CredentialsManagerErrorCodes.STORE_FAILED,
    });
  });
  // Then
  expect(mockAuth0.webAuthLogout).toHaveBeenCalledTimes(1);
  expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1);
});

it("recovers the same principal after explicit sign-in replaces unusable credentials", async () => {
  // Given
  const hook = await restoredSession();
  mockAuth0.getCredentials.mockRejectedValueOnce({
    code: CredentialsManagerErrorCodes.NO_REFRESH_TOKEN,
    message: "Credentials unavailable",
  });
  await act(async () => {
    await expect(hook.result.current.getCredentials()).rejects.toMatchObject({
      code: CredentialsManagerErrorCodes.NO_REFRESH_TOKEN,
    });
  });
  expect(hook.result.current.status).toBe("reauthentication-required");

  // When
  await act(async () => {
    await hook.result.current.signIn("https://api.example.invalid");
  });

  // Then
  expect(hook.result.current.subject).toBe("auth0|a");
  expect(hook.result.current.status).toBe("authenticated");
});
