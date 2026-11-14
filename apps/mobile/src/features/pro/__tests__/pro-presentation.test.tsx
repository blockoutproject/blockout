import { accountResponse as mockAccountResponse } from "@/features/accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
import { router } from "expo-router";
import { SignInInvitationScreen } from "@/features/accounts/screens/sign-in-invitation-screen";
import { renderRouter } from "expo-router/testing-library";
import { useEffect, useState, type ComponentProps } from "react";
import type RevenueCatUI from "react-native-purchases-ui";
import type { AccountSession } from "@/features/accounts";
import {
  AccountSessionProvider,
  useAccountSession,
} from "@/features/accounts/session/account-session-provider";
import { createQueryClient } from "@/shared/query/query-client";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { ActionFeedbackProvider } from "@/shared/components/action-feedback";
import { ProProvider, usePro, type ProContext } from "../pro-provider";
import { ProProfileEntry } from "../components/pro-profile-entry";
import * as proSessionModule from "../pro-session";
import { prepareProNativeIO } from "../test-support/pro-harness";
import { mockPurchases } from "../test-support/native-purchases";
import { customerInfo, entitlement } from "../test-support/customer-info";
import { defaultOffering } from "../test-support/offering";

jest.mock("expo/fetch", () => ({
  fetch: jest.fn((url: RequestInfo | URL) =>
    Promise.resolve(
      String(url).endsWith("/accounts/me") && mockAccountId !== undefined
        ? Response.json(mockAccountResponse({ accountId: mockAccountId }))
        : new Response(null, { status: 404 }),
    ),
  ),
}));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        revenueCat: { iosApiKey: "test_public", offeringIdentifier: "default" },
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
        return <Text>Native paywall double</Text>;
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
let mockAccountId: string | undefined;
let account: AccountSession;
let pro: ProContext;
let client = createQueryClient();
let setPresentationEnabled: (enabled: boolean) => void;
const environment = { ...process.env };
const accountA = "00000000-0000-4000-8000-000000000251";
beforeEach(() => {
  mockAccountId = undefined;
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
  });
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  mockPurchases.getOfferings
    .mockReset()
    .mockResolvedValue({ current: null, all: { default: defaultOffering } });
  client = createQueryClient();
});
afterEach(async () => {
  await cleanup();
  client.clear();
  jest.restoreAllMocks();
  process.env = { ...environment };
});

/** Real account and SDK state owners; native I/O and the provider view alone are controlled. */
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
      <Text>Originating screen</Text>
      <Text>Pro: {p.state.status}</Text>
      <ProProfileEntry />
    </ActionFeedbackProvider>
  );
}

function Owners({ children }: Readonly<{ children: React.ReactNode }>) {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    setPresentationEnabled = setEnabled;
  }, []);
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AccountSessionProvider>
          <ProProvider presentationEnabled={enabled}>{children}</ProProvider>
        </AccountSessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

async function mount() {
  return renderRouter(
    {
      index: Journey,
      "sign-in-invitation": () => (
        <SignInInvitationScreen
          admitted
          message="Connectez-vous pour utiliser Blockout Pro"
        />
      ),
    },
    { initialUrl: "/", wrapper: Owners },
  );
}

/** Establishes the scenario's actual business account through the public F05 sign-in command. */
async function signIn(accountId = accountA) {
  mockAccountId = accountId;
  mockAuth0.webAuth.mockResolvedValue(credentialsFor(`auth0|${accountId}`));
  mockAuth0.getCredentials.mockResolvedValue(
    credentialsFor(`auth0|${accountId}`),
  );
  mockAuth0.saveCredentials.mockResolvedValue();
  await act(() => account.signIn("https://api.example.invalid"));
  await waitFor(() => expect(account.accountId).toBe(accountId));
}

it.each(["free", "paid", "gifted", "unknown"])(
  "opens the same explicit native offering for %s rights and dismisses to its origin",
  async (kind) => {
    // Given
    if (kind === "unknown") {
      mockPurchases.getCustomerInfo.mockRejectedValue(new Error("unavailable"));
    } else if (kind !== "free") {
      const active = {
        "Blockout Pro": entitlement({
          store: kind === "gifted" ? "PROMOTIONAL" : "APP_STORE",
        }),
      };
      mockPurchases.getCustomerInfo.mockResolvedValue(
        customerInfo({
          active,
          all: active,
          verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
        }),
      );
    }
    await mount();
    await waitFor(() => expect(account.status).toBe("authenticated"));
    await signIn();
    const user = userEvent.setup();

    // When
    await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

    // Then
    await screen.findByText("Native paywall double");
    expect(mockPaywall.options?.offering).toBe(defaultOffering);
    expect(mockPaywall.options?.displayCloseButton).toBe(true);
    expect(screen).toHavePathname("/");
    expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(1);

    // When
    await act(() => mockPaywall.onDismiss?.());

    // Then
    expect(screen.queryByText("Native paywall double")).toBeNull();
    expect(screen.getByText("Originating screen")).toBeOnTheScreen();
    expect(screen).toHavePathname("/");
  },
);

