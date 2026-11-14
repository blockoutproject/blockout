import { accountResponse as mockAccountResponse } from "@/features/accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Stack } from "expo-router";
import { ProProfileEntry } from "../components/pro-profile-entry";
import { renderRouter } from "expo-router/testing-library";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Text } from "react-native";
import { useEffect, type ComponentProps } from "react";
import RevenueCatUI, {
  type CustomerCenterViewProps,
} from "react-native-purchases-ui";
import type { CustomerInfo } from "react-native-purchases";
import type { AccountSession } from "@/features/accounts";
import {
  AccountSessionProvider,
  useAccountSession,
} from "@/features/accounts/session/account-session-provider";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { ActionFeedbackProvider } from "@/shared/components/action-feedback";
import { createQueryClient } from "@/shared/query/query-client";
import { ProProvider, usePro, type ProContext } from "../pro-provider";
import { ProPresentationScreen } from "../screens/pro-presentation-screen";
import * as proSessionModule from "../pro-session";
import { prepareProNativeIO } from "../test-support/pro-harness";
import { mockPurchases } from "../test-support/native-purchases";
import { customerInfo, entitlement } from "../test-support/customer-info";
import { v2Offering } from "../test-support/offering";

jest.mock("expo/fetch", () => ({
  fetch: jest.fn((url: RequestInfo | URL) => {
    // Preserve the unconfigured transport until the scenario supplies its account response.
    if (mockAccountId === undefined) {
      return undefined;
    }
    return Promise.resolve(
      String(url).endsWith("/accounts/me")
        ? Response.json(
            mockAccountResponse({
              accountId: mockAccountId,
            }),
          )
        : new Response(null, { status: 404 }),
    );
  }),
}));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        revenueCat: { iosApiKey: "test_public", offeringIdentifier: "v2" },
      },
    },
  },
}));
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../test-support/native-purchases").mockPurchases,
}));
jest.mock("react-native-purchases-ui", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: {
      Paywall: (props: ComponentProps<typeof RevenueCatUI.Paywall>) => {
        mockPaywall = props;
        return <Text>Native paywall</Text>;
      },
      CustomerCenterView: (props: CustomerCenterViewProps) => {
        mockCenter = props;
        return <Text>Native management</Text>;
      },
    },
  };
});
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@/features/onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "@/features/accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
let mockPaywall: ComponentProps<typeof RevenueCatUI.Paywall>;
let mockCenter: CustomerCenterViewProps;
let mockAccountId: string | undefined;
let account: AccountSession;
let pro: ProContext;
let client = createQueryClient();
const previousEnvironment = { ...process.env };
const accountA = "00000000-0000-4000-8000-000000000318";
beforeEach(() => {
  mockAccountId = undefined;
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "mobile-test";
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  mockPurchases.getOfferings
    .mockReset()
    .mockResolvedValue({ current: null, all: { v2: v2Offering } });
  client = createQueryClient();
});
afterEach(async () => {
  await cleanup();
  client.clear();
  jest.restoreAllMocks();
  process.env = { ...previousEnvironment };
});

/** Observes real session/SDK owners; native I/O and provider views are the only doubles. */
function Journey() {
  useQueryClient().setQueryDefaults([], { retry: false, gcTime: Infinity });
  const a = useAccountSession();
  const p = usePro();
  useEffect(() => {
    account = a;
    pro = p;
  }, [a, p]);
  return (
    <ActionFeedbackProvider scopeKey={a.subject ?? "guest"}>
      <Text>Rights: {p.state.status}</Text>
      <Stack screenOptions={{ headerShown: false, animation: "none" }} />
    </ActionFeedbackProvider>
  );
}

/** Mounts the real session, Pro and route owners without establishing an account or opening Pro. */
async function renderProRoutes() {
  await renderRouter(
    {
      _layout: Journey,
      index: () => (
        <>
          <Text>Profile</Text>
          <ProProfileEntry />
        </>
      ),
      profile: () => <Text>Profile</Text>,
      pro: () => <ProPresentationScreen admitted />,
    },
    {
      initialUrl: "/",
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>
          <ThemeProvider>
            <AccountSessionProvider>
              <ProProvider>{children}</ProProvider>
            </AccountSessionProvider>
          </ThemeProvider>
        </QueryClientProvider>
      ),
    },
  );
}

