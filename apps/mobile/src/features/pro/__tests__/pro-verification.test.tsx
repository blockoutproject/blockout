import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import * as Sentry from "@sentry/react-native";
import type {
  CustomerInfo,
  PurchasesEntitlementInfo,
} from "react-native-purchases";
import type { AccountSession } from "../../accounts";
import type { ProContext } from "../pro-provider";
import { customerInfo, entitlement } from "../test-support/customer-info";
import { mockPurchases } from "../test-support/native-purchases";
import { prepareProNativeIO, ProHarness } from "../test-support/pro-harness";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { revenueCat: { iosApiKey: "test_public" } } },
  },
}));
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../test-support/native-purchases").mockPurchases,
}));
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

let account: AccountSession;
let pro: ProContext;
const support = jest.fn();
const originalDomain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
const originalClient = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
beforeEach(() => {
  prepareProNativeIO();
});
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  if (originalDomain === undefined) delete process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
  else process.env.EXPO_PUBLIC_AUTH0_DOMAIN = originalDomain;
  if (originalClient === undefined)
    delete process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
  else process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = originalClient;
});

/** Composes actual providers; usable-account publication is synthetic and no backend is contacted. */
async function mountAccount() {
  await render(
    <ProHarness
      capture={(a, p) => {
        account = a;
        pro = p;
      }}
      onSupport={support}
    />,
  );
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000001",
    ),
  );
  await screen.findByText("Pro: inactive");
}

it("does not turn an initial read failure or a failed retry into inactivity", async () => {
  // Given
  mockPurchases.getCustomerInfo.mockRejectedValue(new Error("private receipt"));
  await render(
    <ProHarness
      capture={(a, p) => {
        account = a;
        pro = p;
      }}
      onSupport={support}
    />,
  );
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000001",
    ),
  );
  await screen.findByRole("alert");

  // When
  const user = userEvent.setup();
  const retry = Promise.withResolvers<CustomerInfo>();
  mockPurchases.getCustomerInfo.mockReturnValueOnce(retry.promise);
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeDisabled();
  await act(() => retry.reject(new Error("private retry response")));

  // Then
  expect(await screen.findByRole("alert")).toHaveTextContent(/indisponible/);
  expect(screen.getByText("Pro: unavailable")).toBeOnTheScreen();
  expect(screen.queryByText("Pro: inactive")).not.toBeOnTheScreen();
  expect(screen.queryByText(/acheter|annul/i)).not.toBeOnTheScreen();
  const diagnostics = jest.mocked(Sentry.captureException).mock.calls;
  expect(diagnostics.length).toBeGreaterThan(0);
  expect(JSON.stringify(diagnostics)).not.toMatch(
    /private|receipt|customer|00000000/,
  );
});

it("keeps failed association unavailable, with explicit retry and independent support", async () => {
  // Given
  await mountAccount();
  mockPurchases.logIn.mockRejectedValueOnce(
    new Error("private customer payload"),
  );
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000002",
    ),
  );

  // When
  const message = await screen.findByRole("alert");
  const user = userEvent.setup();
  await user.press(
    screen.getByRole("button", { name: "Contacter l’assistance" }),
  );
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(message).toHaveTextContent(
    /La vérification de vos droits Pro est indisponible/,
  );
  expect(support).toHaveBeenCalledWith();
  expect(await screen.findByText("Pro: inactive")).toBeOnTheScreen();
  expect(screen.getByText("Public sport")).toBeOnTheScreen();
  expect(screen.queryByText(/acheter|annul|Pro actif/i)).not.toBeOnTheScreen();
});

it.each([
  { label: "renewal disabled", values: { willRenew: false } },
  {
    label: "billing grace",
    values: { billingIssueDetectedAt: "2026-01-15T00:00:00Z" },
  },
  { label: "gift", values: { store: "PROMOTIONAL", willRenew: false } },
] satisfies { label: string; values: Partial<PurchasesEntitlementInfo> }[])(
  "preserves SDK-active $label through failed verification and ordinary cancellation",
  async ({ values }) => {
    // Given: past dates intentionally do not define expiry; SDK-active is authoritative.
    await mountAccount();
    const active = { "Blockout Pro": entitlement(values) };
    mockPurchases.getCustomerInfo.mockResolvedValueOnce(
      customerInfo({
        active,
        all: active,
        verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    );
    await act(() => pro.refresh());
    expect(screen.getByText("Pro: active")).toBeOnTheScreen();
    mockPurchases.getCustomerInfo.mockRejectedValue(
      new Error("private provider response"),
    );

    // When
    await act(() => pro.completeOperation("cancelled"));

    // Then
    expect(screen.getByText("Pro: active")).toBeOnTheScreen();
    expect(screen.getByRole("alert")).toHaveTextContent(/indisponible/);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { feature: "pro", operation: "read", outcome: "failed" },
    });
    expect(screen.queryByText(/acheter|annul/i)).not.toBeOnTheScreen();
  },
);

it("accepts an SDK-inactive result without reconstructing historical rights", async () => {
  // Given
  await mountAccount();
  const all = { "Blockout Pro": entitlement({ isActive: false }) };
  mockPurchases.getCustomerInfo.mockResolvedValueOnce(
    customerInfo({
      active: {},
      all,
      verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
    }),
  );

  // When
  await act(() => pro.refresh());

  // Then
  expect(screen.getByText("Pro: inactive")).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
});

it.each(["pending", "uncertain"] as const)(
  "keeps %s operation feedback separate from active rights and never repeats a transaction",
  async (operation) => {
    // Given
    await mountAccount();
    const active = { "Blockout Pro": entitlement() };
    mockPurchases.getCustomerInfo.mockResolvedValue(
      customerInfo({
        active,
        all: active,
        verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    );

    // When
    await act(() => pro.completeOperation(operation));

    // Then
    expect(screen.getByText("Pro: active")).toBeOnTheScreen();
    expect(screen.getByRole("alert")).toHaveTextContent(/en attente|incertain/);
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { feature: "pro", operation: "operation", outcome: operation },
    });
  },
);