it.each(["missing", "failed"])(
  "keeps the origin with ordinary feedback after a %s offering, then permits another explicit opening",
  async (kind) => {
    // Given
    await mount();
    await waitFor(() => expect(account.status).toBe("authenticated"));
    await signIn();
    if (kind === "missing") {
      mockPurchases.getOfferings.mockResolvedValueOnce({
        current: defaultOffering,
        all: {},
      });
    } else {
      mockPurchases.getOfferings.mockRejectedValueOnce(
        new Error("private provider data"),
      );
    }
    const user = userEvent.setup();

    // When
    await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

    // Then
    await screen.findByRole("alert");
    expect(screen.queryByText("Native paywall double")).toBeNull();
    expect(screen.getByText("Originating screen")).toBeOnTheScreen();

    // When
    await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

    // Then
    await screen.findByText("Native paywall double");
    expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(2);
  },
);

it("awaits current association but opens while the ordinary rights read is unresolved", async () => {
  // Given
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  const configuration = Promise.withResolvers<boolean>();
  mockPurchases.isConfigured.mockReturnValueOnce(configuration.promise);
  const read =
    Promise.withResolvers<
      Awaited<ReturnType<typeof mockPurchases.getCustomerInfo>>
    >();
  mockPurchases.getCustomerInfo.mockReturnValueOnce(read.promise);
  await signIn();
  const user = userEvent.setup();

  // When
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

  // Then
  expect(mockPurchases.getOfferings).not.toHaveBeenCalled();

  // When
  await act(() => configuration.resolve(false));

  // Then
  await screen.findByText("Native paywall double");
  expect(pro.state).toMatchObject({
    status: "unavailable",
    reason: "customer-info",
  });
});

it.each(["logout", "replacement"])(
  "unmounts the Modal on %s and rejects the retired view's outcomes",
  async (departure) => {
    // Given
    await mount();
    await waitFor(() => expect(account.status).toBe("authenticated"));
    await signIn();
    const user = userEvent.setup();
    await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
    await screen.findByText("Native paywall double");
    const retired = mockPaywall;
    expect(
      screen.getByTestId("pro-paywall-modal", { includeHiddenElements: true }),
    ).toBeOnTheScreen();

    // When
    if (departure === "replacement") {
      await signIn("00000000-0000-4000-8000-000000000252");
    } else {
      // F05 uses the same local credential-cleanup boundary after accepted erasure.
      await act(() => account.clearCredentials());
    }
    const active = { "Blockout Pro": entitlement() };
    await act(() =>
      retired.onRestoreCompleted?.({
        customerInfo: customerInfo({
          active,
          all: active,
          verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
        }),
      }),
    );

    // Then
    expect(screen.queryByText("Native paywall double")).toBeNull();
    expect(
      screen.queryByTestId("pro-paywall-modal", {
        includeHiddenElements: true,
      }),
    ).toBeNull();
    expect(pro.state.status).not.toBe("active");
    expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
  },
);

it("discards an offering returned after its account departs", async () => {
  // Given
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await signIn();
  const offering =
    Promise.withResolvers<
      Awaited<ReturnType<typeof mockPurchases.getOfferings>>
    >();
  mockPurchases.getOfferings.mockReturnValueOnce(offering.promise);
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

  // When
  await act(() => account.clearCredentials());
  await act(() =>
    offering.resolve({ current: null, all: { default: defaultOffering } }),
  );

  // Then
  expect(screen.queryByText("Native paywall double")).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
});