it.each(["none", "expired", "active"])(
  "consumes native paywall restore with %s rights without purchasing",
  async (outcome) => {
    // Given
    await renderProRoutes();
    await waitFor(() => expect(account.status).toBe("authenticated"));
    mockAccountId = accountA;
    mockAuth0.webAuth.mockResolvedValue(
      credentialsFor(`auth0|${mockAccountId}`),
    );
    mockAuth0.getCredentials.mockResolvedValue(
      credentialsFor(`auth0|${mockAccountId}`),
    );
    mockAuth0.saveCredentials.mockResolvedValue();
    await act(() => account.signIn("https://api.example.invalid"));
    await waitFor(() => expect(account.accountId).toBe(accountA));
    await userEvent
      .setup()
      .press(screen.getByRole("button", { name: "Blockout Pro" }));
    await screen.findByText("Native paywall");
    const active: CustomerInfo["entitlements"]["active"] =
      outcome === "active" ? { "Blockout Pro": entitlement() } : {};
    const all =
      outcome === "expired"
        ? { "Blockout Pro": entitlement({ isActive: false }) }
        : active;
    const info = customerInfo({
      active,
      all,
      verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
    });
    mockPurchases.getCustomerInfo.mockRejectedValue(
      new Error("read unavailable"),
    );

    // When
    await act(() => mockPaywall.onRestoreStarted!());
    await act(() => mockPaywall.onRestoreCompleted!({ customerInfo: info }));

    // Then
    if (outcome === "active") {
      expect(screen).toHavePathname("/");
      expect(pro.state.status).toBe("active");
    } else {
      expect(
        await screen.findByText(/Restauration terminée.*Aucun droit Pro actif/),
      ).toBeOnTheScreen();
      expect(pro.state.status).toBe("inactive");
      expect(
        screen.queryByRole("button", { name: "Vérifier mes droits" }),
      ).toBeNull();
    }
  },
);

