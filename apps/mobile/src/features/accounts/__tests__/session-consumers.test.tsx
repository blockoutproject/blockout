import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../session/account-session-provider";
import { mockAuth0, credentialsFor } from "../test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import type { AccountCredentialCleanup } from "../session/account-session-provider";
import * as proSessionModule from "../../pro/pro-session";
import { ProProvider, usePro } from "../../pro/pro-provider";
import { prepareProNativeIO } from "../../pro/test-support/pro-harness";
import { mockPurchases } from "../../pro/test-support/native-purchases";
import {
  customerInfo,
  entitlement,
} from "../../pro/test-support/customer-info";
import type { CustomerInfo } from "react-native-purchases";
import {
  useAuth0,
  CredentialsManagerErrorCodes,
  type Credentials,
} from "react-native-auth0";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { revenueCat: { iosApiKey: "test_public" } } },
  },
}));
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../../pro/test-support/native-purchases")
    .mockPurchases,
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
const env = { ...process.env };

beforeEach(() => {
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "synthetic-mobile";
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("synthetic-owner"));
  mockAuth0.webAuthLogout
    .mockReset()
    .mockRejectedValue(new Error("Browser unavailable"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuth
    .mockReset()
    .mockResolvedValue(credentialsFor("synthetic-new-owner"));
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
});

it.each(["signOut", "clearCredentials"] as const)(
  "keeps %s reserved when old SDK credential work fails during push removal",
  async (command) => {
    // Given: only SDK I/O and the bounded F07 removal are controlled; the real Auth0 reducer publishes the error.
    const removal = Promise.withResolvers<void>();
    const credential = Promise.withResolvers<Credentials>();
    const prepare = jest
      .fn()
      .mockReturnValueOnce(() => removal.promise)
      .mockReturnValue(undefined);
    const hook = await renderHook(
      () => ({ session: useAccountSession(), auth: useAuth0() }),
      {
        wrapper: ({ children }) => (
          <AccountSessionProvider preparePushRemoval={prepare}>
            {children}
          </AccountSessionProvider>
        ),
      },
    );
    mockAuth0.getCredentials.mockReturnValueOnce(credential.promise);
    const lookup = hook.result.current.auth
      .getCredentials()
      .catch(() => undefined);
    let departure: Promise<void> | undefined;
    await act(async () => {
      departure = hook.result.current.session[command]();
    });

    // When
    await act(async () => {
      credential.reject({
        code: CredentialsManagerErrorCodes.NO_REFRESH_TOKEN,
        message: "Credentials unavailable",
      });
      await lookup;
    });
    const duringRemoval = hook.result.current.session.status;
    await act(async () => {
      await hook.result.current.session.signIn("synthetic-audience");
    });
    await act(async () => {
      removal.resolve();
      await departure;
    });

    // Then
    expect(duringRemoval).toBe("signing-out");
    expect(mockAuth0.webAuth).not.toHaveBeenCalled();
    expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1);
    expect(hook.result.current.session.status).toBe("guest");
  },
);

it.each(["signOut", "clearCredentials"] as const)(
  "does not launch an obsolete %s after a new authenticated generation replaces its pending removal",
  async (command) => {
    // Given
    const removal = Promise.withResolvers<void>();
    const prepare = jest
      .fn()
      .mockReturnValueOnce(() => removal.promise)
      .mockReturnValue(undefined);
    const hook = await renderHook(useAccountSession, {
      wrapper: ({ children }) => (
        <AccountSessionProvider preparePushRemoval={prepare}>
          {children}
        </AccountSessionProvider>
      ),
    });
    let departure: Promise<void> | undefined;
    await act(async () => {
      departure = hook.result.current[command]();
    });

    // When
    await act(async () => hook.result.current.invalidate());
    await act(async () => {
      await hook.result.current.signIn("synthetic-audience");
    });
    await act(async () => {
      removal.resolve();
      await departure;
    });

    // Then
    expect(mockAuth0.webAuth).toHaveBeenCalledTimes(1);
    expect(mockAuth0.webAuthLogout).not.toHaveBeenCalled();
    expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
    expect(hook.result.current.status).toBe("authenticated");
  },
);
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  process.env = { ...env };
});

