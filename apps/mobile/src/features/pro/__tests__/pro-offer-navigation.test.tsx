import { useLayoutEffect, type PropsWithChildren } from "react";
import { Text } from "react-native";
import { Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import TabsLayout from "../../../app/(ordinary)/(tabs)/_layout";
import {
  AccountSessionProvider,
  useAccountSession,
  type AccountSession,
} from "../../accounts/session/account-session-provider";
import { mockAuth0 } from "../../accounts/test-support/native-auth0";
import { accountResponse as mockAccountResponse } from "../../accounts/test-support/account-response";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse as mockApplicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ProProvider, usePro, type ProContext } from "../pro-provider";
import * as proSessionModule from "../pro-session";
import { customerInfo, entitlement } from "../test-support/customer-info";
import { mockPurchases } from "../test-support/native-purchases";
import { prepareProNativeIO } from "../test-support/pro-harness";

jest.mock("expo/fetch", () => ({
  fetch: jest.fn(async (url: RequestInfo | URL) =>
    Response.json(
      String(url).endsWith("/application-access")
        ? mockApplicationAccessResponse()
        : mockAccountResponse(),
    ),
  ),
}));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: { revenueCat: { iosApiKey: "test_public" } },
    },
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

const offerName = "Blockout Pro, sans publicité";
const environment = { ...process.env };
let client = createQueryClient();
let account: AccountSession;
let pro: ProContext;

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "mobile-test";
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  mockPurchases.getOfferings.mockReset();
  client = createQueryClient();
});

afterEach(async () => {
  await cleanup();
  client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Real session, SDK-state consumption, access query and theme; only native I/O and HTTP are controlled. */
function JourneyProviders({ children }: Readonly<PropsWithChildren>) {
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AccountSessionProvider>
          <ApplicationAccessProvider>
            <ProProvider>{children}</ProProvider>
          </ApplicationAccessProvider>
        </AccountSessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Captures public lifecycle commands without replacing the providers or Router behavior under test. */
function JourneyLayout() {
  useQueryClient().setQueryDefaults([], { retry: false, gcTime: Infinity });
  const currentAccount = useAccountSession();
  const currentPro = usePro();
  useLayoutEffect(() => {
    account = currentAccount;
    pro = currentPro;
  }, [currentAccount, currentPro]);
  return <Stack screenOptions={{ headerShown: false, animation: "none" }} />;
}

/** Uses the production tab composition; leaf probes identify navigation without unrelated feature dependencies. */
async function openJourney(initialUrl = "/search") {
  await renderRouter(
    {
      _layout: JourneyLayout,
      "(tabs)/_layout": TabsLayout,
      "(tabs)/index": () => <Text>Home destination</Text>,
      "(tabs)/search/_layout": () => <Stack />,
      "(tabs)/search/index": () => <Text>Search destination</Text>,
      "(tabs)/search/(sheets)/filters": () => <Text>Filter destination</Text>,
      "(tabs)/notifications": () => <Text>Notifications destination</Text>,
      "(tabs)/profile": () => <Text>Profile destination</Text>,
      pro: () => <Text>Pro destination</Text>,
    },
    { initialUrl, wrapper: JourneyProviders },
  );
}

it.each(["/", "/search", "/notifications", "/profile"])(
  "shows the free-account offer with every visible tab bar at %s without prefetching an offering",
  async (path) => {
    // Given: a current authenticated account with SDK-established inactive rights.

    // When
    await openJourney(path);

    // Then
    expect(
      await screen.findByRole("button", { name: offerName }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Rechercher" })).toBeVisible();
    expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
  },
);

it("opens the existing Pro destination only after pressing the offer", async () => {
  // Given
  const user = userEvent.setup();
  await openJourney();
  const offer = await screen.findByRole("button", { name: offerName });
  expect(mockPurchases.getOfferings).not.toHaveBeenCalled();

  // When
  await user.press(offer);

  // Then
  expect(screen).toHavePathname("/pro");
  expect(screen.getByText("Pro destination")).toBeVisible();
  expect(screen.queryByRole("button", { name: offerName })).toBeNull();
});

it.each(["active", "guest", "unavailable"])(
  "does not encourage purchase for %s rights",
  async (state) => {
    // Given: native identity/SDK I/O supplies this actual provider state.
    if (state === "guest") {
      mockAuth0.hasValidCredentials.mockResolvedValue(false);
    } else if (state === "active") {
      const active = { "Blockout Pro": entitlement() };
      mockPurchases.getCustomerInfo.mockResolvedValue(
        customerInfo({
          active,
          all: active,
          verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
        }),
      );
    } else {
      mockPurchases.getCustomerInfo.mockRejectedValue(new Error("Unavailable"));
    }

    // When
    await openJourney();
    await waitFor(() => expect(pro.state.status).toBe(state));

    // Then
    expect(screen.getByRole("button", { name: "Rechercher" })).toBeVisible();
    expect(screen.queryByRole("button", { name: offerName })).toBeNull();
    expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
  },
);

it("hides the offer together with the tab bar in an existing contextual route", async () => {
  // Given
  await openJourney();
  await screen.findByRole("button", { name: offerName });

  // When
  await act(() => router.push("/search/filters"));

  // Then
  expect(await screen.findByText("Filter destination")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Rechercher" })).toBeNull();
  expect(screen.queryByRole("button", { name: offerName })).toBeNull();
});

it("removes the free-account offer when SDK rights become active and on local sign-out", async () => {
  // Given
  await openJourney();
  await screen.findByRole("button", { name: offerName });
  const active = { "Blockout Pro": entitlement() };
  mockPurchases.getCustomerInfo.mockResolvedValue(
    customerInfo({
      active,
      all: active,
      verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
    }),
  );

  // When
  await act(() => pro.refresh());

  // Then
  expect(screen.queryByRole("button", { name: offerName })).toBeNull();

  // When
  const inactive = customerInfo({
    active: {},
    all: {},
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  mockPurchases.getCustomerInfo.mockResolvedValue(inactive);
  await act(() => pro.refresh());
  await screen.findByRole("button", { name: offerName });
  await act(() => account.clearCredentials());

  // Then
  expect(screen.queryByRole("button", { name: offerName })).toBeNull();
  expect(screen.getByRole("button", { name: "Rechercher" })).toBeVisible();
});

it("does not encourage a second purchase while payment is pending or paid but unverified", async () => {
  // Given
  await openJourney();
  await screen.findByRole("button", { name: offerName });

  // When
  await act(() => pro.completeOperation("pending"));

  // Then
  expect(screen.queryByRole("button", { name: offerName })).toBeNull();

  // When
  await act(() =>
    pro.completeOperation(
      "purchased",
      customerInfo({
        active: {},
        all: {},
        verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    ),
  );

  // Then
  expect(screen.queryByRole("button", { name: offerName })).toBeNull();
});