it("reports a native restore failure without replacing the SDK view or replaying restoration", async () => {
  // Given
  const user = userEvent.setup();
  await renderProRoutes();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  mockAccountId = accountA;
  mockAuth0.webAuth.mockResolvedValue(credentialsFor(`auth0|${mockAccountId}`));
  mockAuth0.getCredentials.mockResolvedValue(
    credentialsFor(`auth0|${mockAccountId}`),
  );
  mockAuth0.saveCredentials.mockResolvedValue();
  await act(() => account.signIn("https://api.example.invalid"));
  await waitFor(() => expect(account.accountId).toBe(accountA));
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native paywall");

  // When
  await act(() => mockPaywall.onRestoreStarted!());
  await act(() =>
    mockPaywall.onRestoreError!({
      error: {
        code: mockPurchases.PURCHASES_ERROR_CODE.NETWORK_ERROR,
        message: "private provider data",
        readableErrorCode: "NETWORK_ERROR",
        underlyingErrorMessage: "private provider data",
        userCancelled: false,
        userInfo: { readableErrorCode: "NETWORK_ERROR" },
      },
    }),
  );

  // Then
  expect(
    await screen.findByText(
      "Une erreur est survenue. Veuillez réessayer plus tard.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByText("Native paywall")).toBeOnTheScreen();
  expect(pro.state).toMatchObject({ status: "inactive", operation: "failed" });
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
  expect(screen.queryByText(/private provider data/)).toBeNull();
});

it("restores explicitly without an offer or prior purchase and preserves receipt scope information", async () => {
  // Given
  const user = userEvent.setup();
  mockPurchases.getOfferings.mockResolvedValue({ current: null, all: {} });
  await renderProRoutes();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  mockAccountId = accountA;
  mockAuth0.webAuth.mockResolvedValue(credentialsFor(`auth0|${mockAccountId}`));
  mockAuth0.getCredentials.mockResolvedValue(
    credentialsFor(`auth0|${mockAccountId}`),
  );
  mockAuth0.saveCredentials.mockResolvedValue();
  await act(() => account.signIn("https://api.example.invalid"));
  await waitFor(() => expect(account.accountId).toBe(accountA));
  await userEvent
    .setup()
    .press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByRole("header", { name: "Aucune offre Pro disponible" });
  expect(screen.getByText(/reçu entier/)).toBeOnTheScreen();
  const result = Promise.withResolvers<CustomerInfo>();
  mockPurchases.restorePurchases.mockReturnValueOnce(result.promise);

  // When
  await user.press(
    screen.getByRole("button", { name: "Restaurer mes achats" }),
  );
  expect(mockPurchases.restorePurchases).toHaveBeenCalledTimes(1);
  const info = customerInfo({
    active: {},
    all: {},
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  await act(() => result.resolve(info));

  // Then
  expect(
    await screen.findByText(/Restauration terminée.*Aucun droit Pro actif/),
  ).toBeOnTheScreen();
  expect(pro.state.status).toBe("inactive");
});

it("keeps unknown rights restorable after association, without an offering read", async () => {
  // Given
  const user = userEvent.setup();
  mockPurchases.getCustomerInfo.mockRejectedValue(new Error("unavailable"));
  await renderProRoutes();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  mockAccountId = accountA;
  mockAuth0.webAuth.mockResolvedValue(credentialsFor(`auth0|${mockAccountId}`));
  mockAuth0.getCredentials.mockResolvedValue(
    credentialsFor(`auth0|${mockAccountId}`),
  );
  mockAuth0.saveCredentials.mockResolvedValue();
  await act(() => account.signIn("https://api.example.invalid"));
  await waitFor(() => expect(account.accountId).toBe(accountA));
  await userEvent
    .setup()
    .press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Une erreur est survenue");
  const active = { "Blockout Pro": entitlement() };
  mockPurchases.restorePurchases.mockResolvedValueOnce(
    customerInfo({
      active,
      all: active,
      verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
    }),
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Restaurer mes achats" }),
  );

  // Then
  await waitFor(() => expect(pro.state.status).toBe("active"));
  expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
});

it.each([
  { label: "the same account", nextAccount: accountA },
  {
    label: "another account",
    nextAccount: "00000000-0000-4000-8000-000000000319",
  },
])(
  "rejects an interrupted restore across guest and return to $label without replay",
  async ({ nextAccount }) => {
    // Given
    const user = userEvent.setup();
    mockPurchases.getOfferings.mockResolvedValue({ current: null, all: {} });
    await renderProRoutes();
    await waitFor(() => expect(account.status).toBe("authenticated"));
    mockAccountId = accountA;
    mockAuth0.webAuth.mockResolvedValue(
      credentialsFor(`auth0|${mockAccountId}`),
    );
    mockAuth0.getCredentials.mockResolvedValue(
      credentialsFor(`auth0|${mockAccountId}`),
    );
    mockAuth0.saveCredentials.mockResolvedValue();
    await act(() => account.signIn("https://api.example.invalid"));
    await waitFor(() => expect(account.accountId).toBe(accountA));
    await userEvent
      .setup()
      .press(screen.getByRole("button", { name: "Blockout Pro" }));
    await screen.findByRole("button", { name: "Restaurer mes achats" });
    const result = Promise.withResolvers<CustomerInfo>();
    mockPurchases.restorePurchases.mockReturnValueOnce(result.promise);
    await user.press(
      screen.getByRole("button", { name: "Restaurer mes achats" }),
    );

    // When
    await act(() => account.clearCredentials());
    mockAccountId = nextAccount;
    mockAuth0.webAuth.mockResolvedValue(
      credentialsFor(`auth0|${mockAccountId}`),
    );
    mockAuth0.getCredentials.mockResolvedValue(
      credentialsFor(`auth0|${mockAccountId}`),
    );
    mockAuth0.saveCredentials.mockResolvedValue();
    await act(() => account.signIn("https://api.example.invalid"));
    await waitFor(() => expect(account.accountId).toBe(nextAccount));
    const active = { "Blockout Pro": entitlement() };
    await act(() =>
      result.resolve(
        customerInfo({
          active,
          all: active,
          verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
        }),
      ),
    );

    // Then
    expect(pro.state.status).toBe("inactive");
    expect(mockPurchases.restorePurchases).toHaveBeenCalledTimes(1);
  },
);

it("consumes restoration from active native management without purchasing", async () => {
  // Given
  const active = { "Blockout Pro": entitlement() };
  const info = customerInfo({
    active,
    all: active,
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  mockPurchases.getCustomerInfo.mockResolvedValue(info);
  await renderProRoutes();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  mockAccountId = accountA;
  mockAuth0.webAuth.mockResolvedValue(credentialsFor(`auth0|${mockAccountId}`));
  mockAuth0.getCredentials.mockResolvedValue(
    credentialsFor(`auth0|${mockAccountId}`),
  );
  mockAuth0.saveCredentials.mockResolvedValue();
  await act(() => account.signIn("https://api.example.invalid"));
  await waitFor(() => expect(account.accountId).toBe(accountA));
  await userEvent
    .setup()
    .press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native management");

  // When
  await act(() => mockCenter.onRestoreStarted!());
  await act(() => mockCenter.onRestoreCompleted!({ customerInfo: info }));

  // Then
  expect(pro.state.status).toBe("active");
  expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
});

it("disables restoration until explicit association retry succeeds", async () => {
  // Given
  const user = userEvent.setup();
  mockPurchases.configure.mockImplementationOnce(() => {
    throw new Error("unavailable");
  });
  await renderProRoutes();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  mockAccountId = accountA;
  mockAuth0.webAuth.mockResolvedValue(credentialsFor(`auth0|${mockAccountId}`));
  mockAuth0.getCredentials.mockResolvedValue(
    credentialsFor(`auth0|${mockAccountId}`),
  );
  mockAuth0.saveCredentials.mockResolvedValue();
  await act(() => account.signIn("https://api.example.invalid"));
  await waitFor(() => expect(account.accountId).toBe(accountA));
  await userEvent
    .setup()
    .press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Une erreur est survenue");
  expect(
    screen.getByRole("button", { name: "Restaurer mes achats" }),
  ).toBeDisabled();
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByText("Native paywall")).toBeOnTheScreen();
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
});

it("reports a failed restore normally and retries only from a new explicit action", async () => {
  // Given
  const user = userEvent.setup();
  mockPurchases.getOfferings.mockResolvedValue({ current: null, all: {} });
  await renderProRoutes();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  mockAccountId = accountA;
  mockAuth0.webAuth.mockResolvedValue(credentialsFor(`auth0|${mockAccountId}`));
  mockAuth0.getCredentials.mockResolvedValue(
    credentialsFor(`auth0|${mockAccountId}`),
  );
  mockAuth0.saveCredentials.mockResolvedValue();
  await act(() => account.signIn("https://api.example.invalid"));
  await waitFor(() => expect(account.accountId).toBe(accountA));
  await userEvent
    .setup()
    .press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByRole("button", { name: "Restaurer mes achats" });
  mockPurchases.restorePurchases.mockRejectedValueOnce(
    new Error("private provider data"),
  );
  const read = Promise.withResolvers<CustomerInfo>();
  mockPurchases.getCustomerInfo.mockReturnValueOnce(read.promise);

  // When
  try {
    await user.press(
      screen.getByRole("button", { name: "Restaurer mes achats" }),
    );
    await screen.findByText(
      "Une erreur est survenue. Veuillez réessayer plus tard.",
    );

    // Then: a normal SDK read may remain pending without holding the failed action or its feedback.
    expect(
      screen.getByRole("button", { name: "Restaurer mes achats" }),
    ).toBeEnabled();
  } finally {
    await act(() =>
      read.resolve(
        customerInfo({
          active: {},
          all: {},
          verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
        }),
      ),
    );
  }

  // Then
  expect(
    screen.queryByRole("button", { name: "Vérifier mes droits" }),
  ).toBeNull();
  expect(screen.queryByText(/private provider data/)).not.toBeOnTheScreen();
  expect(mockPurchases.restorePurchases).toHaveBeenCalledTimes(1);
  expect(pro.state.status).toBe("inactive");

  // When
  await user.press(
    screen.getByRole("button", { name: "Restaurer mes achats" }),
  );

  // Then
  expect(mockPurchases.restorePurchases).toHaveBeenCalledTimes(2);
  expect(
    await screen.findByText(/Restauration terminée.*Aucun droit Pro actif/),
  ).toBeOnTheScreen();
});

it.each([
  { label: "the same account", nextAccount: accountA },
  {
    label: "another account",
    nextAccount: "00000000-0000-4000-8000-000000000319",
  },
])(
  "rejects retired native restore callbacks after guest and return to $label",
  async ({ nextAccount }) => {
    // Given
    await renderProRoutes();
    await waitFor(() => expect(account.status).toBe("authenticated"));
    mockAccountId = accountA;
    mockAuth0.webAuth.mockResolvedValue(
      credentialsFor(`auth0|${mockAccountId}`),
    );
    mockAuth0.getCredentials.mockResolvedValue(
      credentialsFor(`auth0|${mockAccountId}`),
    );
    mockAuth0.saveCredentials.mockResolvedValue();
    await act(() => account.signIn("https://api.example.invalid"));
    await waitFor(() => expect(account.accountId).toBe(accountA));
    await userEvent
      .setup()
      .press(screen.getByRole("button", { name: "Blockout Pro" }));
    await screen.findByText("Native paywall");
    const callbacks = mockPaywall;
    await act(() => callbacks.onRestoreStarted!());

    // When
    await act(() => account.clearCredentials());
    mockAccountId = nextAccount;
    mockAuth0.webAuth.mockResolvedValue(
      credentialsFor(`auth0|${mockAccountId}`),
    );
    mockAuth0.getCredentials.mockResolvedValue(
      credentialsFor(`auth0|${mockAccountId}`),
    );
    mockAuth0.saveCredentials.mockResolvedValue();
    await act(() => account.signIn("https://api.example.invalid"));
    await waitFor(() => expect(account.accountId).toBe(nextAccount));
    const active = { "Blockout Pro": entitlement() };
    await act(() =>
      callbacks.onRestoreCompleted!({
        customerInfo: customerInfo({
          active,
          all: active,
          verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
        }),
      }),
    );

    // Then
    expect(pro.state.status).toBe("inactive");
    expect(screen.queryByText("Native paywall")).not.toBeOnTheScreen();
    expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
  },
);

it.each(["empty", "cancelled"])(
  "preserves confirmed payment across an %s restoration and reopening",
  async (result) => {
    // Given
    const user = userEvent.setup();
    await renderProRoutes();
    await waitFor(() => expect(account.status).toBe("authenticated"));
    mockAccountId = accountA;
    mockAuth0.webAuth.mockResolvedValue(
      credentialsFor(`auth0|${mockAccountId}`),
    );
    mockAuth0.getCredentials.mockResolvedValue(
      credentialsFor(`auth0|${mockAccountId}`),
    );
    mockAuth0.saveCredentials.mockResolvedValue();
    await act(() => account.signIn("https://api.example.invalid"));
    await waitFor(() => expect(account.accountId).toBe(accountA));
    await userEvent
      .setup()
      .press(screen.getByRole("button", { name: "Blockout Pro" }));
    await screen.findByText("Native paywall");
    await act(() => pro.completeOperation("purchased"));
    await screen.findByText(/Paiement confirmé/);
    if (result === "empty") {
      mockPurchases.restorePurchases.mockResolvedValueOnce(
        customerInfo({
          active: {},
          all: {},
          verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
        }),
      );
    } else {
      mockPurchases.restorePurchases.mockRejectedValueOnce({
        code: mockPurchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR,
      });
    }

    // When
    await user.press(
      screen.getByRole("button", { name: "Restaurer mes achats" }),
    );
    await waitFor(() =>
      expect(mockPurchases.restorePurchases).toHaveBeenCalledTimes(1),
    );
    await screen.findByRole("button", {
      name: "Restaurer mes achats",
      busy: false,
    });
    await user.press(screen.getByRole("button", { name: "Retour" }));
    await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

    // Then
    expect(await screen.findByText(/Paiement confirmé/)).toBeOnTheScreen();
    expect(screen.queryByText("Native paywall")).not.toBeOnTheScreen();
  },
);

it("consumes SDK-purchased restore evidence without retaining resolved pending payment", async () => {
  // Given
  const user = userEvent.setup();
  await renderProRoutes();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  mockAccountId = accountA;
  mockAuth0.webAuth.mockResolvedValue(credentialsFor(`auth0|${mockAccountId}`));
  mockAuth0.getCredentials.mockResolvedValue(
    credentialsFor(`auth0|${mockAccountId}`),
  );
  mockAuth0.saveCredentials.mockResolvedValue();
  await act(() => account.signIn("https://api.example.invalid"));
  await waitFor(() => expect(account.accountId).toBe(accountA));
  await userEvent
    .setup()
    .press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native paywall");
  await act(() => pro.completeOperation("pending"));
  await user.press(
    screen.getByRole("button", { name: "Gérer ou restaurer mes achats" }),
  );
  await screen.findByText("Native management");
  const active = { "Blockout Pro": entitlement() };
  const info = customerInfo({
    active,
    all: active,
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  mockPurchases.getCustomerInfo.mockRejectedValue(new Error("unavailable"));

  // When
  await act(() => mockCenter.onRestoreStarted!());
  await act(() => mockCenter.onRestoreCompleted!({ customerInfo: info }));

  // Then
  expect(pro.state).toEqual(
    expect.objectContaining({ status: "active", operation: "completed" }),
  );
  expect(screen.queryByText(/Le paiement est en attente/)).toBeNull();
  expect(screen.queryByText("Native paywall")).not.toBeOnTheScreen();
});

it("keeps confirmed payment visible when a restore is still unfinished after route removal", async () => {
  // Given
  const user = userEvent.setup();
  await renderProRoutes();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  mockAccountId = accountA;
  mockAuth0.webAuth.mockResolvedValue(credentialsFor(`auth0|${mockAccountId}`));
  mockAuth0.getCredentials.mockResolvedValue(
    credentialsFor(`auth0|${mockAccountId}`),
  );
  mockAuth0.saveCredentials.mockResolvedValue();
  await act(() => account.signIn("https://api.example.invalid"));
  await waitFor(() => expect(account.accountId).toBe(accountA));
  await userEvent
    .setup()
    .press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native paywall");
  await act(() => pro.completeOperation("purchased"));
  const result = Promise.withResolvers<CustomerInfo>();
  mockPurchases.restorePurchases.mockReturnValueOnce(result.promise);
  await user.press(
    screen.getByRole("button", { name: "Restaurer mes achats" }),
  );
  await waitFor(() =>
    expect(mockPurchases.restorePurchases).toHaveBeenCalledTimes(1),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Retour" }));
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

  // Then
  expect(await screen.findByText(/Paiement confirmé/)).toBeOnTheScreen();
  expect(screen.queryByText("Native paywall")).not.toBeOnTheScreen();
  await act(() =>
    result.resolve(
      customerInfo({
        active: {},
        all: {},
        verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    ),
  );
  expect(screen.getByText(/Paiement confirmé/)).toBeOnTheScreen();
});

it.each(["direct", "customer center"])(
  "preserves a payment confirmed while %s restoration is in flight",
  async (source) => {
    // Given
    const user = userEvent.setup();
    await renderProRoutes();
    await waitFor(() => expect(account.status).toBe("authenticated"));
    mockAccountId = accountA;
    mockAuth0.webAuth.mockResolvedValue(
      credentialsFor(`auth0|${mockAccountId}`),
    );
    mockAuth0.getCredentials.mockResolvedValue(
      credentialsFor(`auth0|${mockAccountId}`),
    );
    mockAuth0.saveCredentials.mockResolvedValue();
    await act(() => account.signIn("https://api.example.invalid"));
    await waitFor(() => expect(account.accountId).toBe(accountA));
    await userEvent
      .setup()
      .press(screen.getByRole("button", { name: "Blockout Pro" }));
    await screen.findByText("Native paywall");
    await act(() => pro.completeOperation("pending"));
    const result = Promise.withResolvers<CustomerInfo>();
    mockPurchases.restorePurchases.mockReturnValueOnce(result.promise);
    if (source === "direct") {
      await user.press(
        screen.getByRole("button", { name: "Restaurer mes achats" }),
      );
    } else {
      await user.press(
        screen.getByRole("button", { name: "Gérer ou restaurer mes achats" }),
      );
      await screen.findByText("Native management");
      await act(() => mockCenter.onRestoreStarted!());
    }

    // When
    await act(() => pro.completeOperation("purchased"));
    const empty = customerInfo({
      active: {},
      all: {},
      verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
    });
    if (source === "direct") {
      await act(() => result.resolve(empty));
    } else {
      await act(() => mockCenter.onRestoreCompleted!({ customerInfo: empty }));
    }

    // Then
    expect(await screen.findByText(/Paiement confirmé/)).toBeOnTheScreen();
    expect(pro.state).toEqual({ status: "inactive", operation: "purchased" });
  },
);
