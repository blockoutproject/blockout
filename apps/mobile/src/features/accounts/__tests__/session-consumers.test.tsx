import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/shared/query/query-client";
import { ApplicationAccessProvider } from "@/features/access/queries/use-application-access";
import type { AccountSessionProviderProps } from "../session/account-session-provider";
import { fetch as expoFetch } from "expo/fetch";
import { accountResponse } from "../test-support/account-response";
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
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import * as proSessionModule from "@/features/pro/pro-session";
import { ProProvider, usePro } from "@/features/pro/pro-provider";
import { prepareProNativeIO } from "@/features/pro/test-support/pro-harness";
import { mockPurchases } from "@/features/pro/test-support/native-purchases";
import {
  customerInfo,
  entitlement,
} from "@/features/pro/test-support/customer-info";
import type { CustomerInfo } from "react-native-purchases";

jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { revenueCat: { iosApiKey: "test_public" } } },
  },
}));
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("@/features/pro/test-support/native-purchases")
    .mockPurchases,
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@/features/onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
const env = { ...process.env };
let publicClient = createQueryClient();

function SessionProviders(props: Readonly<AccountSessionProviderProps>) {
  return (
    <QueryClientProvider client={publicClient}>
      <ApplicationAccessProvider>
        <AccountSessionProvider {...props} />
      </ApplicationAccessProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  publicClient = createQueryClient();
  jest
    .mocked(expoFetch)
    .mockReset()
    .mockImplementation(
      async () =>
        Response.json(
          jest
            .requireActual("@/shared/api/test-support/application-access")
            .applicationAccessResponse(),
        ) as Awaited<ReturnType<typeof expoFetch>>,
    );
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
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
  "waits for one captured push removal before native %s",
  async (command) => {
    // Given
    mockAuth0.webAuthLogout.mockResolvedValue();
    const removal = Promise.withResolvers<void>();
    const detach = jest.fn(() => removal.promise);
    const prepare = jest.fn(() => detach);
    const hook = await renderHook(useAccountSession, {
      wrapper: ({ children }) => (
        <SessionProviders preparePushRemoval={prepare}>
          {children}
        </SessionProviders>
      ),
    });
    // When
    let departure: Promise<void> | undefined;
    await act(async () => {
      departure = hook.result.current[command]();
    });
    // Then
    expect(hook.result.current.status).toBe("signing-out");
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(detach).toHaveBeenCalledTimes(1);
    expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
    expect(mockAuth0.webAuthLogout).not.toHaveBeenCalled();
    // When
    await act(async () => {
      removal.resolve();
      await departure;
    });
    // Then
    expect(hook.result.current.status).toBe("guest");
    expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1);
  },
);
afterEach(async () => {
  await cleanup();
  publicClient.clear();
  jest.restoreAllMocks();
  process.env = { ...env };
});
it("clears actual RevenueCat presentation before push cleanup finishes and rejects a delayed old entitlement", async () => {
  // Given: real F05/F09 owners; only native SDK I/O and F07's bounded removal are controlled.
  mockAuth0.webAuthLogout.mockResolvedValue();
  jest.mocked(expoFetch).mockImplementation(
    async (url) =>
      (String(url).endsWith("/application-access")
        ? Response.json(
            jest
              .requireActual("@/shared/api/test-support/application-access")
              .applicationAccessResponse(),
          )
        : String(url).endsWith("/accounts/me")
          ? Response.json(
              accountResponse({
                accountId: "00000000-0000-4000-8000-000000000001",
              }),
            )
          : new Response(null, { status: 404 })) as Awaited<
        ReturnType<typeof expoFetch>
      >,
  );
  const removal = Promise.withResolvers<void>();
  const information = Promise.withResolvers<CustomerInfo>();
  mockPurchases.getCustomerInfo.mockReturnValueOnce(information.promise);
  const hook = await renderHook(
    () => ({
      session: useAccountSession(),
      pro: usePro(),
    }),
    {
      wrapper: ({ children }) => (
        <SessionProviders preparePushRemoval={() => () => removal.promise}>
          <ProProvider>{children}</ProProvider>
        </SessionProviders>
      ),
    },
  );
  await waitFor(() =>
    expect(hook.result.current.session.accountId).toBe(
      "00000000-0000-4000-8000-000000000001",
    ),
  );
  await waitFor(() =>
    expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(1),
  );
  // When
  let pending: Promise<void> | undefined;
  await act(async () => {
    pending = hook.result.current.session.signOut();
  });
  // Then
  expect(hook.result.current.session.operation).toBe("signing-out");
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
it("continues local credential clearing when exact removal fails", async () => {
  // Given
  const detach = jest.fn().mockRejectedValue(new Error("Removal unavailable"));
  const hook = await renderHook(useAccountSession, {
    wrapper: ({ children }) => (
      <SessionProviders preparePushRemoval={() => detach}>
        {children}
      </SessionProviders>
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
