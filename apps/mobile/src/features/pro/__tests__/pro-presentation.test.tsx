import type { PurchasesOfferings } from "react-native-purchases";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
import { useEffect, useState, type ComponentProps } from "react";
import type RevenueCatUI from "react-native-purchases-ui";
import type { CustomerCenterViewProps } from "react-native-purchases-ui";
import type { AccountSession } from "../../accounts";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
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
  useFocusEffect: (callback: () => () => void) => {
    const { useEffect } = jest.requireActual("react");
    useEffect(() => {
      const cleanup = callback();
      mockLoseFocus = cleanup;
      return cleanup;
    }, [callback]);
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
let mockLoseFocus: (() => void) | undefined;
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
  prepareProNativeIO();
  client = createQueryClient();
  mockRouter.navigate.mockImplementation(() => openPresentation());
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
  const a = useAccountSession();
  const p = usePro();
  useEffect(() => {
    account = a;
    pro = p;
  }, [a, p]);
  return <Text>Pro: {p.state.status}</Text>;
}

let openPresentation: () => void;

/** Separates explicit route mounting from account establishment without replacing either owner. */
function Journey(props: ProPresentationScreenProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    openPresentation = () => setVisible(true);
  }, []);
  return (
    <>
      <Probe />
      <ProProfileEntry />
      {visible && <ProPresentationScreen {...props} />}
    </>
  );
}

/** Mounts actual providers; each scenario explicitly establishes its account and chooses its entry. */
async function mount(props: ProPresentationScreenProps = { admitted: true }) {
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AccountSessionProvider>
          <ProProvider>
            <Journey {...props} />
          </ProProvider>
        </AccountSessionProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  await waitFor(() => expect(account.status).toBe("authenticated"));
}

it("hosts the explicit V2 offering unchanged and dismisses to the originating profile", async () => {
  // Given
  await mount();
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000251",
    ),
  );
  await screen.findByRole("button", {
    name: "Gérer ou restaurer mes achats",
  });
  await userEvent.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );
  await screen.findByText("Native paywall double");

  // When
  await act(() => {
    mockPaywall.onDismiss?.();
    mockPaywall.onDismiss?.();
  });
  const resume = jest.fn();
  await act(() =>
    mockPaywall.onPurchasePackageInitiated?.({
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
  await mount();
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000251",
    ),
  );
  await screen.findByRole("button", {
    name: "Gérer ou restaurer mes achats",
  });
  await userEvent.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );
  await screen.findByText("Native paywall double");
  const resume = jest.fn();
  const callbacks = mockPaywall;

  // When
  await act(() => {
    callbacks.onPurchasePackageInitiated?.({
      packageBeingPurchased: v2Offering.availablePackages[0],
      resume,
    });
    callbacks.onPurchasePackageInitiated?.({
      packageBeingPurchased: v2Offering.availablePackages[0],
      resume,
    });
  });
  mockPurchases.getCustomerInfo.mockRejectedValue(
    new Error("provider unavailable"),
  );
  await act(() =>
    callbacks.onPurchaseCompleted?.({
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
    await act(() =>
      account.setAccount(
        account.generation,
        "00000000-0000-4000-8000-000000000251",
      ),
    );
    await screen.findByRole("button", {
      name: "Gérer ou restaurer mes achats",
    });
    await userEvent.press(
      screen.getByRole("button", {
        name: "Blockout Pro",
      }),
    );
    await screen.findByText("Native management double");

    // When
    await act(() => pro.refresh());

    // Then
    expect(screen.getByText("Native management double")).toBeOnTheScreen();
    expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
  },
);

it("removes old-session native content and rejects old purchase, dismissal and support callbacks", async () => {
  // Given
  await mount();
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000251",
    ),
  );
  await screen.findByRole("button", {
    name: "Gérer ou restaurer mes achats",
  });
  await userEvent.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );
  await screen.findByText("Native paywall double");
  const callbacks = mockPaywall;

  // When
  await act(() => account.invalidate());
  const dismissals = mockRouter.back.mock.calls.length;
  await act(() => {
    callbacks.onPurchaseCancelled?.();
    callbacks.onDismiss?.();
  });

  // Then
  expect(screen.queryByText("Native paywall double")).not.toBeOnTheScreen();
  expect(mockRouter.back).toHaveBeenCalledTimes(dismissals);
  expect(pro.state.status).toBe("unavailable");
});

