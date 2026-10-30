import { useQueryClient, QueryClientProvider } from "@tanstack/react-query";
import { signInAccount } from "../test-support/sign-in-account";
import * as proSessionModule from "../pro-session";
import type { PurchasesOfferings } from "react-native-purchases";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
import { renderRouter } from "expo-router/testing-library";
import { useEffect, useState, type ComponentProps } from "react";
import RevenueCatUI, {
  type CustomerCenterViewProps,
} from "react-native-purchases-ui";
import type { AccountSession } from "../../accounts";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { TECHNICAL_ERROR } from "../../../shared/components/error-copy";
import { ProProvider, usePro, type ProContext } from "../pro-provider";
import { ProProfileEntry } from "../components/pro-profile-entry";
import {
  ProPresentationScreen,
  type ProPresentationScreenProps,
} from "../screens/pro-presentation-screen";
import { prepareProNativeIO } from "../test-support/pro-harness";
import { mockPurchases } from "../test-support/native-purchases";
import { customerInfo, entitlement } from "../test-support/customer-info";
import { v2Offering } from "../test-support/offering";

jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));

const { PURCHASES_ERROR_CODE } = mockPurchases;
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        revenueCat: {
          iosApiKey: "test_public",
          offeringIdentifier: "v2",
          supportActionIdentifier: "f10-help",
        },
      },
    },
  },
}));
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => mockRouter,
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
        return <Text>Native paywall double</Text>;
      },
      CustomerCenterView: (props: CustomerCenterViewProps) => {
        mockCenter = props;
        return <Text>Native management double</Text>;
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
const mockRouter = {
  back: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  navigate: jest.fn(),
  canGoBack: jest.fn(() => true),
};
let account: AccountSession;
let pro: ProContext;
let client = createQueryClient();
const previousEnvironment = { ...process.env };
beforeEach(() => {
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "mobile-test";
  // A fresh real owner isolates tests; remounts within one scenario retain it.
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  client = createQueryClient();
  mockRouter.navigate.mockImplementation(() => openPresentation());
  mockRouter.back.mockImplementation(() => closePresentation());
  mockPurchases.getOfferings
    .mockReset()
    .mockResolvedValue({ current: null, all: { v2: v2Offering } });
});
afterEach(async () => {
  await cleanup();
  client.clear();
  jest.restoreAllMocks();
  process.env = { ...previousEnvironment };
});
/** Real session/rights observers; only native SDK and navigation commands are controlled. */
function Probe() {
  useQueryClient().setQueryDefaults([], { retry: false, gcTime: Infinity });
  const a = useAccountSession();
  const p = usePro();
  useEffect(() => {
    account = a;
    pro = p;
  }, [a, p]);
  return <Text>Pro: {p.state.status}</Text>;
}
let openPresentation: () => void;
let closePresentation: () => void;
/** Separates explicit route mounting from account establishment without replacing either owner. */
function Journey(props: ProPresentationScreenProps) {
  const session = useAccountSession();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    openPresentation = () => setVisible(true);
    closePresentation = () => setVisible(false);
  }, []);
  return (
    <ActionFeedbackProvider scopeKey={session.subject ?? "guest"}>
      <Probe />
      <ProProfileEntry />
      {visible && <ProPresentationScreen {...props} />}
    </ActionFeedbackProvider>
  );
}
/** Mounts actual providers; each scenario explicitly establishes its account and chooses its entry. */
async function mount(props: ProPresentationScreenProps = { admitted: true }) {
  await renderRouter(
    { index: () => <Journey {...props} /> },
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
it("passes the explicit V2 offering to the native host and requests dismissal once", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000251"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
  );
  await screen.findByRole("button", { name: "Blockout Pro" });
  await user.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );
  await screen.findByText("Native paywall double");
  // When
  await act(() => {
    mockPaywall.onDismiss!();
    mockPaywall.onDismiss!();
  });
  const resume = jest.fn();
  await act(() =>
    mockPaywall.onPurchasePackageInitiated!({
      packageBeingPurchased: v2Offering.availablePackages[0],
      resume,
    }),
  );
  // Then
  expect(mockPaywall.options?.offering).toBe(v2Offering);
  expect(
    mockPaywall.options?.offering?.availablePackages[0].product.priceString,
  ).toBe("4,29 €");
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  expect(resume).toHaveBeenCalledWith(false);
});
it("refuses a repeated native initiation and shows confirmed payment without claiming inactive rights are active", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000251"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
  );
  await screen.findByRole("button", { name: "Blockout Pro" });
  await user.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );
  await screen.findByText("Native paywall double");
  const resume = jest.fn();
  const callbacks = mockPaywall;
  // When
  await act(() => {
    callbacks.onPurchasePackageInitiated!({
      packageBeingPurchased: v2Offering.availablePackages[0],
      resume,
    });
    callbacks.onPurchasePackageInitiated!({
      packageBeingPurchased: v2Offering.availablePackages[0],
      resume,
    });
  });
  mockPurchases.getCustomerInfo.mockRejectedValue(
    new Error("provider unavailable"),
  );
  await act(() =>
    callbacks.onPurchaseCompleted!({
      customerInfo: customerInfo({
        active: {},
        all: {},
        verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
      storeTransaction: {
        transactionIdentifier: "synthetic",
        productIdentifier: "monthly",
        purchaseDate: "2026-10-23",
        purchaseToken: null,
        originalJson: null,
        signature: null,
      },
    }),
  );
  // Then
  expect(resume.mock.calls).toEqual([[true], [false]]);
  expect(await screen.findByText(/Paiement confirmé/)).toBeOnTheScreen();
  expect(screen.queryByText(/Pro est actif/)).not.toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Gérer ou restaurer mes achats" }),
  ).toBeOnTheScreen();
});
it.each(["gift", "unknown"])(
  "routes %s rights to native management without looking up an offer",
  async (scenario) => {
    // Given
    const user = userEvent.setup();
    if (scenario === "gift") {
      const active = {
        "Blockout Pro": entitlement({ store: "PROMOTIONAL", willRenew: false }),
      };
      mockPurchases.getCustomerInfo.mockResolvedValue(
        customerInfo({
          active,
          all: active,
          verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
        }),
      );
    } else
      mockPurchases.getCustomerInfo.mockRejectedValue(new Error("unavailable"));
    await mount();
    await waitFor(() => expect(account.status).toBe("authenticated"));
    await act(() =>
      signInAccount(account, "00000000-0000-4000-8000-000000000251"),
    );
    await waitFor(() =>
      expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
    );
    await screen.findByRole("button", { name: "Blockout Pro" });
    await user.press(
      screen.getByRole("button", {
        name: "Blockout Pro",
      }),
    );
    if (scenario === "unknown") {
      await screen.findByText("Une erreur est survenue");
      await user.press(
        screen.getByRole("button", { name: "Gérer ou restaurer mes achats" }),
      );
    }
    await screen.findByText("Native management double");
    // When
    await act(() => pro.refresh());
    // Then
    expect(screen.getByText("Native management double")).toBeOnTheScreen();
    expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
  },
);
it("removes old-session native content and rejects old purchase and dismissal callbacks", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000251"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
  );
  await screen.findByRole("button", { name: "Blockout Pro" });
  await user.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );
  await screen.findByText("Native paywall double");
  const callbacks = mockPaywall;
  expect(callbacks.onPurchaseCancelled).toEqual(expect.any(Function));
  expect(callbacks.onDismiss).toEqual(expect.any(Function));
  // When
  await act(() => account.clearCredentials());
  const dismissals = mockRouter.back.mock.calls.length;
  await act(() => {
    callbacks.onPurchaseCancelled!();
    callbacks.onDismiss!();
  });
  // Then
  expect(screen.queryByText("Native paywall double")).not.toBeOnTheScreen();
  expect(mockRouter.back).toHaveBeenCalledTimes(dismissals);
  expect(pro.state.status).toBe("guest");
});
it("prepares only the identified F10 Custom Action with close-before-navigation and no attached payload", async () => {
  // Given: the destination is a controlled navigation boundary until #239/T032 implements it.
  const user = userEvent.setup();
  const support = jest.fn(() => expect(mockRouter.back).toHaveBeenCalled());
  await mount({ admitted: true, management: true, onSupport: support });
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000251"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
  );
  await screen.findByRole("button", { name: "Blockout Pro" });
  await user.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );
  await screen.findByText("Native management double");
  mockRouter.back.mockClear();
  // When
  await act(() => {
    mockCenter.onCustomActionSelected!({
      actionId: "other",
      purchaseIdentifier: "private",
    });
    mockCenter.onCustomActionSelected!({
      actionId: "f10-help",
      purchaseIdentifier: "private",
    });
  });
  // Then
  expect(support.mock.calls).toEqual([[]]);
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  // When
  const stale = mockCenter.onCustomActionSelected;
  await act(() => account.clearCredentials());
  await act(() => stale!({ actionId: "f10-help", purchaseIdentifier: null }));
  // Then
  expect(support.mock.calls).toEqual([[]]);
});
it.each(["absent", "failed"])(
  "keeps an %s offer on the Pro destination with honest feedback and no fallback",
  async (scenario) => {
    // Given
    const user = userEvent.setup();
    if (scenario === "absent")
      mockPurchases.getOfferings.mockResolvedValue({
        current: v2Offering,
        all: {},
      });
    else
      mockPurchases.getOfferings.mockRejectedValue(
        new Error("private provider data"),
      );
    await mount();
    await waitFor(() => expect(account.status).toBe("authenticated"));
    await act(() =>
      signInAccount(account, "00000000-0000-4000-8000-000000000251"),
    );
    await waitFor(() =>
      expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
    );
    await screen.findByRole("button", { name: "Blockout Pro" });
    // When
    await user.press(
      screen.getByRole("button", {
        name: "Blockout Pro",
      }),
    );
    // Then
    expect(
      await screen.findByText(
        scenario === "absent" ? /Aucune offre Pro/ : /Une erreur est survenue/,
      ),
    ).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(screen.queryByText("Native paywall double")).not.toBeOnTheScreen();
  },
);
it("keeps management independently reachable and leaves absent F10 integration unbound", async () => {
  // Given
  const user = userEvent.setup();
  await mount({ admitted: true, management: true });
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000251"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
  );
  await screen.findByRole("button", { name: "Blockout Pro" });
  await user.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );
  await screen.findByText("Native management double");
  // When
  await act(() => mockCenter.onDismiss!());
  // Then
  expect(mockRouter.navigate).toHaveBeenCalledWith("/pro");
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  expect(mockCenter.onCustomActionSelected).toBeUndefined();
});
it("rejects a late offering response after the opening session changes", async () => {
  // Given
  const user = userEvent.setup();
  const read = Promise.withResolvers<PurchasesOfferings>();
  mockPurchases.getOfferings.mockReturnValueOnce(read.promise);
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000251"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
  );
  await screen.findByRole("button", { name: "Blockout Pro" });
  await user.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );
  await waitFor(() =>
    expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(1),
  );
  // When
  await act(() => account.clearCredentials());
  await act(() => read.resolve({ current: null, all: { v2: v2Offering } }));
  // Then
  expect(screen.queryByText("Native paywall double")).not.toBeOnTheScreen();
  expect(pro.state.status).toBe("guest");
});
it.each([
  [PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR, /Le paiement est en attente/],
  [PURCHASES_ERROR_CODE.NETWORK_ERROR, TECHNICAL_ERROR],
  [PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR, TECHNICAL_ERROR],
  [
    PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR,
    /Le résultat de l’achat est incertain/,
  ],
  [
    PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR,
    /Cet achat est déjà détenu/,
  ],
  [PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR, TECHNICAL_ERROR],
] as const)(
  "presents native outcome %s without retrying payment",
  async (code, message) => {
    // Given
    const user = userEvent.setup();
    await mount();
    await waitFor(() => expect(account.status).toBe("authenticated"));
    await act(() =>
      signInAccount(account, "00000000-0000-4000-8000-000000000251"),
    );
    await waitFor(() =>
      expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
    );
    await screen.findByRole("button", { name: "Blockout Pro" });
    await user.press(
      screen.getByRole("button", {
        name: "Blockout Pro",
      }),
    );
    await screen.findByText("Native paywall double");
    // When
    await act(() =>
      mockPaywall.onPurchaseError!({
        error: {
          code,
          message: "private",
          readableErrorCode: "private",
          underlyingErrorMessage: "private",
          userInfo: { readableErrorCode: "private" },
          userCancelled: false,
        },
      }),
    );
    // Then
    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(screen.queryByText(/Pro est actif/)).not.toBeOnTheScreen();
    expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(1);
  },
);
it("returns to Profile only after the callback establishes current SDK-active rights", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000251"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
  );
  await screen.findByRole("button", { name: "Blockout Pro" });
  await user.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );
  await screen.findByText("Native paywall double");
  const active = { "Blockout Pro": entitlement() };
  mockPurchases.getCustomerInfo.mockRejectedValue(new Error("unavailable"));
  // When
  await act(() =>
    mockPaywall.onPurchaseCompleted!({
      customerInfo: customerInfo({
        active,
        all: active,
        verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
      storeTransaction: {
        transactionIdentifier: "synthetic",
        productIdentifier: "monthly",
        purchaseDate: "2026-10-23",
        purchaseToken: null,
        originalJson: null,
        signature: null,
      },
    }),
  );
  // Then
  expect(await screen.findByText("Pro: active")).toBeOnTheScreen();
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Native paywall double")).not.toBeOnTheScreen();
});
it("explicitly retries a failed offer on Pro and then opens the official component", async () => {
  // Given
  const user = userEvent.setup();
  mockPurchases.getOfferings.mockRejectedValueOnce(new Error("unavailable"));
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000251"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
  );
  await screen.findByRole("button", { name: "Blockout Pro" });
  await user.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );
  await screen.findByText(/Une erreur est survenue/);
  expect(mockRouter.navigate).toHaveBeenCalledWith("/pro");
  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  // Then
  expect(await screen.findByText("Native paywall double")).toBeOnTheScreen();
  expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(2);
  expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
});
it("does not reopen a cached paywall when a new destination offering read fails", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000251"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
  );
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native paywall double");
  await act(() => mockPaywall.onDismiss!());
  mockPurchases.getOfferings.mockRejectedValueOnce(new Error("unavailable"));
  // When
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  // Then
  expect(await screen.findByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();
  expect(screen.queryByText("Native paywall double")).not.toBeOnTheScreen();
  expect(mockRouter.navigate).toHaveBeenCalledTimes(2);
});
it("allows B's explicit entry while A's abandoned offering read is still pending", async () => {
  // Given
  const user = userEvent.setup();
  const oldRead = Promise.withResolvers<PurchasesOfferings>();
  mockPurchases.getOfferings.mockReturnValueOnce(oldRead.promise);
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000251"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
  );
  await screen.findByRole("button", { name: "Blockout Pro" });
  await user.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );
  // When
  await act(() => account.clearCredentials());
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000252"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000252"),
  );
  await screen.findByText("Pro: inactive");
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native paywall double");
  await act(() => oldRead.resolve({ current: null, all: { v2: v2Offering } }));
  // Then
  expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(2);
  expect(mockRouter.navigate).toHaveBeenCalledTimes(2);
  expect(screen.getByText("Pro: inactive")).toBeOnTheScreen();
});
it("retains a successful empty catalogue when its explicit destination retry fails", async () => {
  // Given
  const user = userEvent.setup();
  mockPurchases.getOfferings.mockResolvedValueOnce({ current: null, all: {} });
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000251"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
  );
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByRole("header", { name: "Aucune offre Pro disponible" });
  mockPurchases.getOfferings.mockRejectedValueOnce(new Error("unavailable"));
  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  // Then
  expect(
    await screen.findByRole("alert", {
      name: TECHNICAL_ERROR,
      includeHiddenElements: true,
    }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("header", { name: "Aucune offre Pro disponible" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Une erreur est survenue")).not.toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Gérer ou restaurer mes achats" }),
  ).toBeOnTheScreen();
  expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(2);
});
it("keeps unknown rights on Pro with retry and support rather than hiding the profile entry", async () => {
  // Given
  const user = userEvent.setup();
  const support = jest.fn(() =>
    expect(mockRouter.back).toHaveBeenCalledTimes(1),
  );
  mockPurchases.getCustomerInfo.mockRejectedValue(new Error("unavailable"));
  await mount({ admitted: true, onSupport: support });
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000251"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
  );
  expect(screen.queryByText("Une erreur est survenue")).not.toBeOnTheScreen();
  // When
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  // Then
  expect(await screen.findByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();
  expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
  expect(screen.queryByText("Native paywall double")).not.toBeOnTheScreen();
  // When
  await user.press(
    screen.getByRole("button", { name: "Contacter l’assistance" }),
  );
  // Then
  expect(support.mock.calls).toEqual([[]]);
});
it.each([
  ["pending", /Le paiement est en attente/],
  ["purchased", /Les droits liés à cet achat restent à vérifier/],
] as const)(
  "keeps %s visible despite an independent active gift",
  async (operation, message) => {
    // Given
    const user = userEvent.setup();
    const gift = {
      "Blockout Pro": entitlement({
        store: "PROMOTIONAL",
        ownershipType: "UNKNOWN",
        willRenew: false,
      }),
    };
    mockPurchases.getCustomerInfo.mockResolvedValue(
      customerInfo({
        active: gift,
        all: gift,
        verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    );
    await mount();
    await waitFor(() => expect(account.status).toBe("authenticated"));
    await act(() =>
      signInAccount(account, "00000000-0000-4000-8000-000000000251"),
    );
    await waitFor(() =>
      expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
    );
    await act(() => pro.completeOperation(operation));
    // When
    await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
    // Then
    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Vérifier mes droits" }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText("Native management double"),
    ).not.toBeOnTheScreen();
    expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
    // When
    await user.press(
      screen.getByRole("button", { name: "Gérer ou restaurer mes achats" }),
    );
    // Then
    expect(
      await screen.findByText("Native management double"),
    ).toBeOnTheScreen();
    expect(pro.state).toEqual(
      expect.objectContaining({ status: "active", operation }),
    );
  },
);
it("ignores dismissal and purchase initiation from a provider whose route was removed", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000251"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
  );
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native paywall double");
  const callbacks = mockPaywall;
  await act(() => closePresentation());
  const resume = jest.fn();
  // When
  await act(() => {
    callbacks.onDismiss!();
    callbacks.onPurchasePackageInitiated!({
      packageBeingPurchased: v2Offering.availablePackages[0],
      resume,
    });
  });
  // Then
  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(resume).toHaveBeenCalledWith(false);
  expect(screen.queryByText("Native paywall double")).not.toBeOnTheScreen();
});
it.each(["purchased", "cancelled", "pending", "failed"] as const)(
  "retains a late native %s outcome after route removal without navigating or publishing feedback",
  async (outcome) => {
    // Given: the real Pro owner survives the removed route, while native callbacks and reads are controlled.
    const user = userEvent.setup();
    await mount();
    await waitFor(() => expect(account.status).toBe("authenticated"));
    await act(() =>
      signInAccount(account, "00000000-0000-4000-8000-000000000251"),
    );
    await waitFor(() =>
      expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
    );
    await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
    await screen.findByText("Native paywall double");
    const callbacks = mockPaywall;
    const resume = jest.fn();
    await act(() =>
      callbacks.onPurchasePackageInitiated!({
        packageBeingPurchased: v2Offering.availablePackages[0],
        resume,
      }),
    );
    await act(() => closePresentation());
    await waitFor(() =>
      expect(pro.state).toEqual({ status: "inactive", operation: "uncertain" }),
    );
    mockPurchases.getCustomerInfo.mockRejectedValue(new Error("unavailable"));
    // When
    await act(() => {
      if (outcome === "purchased")
        callbacks.onPurchaseCompleted!({
          customerInfo: customerInfo({
            active: {},
            all: {},
            verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
          }),
          storeTransaction: {
            transactionIdentifier: "synthetic",
            productIdentifier: "monthly",
            purchaseDate: "2026-10-23",
            purchaseToken: null,
            originalJson: null,
            signature: null,
          },
        });
      else if (outcome === "cancelled") callbacks.onPurchaseCancelled!();
      else
        callbacks.onPurchaseError!({
          error: {
            code:
              outcome === "pending"
                ? PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR
                : PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR,
            message: "private",
            readableErrorCode: "private",
            underlyingErrorMessage: "private",
            userInfo: { readableErrorCode: "private" },
            userCancelled: false,
          },
        });
    });
    // Then
    await waitFor(() =>
      expect(pro.state).toEqual({ status: "inactive", operation: outcome }),
    );
    expect(resume).toHaveBeenCalledWith(true);
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(screen.queryByText("Native paywall double")).not.toBeOnTheScreen();
    expect(screen.queryByText(TECHNICAL_ERROR)).not.toBeOnTheScreen();
    // When
    await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
    // Then
    if (outcome === "purchased")
      expect(await screen.findByText(/Paiement confirmé/)).toBeOnTheScreen();
    else if (outcome === "pending")
      expect(
        await screen.findByText(/Le paiement est en attente/),
      ).toBeOnTheScreen();
    else
      expect(
        await screen.findByText("Native paywall double"),
      ).toBeOnTheScreen();
  },
);
it("returns quietly to Profile after cancellation and ignores the provider's later dismissal", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000251"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
  );
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native paywall double");
  const callbacks = mockPaywall;
  // When
  await act(() => {
    callbacks.onPurchaseCancelled!();
    callbacks.onDismiss!();
  });
  // Then
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Achat annulé.")).not.toBeOnTheScreen();
  expect(screen.queryByText("Native paywall double")).not.toBeOnTheScreen();
  expect(pro.state).toEqual({ status: "inactive", operation: "cancelled" });
});
it("ignores a retired offering retry after opening native management", async () => {
  // Given
  const user = userEvent.setup();
  mockPurchases.getOfferings.mockResolvedValueOnce({ current: null, all: {} });
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    signInAccount(account, "00000000-0000-4000-8000-000000000251"),
  );
  await waitFor(() =>
    expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
  );
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByRole("header", { name: "Aucune offre Pro disponible" });
  const retry = Promise.withResolvers<PurchasesOfferings>();
  mockPurchases.getOfferings.mockReturnValueOnce(retry.promise);
  try {
    await user.press(screen.getByRole("button", { name: "Réessayer" }));
    await waitFor(() =>
      expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(2),
    );
    // When
    await user.press(
      screen.getByRole("button", { name: "Gérer ou restaurer mes achats" }),
    );
    await screen.findByText("Native management double");
    await act(() => retry.reject(new Error("Offering unavailable")));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    // Then
    expect(screen.getByText("Native management double")).toBeOnTheScreen();
    expect(
      screen.queryByRole("alert", {
        name: TECHNICAL_ERROR,
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
  } finally {
    await act(() => retry.resolve({ current: null, all: {} }));
  }
});