it("reopens after dismissal without waiting for disposed-view callbacks and leaves subsequent rights to the SDK listener", async () => {
  // Given
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await signIn();
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native paywall double");
  const retired = mockPaywall;
  await act(() => retired.onDismiss?.());

  // When
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

  // Then
  await screen.findByText("Native paywall double");
  expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(2);

  // When
  await act(() => retired.onDismiss?.());
  const active = { "Blockout Pro": entitlement({ store: "APP_STORE" }) };
  const paid = customerInfo({
    active,
    all: active,
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  mockPurchases.getCustomerInfo.mockResolvedValue(paid);
  const listener =
    mockPurchases.addCustomerInfoUpdateListener.mock.calls.at(-1)?.[0];
  if (!listener) {
    throw new Error("Expected current SDK listener");
  }
  await act(() => listener(paid));

  // Then
  expect(screen.getByText("Native paywall double")).toBeOnTheScreen();
  expect(pro.state.status).toBe("active");
});

it("uses ordinary native purchase/restore failures and supplied restore rights without an app restore or verification gate", async () => {
  // Given
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await signIn();
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native paywall double");
  const error = {
    code: mockPurchases.PURCHASES_ERROR_CODE.NETWORK_ERROR,
    message: "private provider data",
    readableErrorCode: "NETWORK_ERROR",
    underlyingErrorMessage: "",
    userInfo: { readableErrorCode: "NETWORK_ERROR" },
    userCancelled: false,
  };

  // When
  await act(() => mockPaywall.onPurchaseError?.({ error }));
  await act(() => mockPaywall.onRestoreError?.({ error }));

  // Then
  expect(pro.state).toMatchObject({ status: "inactive", operation: "failed" });
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText("Native paywall double")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Vérifier mes droits" }),
  ).toBeNull();
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();

  // When
  const active = { "Blockout Pro": entitlement({ store: "APP_STORE" }) };
  const reads = mockPurchases.getCustomerInfo.mock.calls.length;
  await act(() =>
    mockPaywall.onRestoreCompleted?.({
      customerInfo: customerInfo({
        active,
        all: active,
        verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    }),
  );

  // Then
  expect(pro.state.status).toBe("active");
  expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(reads);
});

it("removes the native Modal when ordinary access is withdrawn, including an in-flight opening", async () => {
  // Given
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await signIn();
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native paywall double");
  const retired = mockPaywall;

  // When
  await act(() => setPresentationEnabled(false));
  await act(() => retired.onDismiss?.());

  // Then
  expect(
    screen.queryByTestId("pro-paywall-modal", { includeHiddenElements: true }),
  ).toBeNull();

  // When
  await act(() => setPresentationEnabled(true));
  const offering =
    Promise.withResolvers<
      Awaited<ReturnType<typeof mockPurchases.getOfferings>>
    >();
  mockPurchases.getOfferings.mockReturnValueOnce(offering.promise);
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await act(() => setPresentationEnabled(false));
  await act(() => setPresentationEnabled(true));
  await act(() =>
    offering.resolve({ current: null, all: { default: defaultOffering } }),
  );

  // Then
  expect(
    screen.queryByTestId("pro-paywall-modal", { includeHiddenElements: true }),
  ).toBeNull();
});

it("keeps the guest invitation without retaining an automatic paywall opening after sign-in", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  await mount();
  await waitFor(() => expect(account.status).toBe("guest"));
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Connectez-vous pour utiliser Blockout Pro");

  // When
  await signIn();

  // Then
  expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
  expect(
    screen.queryByTestId("pro-paywall-modal", { includeHiddenElements: true }),
  ).toBeNull();

  // When
  await act(() => router.back());
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

  // Then
  expect(await screen.findByText("Native paywall double")).toBeOnTheScreen();
  expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(1);
});

it("reports failed association at the origin and permits another explicit opening after association succeeds", async () => {
  // Given
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  mockPurchases.isConfigured.mockRejectedValue(
    new Error("Private SDK setup failure"),
  );
  await signIn();
  await waitFor(() =>
    expect(pro.state).toMatchObject({
      status: "unavailable",
      reason: "association-failed",
    }),
  );
  const user = userEvent.setup();

  // When
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

  // Then
  await screen.findByRole("alert");
  expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
  expect(
    screen.queryByTestId("pro-paywall-modal", { includeHiddenElements: true }),
  ).toBeNull();

  // When
  mockPurchases.isConfigured.mockResolvedValue(true);
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

  // Then
  expect(await screen.findByText("Native paywall double")).toBeOnTheScreen();
});

it("discards a slower prior opening after the latest explicit paywall was dismissed", async () => {
  // Given
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await signIn();
  const first =
    Promise.withResolvers<
      Awaited<ReturnType<typeof mockPurchases.getOfferings>>
    >();
  const latest =
    Promise.withResolvers<
      Awaited<ReturnType<typeof mockPurchases.getOfferings>>
    >();
  mockPurchases.getOfferings
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(latest.promise);
  const user = userEvent.setup();
  const entry = screen.getByRole("button", { name: "Blockout Pro" });
  await user.press(entry);
  await user.press(entry);

  // When
  await act(() =>
    latest.resolve({ current: null, all: { default: defaultOffering } }),
  );
  await screen.findByText("Native paywall double");
  await act(() => mockPaywall.onDismiss?.());
  await act(() =>
    first.resolve({ current: null, all: { default: defaultOffering } }),
  );

  // Then
  expect(
    screen.queryByTestId("pro-paywall-modal", { includeHiddenElements: true }),
  ).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByText("Originating screen")).toBeOnTheScreen();
});

it("dismisses the actual Modal through its native request-close event", async () => {
  // Given
  await mount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await signIn();
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native paywall double");

  // When
  await fireEvent(screen.getByTestId("pro-paywall-modal"), "requestClose");

  // Then
  expect(
    screen.queryByTestId("pro-paywall-modal", { includeHiddenElements: true }),
  ).toBeNull();
  expect(screen.getByText("Originating screen")).toBeOnTheScreen();
  expect(screen).toHavePathname("/");
});
