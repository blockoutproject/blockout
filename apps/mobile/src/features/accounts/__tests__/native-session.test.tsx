import { act, renderHook } from "@testing-library/react-native";
import {
  AuthError,
  CredentialsManagerError,
  CredentialsManagerErrorCodes,
  useAuth0,
} from "react-native-auth0";
import { eraseAccount } from "../../../../.generated/mobile";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../session/account-session-provider";
import { credentialsFor, mockClient } from "../test-support/native-auth0";

jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
// Keep Auth0's provider, reducer, hooks and error classes real; control native I/O only.
jest.mock(require.resolve("react-native-auth0/src/Auth0.ts"), () => ({
  __esModule: true,
  default: jest.fn(() => mockClient),
}));
jest.mock("react-native-auth0", () =>
  jest.requireActual("../test-support/native-auth0").nativeAuth0Module(),
);
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));

const originalConfiguration = {
  EXPO_PUBLIC_AUTH0_DOMAIN: process.env.EXPO_PUBLIC_AUTH0_DOMAIN,
  EXPO_PUBLIC_AUTH0_CLIENT_ID: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
};

beforeEach(() => {
  jest.useFakeTimers();
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "mobile-test";
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  jest.mocked(initializeV2Installation).mockReset().mockResolvedValue();
  mockClient.credentialsManager.hasValidCredentials
    .mockReset()
    .mockResolvedValue(true);
  mockClient.credentialsManager.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|a"));
  mockClient.credentialsManager.clearCredentials
    .mockReset()
    .mockResolvedValue();
  mockClient.credentialsManager.saveCredentials.mockReset().mockResolvedValue();
  mockClient.webAuth.authorize
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|a"));
  mockClient.webAuth.clearSession.mockReset().mockResolvedValue();
  mockFetch.mockReset();
});

