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
import type { AccountSession } from "../../accounts";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { createQueryClient } from "../../../shared/query/query-client";
import { ProProvider, usePro, type ProContext } from "../pro-provider";
import { ProPresentationScreen } from "../screens/pro-presentation-screen";
import * as proSessionModule from "../pro-session";
import { prepareProNativeIO } from "../test-support/pro-harness";
import { mockPurchases } from "../test-support/native-purchases";
import { customerInfo, entitlement } from "../test-support/customer-info";
import { signInAccount } from "../test-support/sign-in-account";
import { v2Offering } from "../test-support/offering";

jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));
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
jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
let mockPaywall: ComponentProps<typeof RevenueCatUI.Paywall>;
let mockCenter: CustomerCenterViewProps;
let account: AccountSession;
let pro: ProContext;
let client = createQueryClient();
const previousEnvironment = { ...process.env };
const accountA = "00000000-0000-4000-8000-000000000318";
beforeEach(() => {
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
/** Establishes the scenario's usable account through the real F05 boundary. */
async function mount() {
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
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() => signInAccount(account, accountA));
  await waitFor(() => expect(account.accountId).toBe(accountA));
  await userEvent
    .setup()
    .press(screen.getByRole("button", { name: "Blockout Pro" }));
}
it.each(["none", "expired", "active"])(
  "consumes native paywall restore with %s rights without purchasing",
  async (outcome) => {
    // Given
    await mount();
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
    }
  },
);
it("restores explicitly without an offer or prior purchase and preserves receipt scope information", async () => {
  // Given
  const user = userEvent.setup();
  mockPurchases.getOfferings.mockResolvedValue({ current: null, all: {} });
  await mount();
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
  await mount();
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
it.each([accountA, "00000000-0000-4000-8000-000000000319"])(
  "rejects an interrupted restore across guest and return to %s without replay",
  async (nextAccount) => {
    // Given
    const user = userEvent.setup();
    mockPurchases.getOfferings.mockResolvedValue({ current: null, all: {} });
    await mount();
    await screen.findByRole("button", { name: "Restaurer mes achats" });
    const result = Promise.withResolvers<CustomerInfo>();
    mockPurchases.restorePurchases.mockReturnValueOnce(result.promise);
    await user.press(
      screen.getByRole("button", { name: "Restaurer mes achats" }),
    );

    // When
    await act(() => account.clearCredentials());
    await act(() => signInAccount(account, nextAccount));
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
  await mount();
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
  await mount();
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
it("keeps an uncertain restore distinct from no active rights and never replays it on verification", async () => {
  // Given
  const user = userEvent.setup();
  mockPurchases.getOfferings.mockResolvedValue({ current: null, all: {} });
  await mount();
  await screen.findByRole("button", { name: "Restaurer mes achats" });
  mockPurchases.restorePurchases.mockRejectedValueOnce(
    new Error("private provider data"),
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Restaurer mes achats" }),
  );
  await screen.findByText(/Le résultat de la restauration est incertain/);
  await user.press(screen.getByRole("button", { name: "Vérifier mes droits" }));

  // Then
  expect(
    screen.getByText(/Le résultat de la restauration est incertain/),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/private provider data/)).not.toBeOnTheScreen();
  expect(mockPurchases.restorePurchases).toHaveBeenCalledTimes(1);
  expect(pro.state.status).toBe("inactive");
});
it.each([accountA, "00000000-0000-4000-8000-000000000319"])(
  "rejects retired native restore callbacks after guest and return to %s",
  async (nextAccount) => {
    // Given
    await mount();
    await screen.findByText("Native paywall");
    const callbacks = mockPaywall;
    await act(() => callbacks.onRestoreStarted!());

    // When
    await act(() => account.clearCredentials());
    await act(() => signInAccount(account, nextAccount));
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
    await mount();
    await screen.findByText("Native paywall");
    await act(() => pro.completeOperation("purchased"));
    await screen.findByText(/Paiement confirmé/);
    if (result === "empty")
      mockPurchases.restorePurchases.mockResolvedValueOnce(
        customerInfo({
          active: {},
          all: {},
          verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
        }),
      );
    else
      mockPurchases.restorePurchases.mockRejectedValueOnce({
        code: mockPurchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR,
      });

    // When
    await user.press(
      screen.getByRole("button", { name: "Restaurer mes achats" }),
    );
    await waitFor(() =>
      expect(mockPurchases.restorePurchases).toHaveBeenCalledTimes(1),
    );
    await waitFor(() =>
      expect(pro.state).not.toEqual(
        expect.objectContaining({ operation: "restoring" }),
      ),
    );
    await user.press(screen.getByRole("button", { name: "Retour" }));
    await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

    // Then
    expect(await screen.findByText(/Paiement confirmé/)).toBeOnTheScreen();
    expect(screen.queryByText("Native paywall")).not.toBeOnTheScreen();
  },
);
it("consumes current native restore evidence while preserving a pending payment", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
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
    expect.objectContaining({ status: "active", operation: "pending" }),
  );
  expect(
    await screen.findByText(/Le paiement est en attente/),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Native paywall")).not.toBeOnTheScreen();
});
it("keeps confirmed payment visible when a restore is still unfinished after route removal", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
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