it("clears actual RevenueCat presentation before push cleanup finishes and rejects a delayed old entitlement", async () => {
  // Given: real F05/F09 owners; only native SDK I/O and F07's bounded removal are controlled.
  const removal = Promise.withResolvers<void>();
  const information = Promise.withResolvers<CustomerInfo>();
  mockPurchases.getCustomerInfo.mockReturnValueOnce(information.promise);
  const hook = await renderHook(
    () => ({ session: useAccountSession(), pro: usePro() }),
    {
      wrapper: ({ children }) => (
        <AccountSessionProvider
          preparePushRemoval={() => () => removal.promise}
        >
          <ProProvider>{children}</ProProvider>
        </AccountSessionProvider>
      ),
    },
  );
  await act(async () =>
    hook.result.current.session.setAccount(
      hook.result.current.session.generation,
      "00000000-0000-4000-8000-000000000001",
    ),
  );
  await waitFor(() =>
    expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(1),
  );
  const original = hook.result.current.session;

  // When
  let pending: Promise<void> | undefined;
  await act(async () => {
    pending = hook.result.current.session.signOut();
  });

  // Then
  expect(original.isCurrent(original.generation)).toBe(false);
  expect(hook.result.current.pro.state.status).toBe("unavailable");
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();

  // When
  const active = { "Blockout Pro": entitlement() };
  await act(async () => {
    information.resolve(
      customerInfo({
        active,
        all: active,
        verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    );
    removal.resolve();
    await pending;
  });

  // Then
  expect(hook.result.current.session.status).toBe("guest");
  expect(hook.result.current.pro.state.status).toBe("guest");
  expect(mockPurchases.configure).toHaveBeenCalledTimes(1);
});

it("invalidates immediately, waits for one captured push removal, then clears credentials despite browser failure", async () => {
  // Given: F07's bounded adapter is controlled here; its real generated DELETE is exercised in the F07 suite.
  const removal = Promise.withResolvers<void>();
  const detach = jest.fn<
    ReturnType<AccountCredentialCleanup>,
    Parameters<AccountCredentialCleanup>
  >(() => removal.promise);
  const prepare = jest.fn(() => detach);
  const hook = await renderHook(useAccountSession, {
    wrapper: ({ children }) => (
      <AccountSessionProvider preparePushRemoval={prepare}>
        {children}
      </AccountSessionProvider>
    ),
  });
  const original = hook.result.current;

  // When
  let pending: Promise<void> | undefined;
  await act(async () => {
    pending = hook.result.current.signOut();
  });

  // Then
  expect(original.isCurrent(original.generation)).toBe(false);
  expect(prepare).toHaveBeenCalledTimes(1);
  expect(detach).toHaveBeenCalledTimes(1);
  expect(
    detach.mock.calls[0][0].isCurrent(detach.mock.calls[0][0].generation),
  ).toBe(true);
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
  expect(mockAuth0.webAuthLogout).not.toHaveBeenCalled();

  // When
  await act(async () => {
    removal.resolve();
    await pending;
  });

  // Then
  expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1);
  expect(hook.result.current.status).toBe("guest");
});

it("continues local credential clearing when exact removal fails", async () => {
  // Given
  const detach = jest.fn().mockRejectedValue(new Error("Removal unavailable"));
  const hook = await renderHook(useAccountSession, {
    wrapper: ({ children }) => (
      <AccountSessionProvider preparePushRemoval={() => detach}>
        {children}
      </AccountSessionProvider>
    ),
  });

  // When
  await act(async () => {
    await hook.result.current.clearCredentials();
  });

  // Then
  expect(detach).toHaveBeenCalledTimes(1);
  expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1);
  expect(hook.result.current.status).toBe("guest");
});