it("prepares only the identified F10 Custom Action with close-before-navigation and no attached payload", async () => {
  // Given: the destination is a controlled navigation boundary until #239/T032 implements it.
  const support = jest.fn(() => expect(mockRouter.back).toHaveBeenCalled());
  await mount({ admitted: true, management: true, onSupport: support });
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000251",
    ),
  );
  await screen.findByRole("button", {
    name: "Gérer ou restaurer mes achats",
  });
  await userEvent.press(
    screen.getByRole("button", {
      name: "Gérer ou restaurer mes achats",
    }),
  );
  await screen.findByText("Native management double");
  mockRouter.back.mockClear();

  // When
  await act(() => {
    mockCenter.onCustomActionSelected?.({
      actionId: "other",
      purchaseIdentifier: "private",
    });
    mockCenter.onCustomActionSelected?.({
      actionId: "f10-help",
      purchaseIdentifier: "private",
    });
  });

  // Then
  expect(support.mock.calls).toEqual([[]]);
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  const stale = mockCenter.onCustomActionSelected;
  await act(() => account.invalidate());
  await act(() => stale?.({ actionId: "f10-help", purchaseIdentifier: null }));
  expect(support).toHaveBeenCalledTimes(1);
});

it.each(["absent", "failed"])(
  "keeps an %s offer on the profile with honest feedback and no fallback",
  async (scenario) => {
    // Given
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
    await act(() =>
      account.setAccount(
        account.generation,
        "00000000-0000-4000-8000-000000000251",
      ),
    );
    await screen.findByRole("button", {
      name: "Gérer ou restaurer mes achats",
    });
    await userEvent.press(
      screen.getByRole("button", {
        name: "Blockout Pro",
      }),
    );

    // When / Then
    expect(
      await screen.findByText(
        scenario === "absent"
          ? /Aucune offre Pro/
          : /La lecture de l’offre Pro a échoué/,
      ),
    ).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(screen.queryByText("Native paywall double")).not.toBeOnTheScreen();
  },
);

it("keeps management independently reachable and leaves absent F10 integration unbound", async () => {
  // Given
  await mount({ admitted: true, management: true });
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000251",
    ),
  );
  await screen.findByRole("button", {
    name: "Gérer ou restaurer mes achats",
  });
  await userEvent.press(
    screen.getByRole("button", {
      name: "Gérer ou restaurer mes achats",
    }),
  );
  await screen.findByText("Native management double");

  // When
  const user = userEvent.setup();
  await user.press(
    screen.getByRole("button", { name: "Gérer ou restaurer mes achats" }),
  );

  // Then
  expect(mockRouter.navigate).toHaveBeenCalledWith({
    pathname: "/pro",
    params: { management: "1" },
  });
  expect(mockCenter.onCustomActionSelected).toBeUndefined();
});

it("rejects a late offering response after the opening session changes", async () => {
  // Given
  const read = Promise.withResolvers<PurchasesOfferings>();
  mockPurchases.getOfferings.mockReturnValueOnce(read.promise);
  await mount();
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000251",
    ),
  );
  await screen.findByRole("button", {
    name: "Gérer ou restaurer mes achats",
  });
  await userEvent.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );
  await waitFor(() =>
    expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(1),
  );

  // When
  await act(() => account.invalidate());
  await act(() => read.resolve({ current: null, all: { v2: v2Offering } }));

  // Then
  expect(screen.queryByText("Native paywall double")).not.toBeOnTheScreen();
  expect(pro.state.status).toBe("unavailable");
});