afterEach(async () => {
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
  jest.restoreAllMocks();
  for (const [key, value] of Object.entries(originalConfiguration)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

/** Captures the real SDK and business owner together, without a credential wrapper. */
function useSessionControls() {
  return { auth: useAuth0(), session: useAccountSession() };
}

/** Creates the same public error class and code exposed by the native credential manager. */
function credentialError(code: string) {
  return new CredentialsManagerError(
    new AuthError("CredentialsManagerError", "Credentials unavailable", {
      code,
    }),
  );
}

it("restores and renews through the SDK without replaying an uncertain mutation", async () => {
  // Given
  const hook = await renderHook(useSessionControls, {
    wrapper: AccountSessionProvider,
  });
  expect(hook.result.current.session.status).toBe("authenticated");
  const captured = hook.result.current.session;
  mockFetch.mockRejectedValueOnce(new Error("Response lost"));
  await expect(
    eraseAccount("account-a", { session: captured }),
  ).rejects.toMatchObject({ kind: "network" });
  const renewed = {
    ...credentialsFor("auth0|a"),
    accessToken: "renewed-token",
  };
  mockClient.credentialsManager.getCredentials.mockResolvedValueOnce(renewed);

  // When
  await act(async () => {
    await expect(hook.result.current.auth.getCredentials()).resolves.toBe(
      renewed,
    );
  });

  // Then
  expect(hook.result.current.session.generation).toBe(captured.generation);
  expect(hook.result.current.session.status).toBe("authenticated");
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockClient.webAuth.authorize).not.toHaveBeenCalled();
  expect(mockClient.credentialsManager.clearCredentials).not.toHaveBeenCalled();
});

it.each([
  CredentialsManagerErrorCodes.NO_NETWORK,
  CredentialsManagerErrorCodes.RENEW_FAILED,
  CredentialsManagerErrorCodes.LARGE_MIN_TTL,
])(
  "keeps %s recoverable without clearing the session or demanding another login",
  async (code) => {
    // Given
    const hook = await renderHook(useSessionControls, {
      wrapper: AccountSessionProvider,
    });
    await act(async () => {
      hook.result.current.session.setAccount(
        hook.result.current.session.generation,
        "account-a",
      );
    });
    const captured = hook.result.current.session;
    const failure = credentialError(code);
    mockClient.credentialsManager.getCredentials.mockRejectedValueOnce(failure);

    // When
    await act(async () => {
      await expect(hook.result.current.auth.getCredentials()).rejects.toBe(
        failure,
      );
    });

    // Then
    expect(hook.result.current.session.status).toBe("authenticated");
    expect(hook.result.current.session.accountId).toBe("account-a");
    expect(captured.isCurrent(captured.generation)).toBe(true);

    // When: the caller retries native credential retrieval explicitly.
    await act(async () => {
      await expect(hook.result.current.auth.getCredentials()).resolves.toEqual(
        credentialsFor("auth0|a"),
      );
    });

    // Then
    expect(hook.result.current.session.status).toBe("authenticated");
    expect(mockClient.webAuth.authorize).not.toHaveBeenCalled();
    expect(
      mockClient.credentialsManager.clearCredentials,
    ).not.toHaveBeenCalled();
  },
);

it.each([
  CredentialsManagerErrorCodes.NO_CREDENTIALS,
  CredentialsManagerErrorCodes.NO_REFRESH_TOKEN,
  CredentialsManagerErrorCodes.INVALID_CREDENTIALS,
  CredentialsManagerErrorCodes.SESSION_EXPIRED,
  "invalid_grant",
])(
  "requires sign-in and invalidates private work after confirmed %s",
  async (code) => {
    // Given
    const hook = await renderHook(useSessionControls, {
      wrapper: AccountSessionProvider,
    });
    await act(async () => {
      hook.result.current.session.setAccount(
        hook.result.current.session.generation,
        "account-a",
      );
    });
    const captured = hook.result.current.session;
    const failure = credentialError(code);
    mockClient.credentialsManager.getCredentials.mockRejectedValueOnce(failure);

    // When
    await act(async () => {
      await expect(hook.result.current.auth.getCredentials()).rejects.toBe(
        failure,
      );
    });

    // Then
    expect(hook.result.current.session.status).toBe(
      "reauthentication-required",
    );
    expect(hook.result.current.session.accountId).toBeNull();
    expect(captured.isCurrent(captured.generation)).toBe(false);
    expect(
      hook.result.current.session.setAccount(
        hook.result.current.session.generation,
        "account-a",
      ),
    ).toBe(false);
    expect(mockClient.webAuth.authorize).not.toHaveBeenCalled();
  },
);

it.each(["success", "cancelled", "failed"] as const)(
  "invalidates immediately and ends locally when browser logout is %s",
  async (outcome) => {
    // Given
    const hook = await renderHook(useSessionControls, {
      wrapper: AccountSessionProvider,
    });
    const captured = hook.result.current.session;
    const browser = Promise.withResolvers<void>();
    mockClient.webAuth.clearSession.mockReturnValueOnce(browser.promise);
    let logout: Promise<void>;

    // When
    await act(async () => {
      logout = hook.result.current.session.signOut();
      expect(captured.isCurrent(captured.generation)).toBe(false);
    });
    await act(async () => {
      if (outcome === "success") browser.resolve();
      else
        browser.reject(
          new AuthError("Browser error", outcome, {
            code:
              outcome === "cancelled"
                ? "a0.session.user_cancelled"
                : "a0.network_error",
          }),
        );
      await logout;
    });

    // Then
    expect(hook.result.current.session.status).toBe("guest");
    expect(hook.result.current.session.accountId).toBeNull();
    expect(
      mockClient.credentialsManager.clearCredentials,
    ).toHaveBeenCalledTimes(1);
    expect(mockClient.webAuth.clearSession).toHaveBeenCalledWith(
      undefined,
      undefined,
    );
  },
);

it("surfaces a failed local clear without restoring invalidated private work", async () => {
  // Given
  const hook = await renderHook(useSessionControls, {
    wrapper: AccountSessionProvider,
  });
  const captured = hook.result.current.session;
  mockClient.webAuth.clearSession.mockRejectedValueOnce(
    new Error("Browser unavailable"),
  );
  const failure = credentialError(CredentialsManagerErrorCodes.STORE_FAILED);
  mockClient.credentialsManager.clearCredentials.mockRejectedValueOnce(failure);

  // When
  await act(async () => {
    await expect(hook.result.current.session.signOut()).rejects.toBe(failure);
  });

  // Then
  expect(captured.isCurrent(captured.generation)).toBe(false);
  expect(hook.result.current.session.accountId).toBeNull();
  expect(mockClient.credentialsManager.clearCredentials).toHaveBeenCalledTimes(
    1,
  );
});

it("clears credentials locally without requiring browser logout", async () => {
  // Given
  const hook = await renderHook(useSessionControls, {
    wrapper: AccountSessionProvider,
  });
  const captured = hook.result.current.session;

  // When
  await act(async () => {
    await hook.result.current.session.clearCredentials();
  });

  // Then
  expect(captured.isCurrent(captured.generation)).toBe(false);
  expect(hook.result.current.session.status).toBe("guest");
  expect(mockClient.credentialsManager.clearCredentials).toHaveBeenCalledTimes(
    1,
  );
  expect(mockClient.webAuth.clearSession).not.toHaveBeenCalled();
});

it("does not retry a native storage failure after successful browser logout", async () => {
  // Given
  const hook = await renderHook(useSessionControls, {
    wrapper: AccountSessionProvider,
  });
  const failure = credentialError(CredentialsManagerErrorCodes.STORE_FAILED);
  mockClient.credentialsManager.clearCredentials.mockRejectedValueOnce(failure);

  // When
  await act(async () => {
    await expect(hook.result.current.session.signOut()).rejects.toBe(failure);
  });

  // Then
  expect(mockClient.webAuth.clearSession).toHaveBeenCalledTimes(1);
  expect(mockClient.credentialsManager.clearCredentials).toHaveBeenCalledTimes(
    1,
  );
});
