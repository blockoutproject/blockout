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
import { redirectSystemPath } from "../../../app/+native-intent";
import SharedTabLayout, {
  unstable_settings as sharedTabSettings,
} from "../../../app/(ordinary)/(tabs)/(discovery,home,notifications,profile)/_layout";
import ProfileLayout, {
  unstable_settings as profileSettings,
} from "../../../app/(ordinary)/(tabs)/(profile)/profile/_layout";
import { sheetScreenOptions } from "../../../shared/components/sheet";
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
const entityId = "00000000-0000-4000-8000-000000000720";
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
  return (
    <Stack screenOptions={{ headerShown: false, animation: "none" }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="invitation" options={sheetScreenOptions} />
      <Stack.Screen name="pro" options={{ presentation: "fullScreenModal" }} />
    </Stack>
  );
}

/** Keeps the production tab stacks and profile anchor; probes omit unrelated feature reads and forms. */
async function openJourney(initialUrl = "/search") {
  await renderRouter(
    {
      _layout: () => <Stack screenOptions={{ headerShown: false }} />,
      "(ordinary)/_layout": JourneyLayout,
      "+native-intent": { redirectSystemPath },
      "(ordinary)/(tabs)/_layout": TabsLayout,
      "(ordinary)/(tabs)/(discovery,home,notifications,profile)/_layout": {
        default: SharedTabLayout,
        unstable_settings: sharedTabSettings,
      },
      "(ordinary)/(tabs)/(home)/(personal)/_layout": () => <Stack />,
      "(ordinary)/(tabs)/(home)/(personal)/index": () => (
        <Text>Home destination</Text>
      ),
      "(ordinary)/(tabs)/(discovery)/search/_layout": () => (
        <Stack>
          <Stack.Screen name="(sheets)/filters" options={sheetScreenOptions} />
        </Stack>
      ),
      "(ordinary)/(tabs)/(discovery)/search/index": () => (
        <Text>Search destination</Text>
      ),
      "(ordinary)/(tabs)/(discovery)/search/(sheets)/filters": () => (
        <Text>Filter destination</Text>
      ),
      "(ordinary)/(tabs)/(notifications)/notifications": () => (
        <Text>Notifications destination</Text>
      ),
      "(ordinary)/(tabs)/(profile)/profile/_layout": {
        default: ProfileLayout,
        unstable_settings: profileSettings,
      },
      "(ordinary)/(tabs)/(profile)/profile/index": () => (
        <Text>Profile destination</Text>
      ),
      "(ordinary)/(tabs)/(profile)/profile/(forms)/edit": () => (
        <Text>Edit destination</Text>
      ),
      "(ordinary)/(tabs)/(profile)/profile/(forms)/erase": () => (
        <Text>Erase destination</Text>
      ),
      "(ordinary)/(tabs)/(discovery,home,notifications,profile)/clubs/[clubId]":
        () => <Text>Club destination</Text>,
      "(ordinary)/(tabs)/(discovery,home,notifications,profile)/pools/[poolId]":
        () => <Text>Pool destination</Text>,
      "(ordinary)/(tabs)/(discovery,home,notifications,profile)/teams/[teamId]":
        () => <Text>Team destination</Text>,
      "(ordinary)/(tabs)/(discovery,home,notifications,profile)/matches/[matchId]":
        () => <Text>Match destination</Text>,
      "(ordinary)/invitation": () => <Text>Invitation destination</Text>,
      "(ordinary)/pro": () => <Text>Pro destination</Text>,
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

it.each([
  { root: "/", selected: "Accueil", kind: "clubs" },
  { root: "/search", selected: "Rechercher", kind: "pools" },
  { root: "/notifications", selected: "Notifications", kind: "matches" },
  { root: "/profile", selected: "Profil", kind: "teams" },
])(
  "retains $selected and its native Back history on a $kind detail",
  async ({ root, selected, kind }) => {
    // Given
    await openJourney(root);
    await screen.findByRole("button", { name: offerName });

    // When
    await act(() => router.push(`/${kind}/${entityId}`));

    // Then
    expect(screen).toHavePathname(`/${kind}/${entityId}`);
    expect(
      screen.getByRole("button", { name: selected, selected: true }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: offerName })).toBeVisible();

    // When
    await act(() => router.back());

    // Then
    expect(screen).toHavePathname(root);
    expect(
      screen.getByRole("button", { name: selected, selected: true }),
    ).toBeVisible();
  },
);

it.each(["clubs", "pools", "teams", "matches"])(
  "defaults a direct %s detail to Search and returns to its root",
  async (kind) => {
    // Given
    const path = `/${kind}/${entityId}`;

    // When
    await openJourney(path);

    // Then
    await screen.findByRole("button", { name: offerName });
    expect(screen).toHavePathname(path);
    expect(
      screen.getByRole("button", { name: "Rechercher", selected: true }),
    ).toBeVisible();

    // When
    await act(() => router.back());

    // Then
    expect(screen).toHavePathname("/search");
  },
);

it("opens a rewritten warm sporting link in Search after visiting Home", async () => {
  // Given: the public system-path adapter and Router remain real; native URL delivery is observed on devices.
  const user = userEvent.setup();
  await openJourney("/");
  await screen.findByRole("button", { name: offerName });

  // When
  const destination = redirectSystemPath({
    path: `blockout-local://teams/${entityId}?tab=matches&label=Rives%20Est#standings`,
    initial: false,
  });
  await act(() => router.navigate(destination));

  // Then
  expect(screen).toHavePathname(`/teams/${entityId}`);
  expect(screen).toHaveSearchParams({
    teamId: entityId,
    tab: "matches",
    label: "Rives Est",
    "#": "standings",
  });
  expect(
    screen.getByRole("button", { name: "Rechercher", selected: true }),
  ).toBeVisible();

  // When
  await act(() => router.back());

  // Then
  expect(screen).toHavePathname("/");
  expect(
    screen.getByRole("button", { name: "Accueil", selected: true }),
  ).toBeVisible();

  // When
  await user.press(screen.getByRole("button", { name: "Rechercher" }));

  // Then
  expect(screen).toHavePathname(`/teams/${entityId}`);
  expect(
    screen.getByRole("button", { name: "Rechercher", selected: true }),
  ).toBeVisible();

  // When
  await user.press(screen.getByRole("button", { name: "Rechercher" }));

  // Then
  expect(screen).toHavePathname("/search");
  expect(screen.getByText("Search destination")).toBeVisible();
});

it("restores the same sporting detail and tab after dismissing an outer native sheet", async () => {
  // Given
  await openJourney("/notifications");
  await screen.findByRole("button", { name: offerName });
  await act(() => router.push(`/matches/${entityId}`));

  // When
  await act(() => router.push("/invitation"));

  // Then
  expect(screen.getByText("Invitation destination")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Rechercher" })).toBeNull();
  expect(screen.queryByRole("button", { name: offerName })).toBeNull();

  // When
  await act(() => router.back());

  // Then
  expect(screen).toHavePathname(`/matches/${entityId}`);
  expect(
    screen.getByRole("button", { name: "Notifications", selected: true }),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: offerName })).toBeVisible();
});

it.each(["edit", "erase"])(
  "keeps the bar and offer out of the dedicated Profile %s form",
  async (form) => {
    // Given
    await openJourney("/profile");
    await screen.findByRole("button", { name: offerName });

    // When
    await act(() => router.push(`/profile/${form}`));

    // Then
    expect(screen).toHavePathname(`/profile/${form}`);
    expect(screen.queryByRole("button", { name: "Rechercher" })).toBeNull();
    expect(screen.queryByRole("button", { name: offerName })).toBeNull();

    // When
    await act(() => router.back());

    // Then
    expect(screen).toHavePathname("/profile");
    expect(
      screen.getByRole("button", { name: "Profil", selected: true }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: offerName })).toBeVisible();
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
    await openJourney(`/teams/${entityId}`);
    await waitFor(() => expect(pro.state.status).toBe(state));

    // Then
    expect(screen.getByRole("button", { name: "Rechercher" })).toBeVisible();
    expect(screen.queryByRole("button", { name: offerName })).toBeNull();
    expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
    if (state === "guest") {
      expect(screen.queryByRole("button", { name: "Accueil" })).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Notifications" }),
      ).toBeNull();
      expect(screen.getByRole("button", { name: "Profil" })).toBeVisible();
    }
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