it.each([
  [PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR, /Le paiement est en attente/],
  [PURCHASES_ERROR_CODE.NETWORK_ERROR, /L’achat n’a pas abouti/],
  [PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR, /L’achat n’a pas abouti/],
  [
    PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR,
    /Le résultat de l’achat est incertain/,
  ],
  [
    PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR,
    /Cet achat est déjà détenu/,
  ],
  [PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR, /L’achat n’a pas abouti/],
] as const)(
  "presents native outcome %s without retrying payment",
  async (code, message) => {
    // Given
    await mount();
    await act(() =>
      account.setAccount(
        account.generation,
        "00000000-0000-4000-8000-000000000251",
      ),
    );
    await screen.findByRole("button", {
      name: "Gérer ou restaurer mes achats",
    });
    await userEvent.press(
      screen.getByRole("button", {
        name: "Blockout Pro",
      }),
    );
    await screen.findByText("Native paywall double");

    // When
    await act(() =>
      mockPaywall.onPurchaseError?.({
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

it("announces only current SDK-active ad-free activation from the completion callback", async () => {
  // Given
  await mount();
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000251",
    ),
  );
  await screen.findByRole("button", {
    name: "Gérer ou restaurer mes achats",
  });
  await userEvent.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );
  await screen.findByText("Native paywall double");
  const active = { "Blockout Pro": entitlement() };
  mockPurchases.getCustomerInfo.mockRejectedValue(new Error("unavailable"));

  // When
  await act(() =>
    mockPaywall.onPurchaseCompleted?.({
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
  expect(
    await screen.findByText(
      /Blockout Pro est actif : les publicités Blockout sont désactivées/,
    ),
  ).toBeOnTheScreen();
  expect(screen.getByText("Pro: active")).toBeOnTheScreen();
});

it("keeps navigation usable while the offer loads and drops presentation intent on leaving the profile", async () => {
  // Given
  const read = Promise.withResolvers<PurchasesOfferings>();
  mockPurchases.getOfferings.mockReturnValueOnce(read.promise);
  await mount();
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000251",
    ),
  );
  await screen.findByRole("button", {
    name: "Gérer ou restaurer mes achats",
  });
  await userEvent.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );

  // When
  expect(screen.queryByText("Native paywall double")).not.toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Gérer ou restaurer mes achats" }),
  ).toBeEnabled();
  await act(() => mockLoseFocus?.());
  await act(() => read.resolve({ current: null, all: { v2: v2Offering } }));

  // Then
  expect(mockRouter.navigate).not.toHaveBeenCalled();
  expect(screen.queryByText("Native paywall double")).not.toBeOnTheScreen();
});

it("explicitly retries a failed offer from the profile and then opens the official component", async () => {
  // Given
  mockPurchases.getOfferings.mockRejectedValueOnce(new Error("unavailable"));
  await mount();
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000251",
    ),
  );
  await screen.findByRole("button", {
    name: "Gérer ou restaurer mes achats",
  });
  await userEvent.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );
  await screen.findByText(/La lecture de l’offre Pro a échoué/);
  expect(mockRouter.navigate).not.toHaveBeenCalled();

  // When
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByText("Native paywall double")).toBeOnTheScreen();
  expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(2);
  expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
});

it("does not reopen a cached paywall when a new explicit offering read fails", async () => {
  // Given
  await mount();
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000251",
    ),
  );
  await screen.findByRole("button", {
    name: "Gérer ou restaurer mes achats",
  });
  await userEvent.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );
  await screen.findByText("Native paywall double");
  await act(() => mockPaywall.onDismiss?.());
  mockRouter.navigate.mockClear();
  mockPurchases.getOfferings.mockRejectedValueOnce(new Error("unavailable"));

  // When
  await userEvent.press(screen.getByRole("button", { name: "Blockout Pro" }));

  // Then
  expect(
    await screen.findByText(/La lecture de l’offre Pro a échoué/),
  ).toBeOnTheScreen();
  expect(mockRouter.navigate).not.toHaveBeenCalled();
  expect(screen.queryByText("Native paywall double")).not.toBeOnTheScreen();
});

it("allows B's explicit entry while A's abandoned offering read is still pending", async () => {
  // Given
  const oldRead = Promise.withResolvers<PurchasesOfferings>();
  mockPurchases.getOfferings.mockReturnValueOnce(oldRead.promise);
  await mount();
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000251",
    ),
  );
  await screen.findByRole("button", {
    name: "Gérer ou restaurer mes achats",
  });
  await userEvent.press(
    screen.getByRole("button", {
      name: "Blockout Pro",
    }),
  );

  // When
  await act(() => account.invalidate());
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000252",
    ),
  );
  await screen.findByText("Pro: inactive");
  await userEvent.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native paywall double");
  await act(() => oldRead.resolve({ current: null, all: { v2: v2Offering } }));

  // Then
  expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(2);
  expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Pro: inactive")).toBeOnTheScreen();
});
