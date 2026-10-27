import * as proSessionModule from "../pro-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Stack, useTheme as useNavigationTheme } from "expo-router";
import { useEffect, useState, type ComponentType } from "react";
import { Appearance, Pressable, Text, TextInput } from "react-native";
import type { CustomerInfo } from "react-native-purchases";
import RootLayout from "../../../app/_layout";
import { useAccountSession } from "../../accounts/session/account-session-provider";
import type { AccountSession } from "../../accounts";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { useTheme } from "../../../shared/theme/theme-provider";
import {
  appearanceColors,
  membershipColors,
  neutralContext,
} from "../../../shared/theme/tokens";
import { usePro, type ProContext } from "../index";
import { customerInfo, entitlement } from "../test-support/customer-info";
import { mockPurchases } from "../test-support/native-purchases";
import { prepareProNativeIO } from "../test-support/pro-harness";

jest.unmock("react-native/Libraries/Utilities/useColorScheme");
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  Stack: jest.fn(),
}));
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
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});

jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));

const a = "00000000-0000-4000-8000-000000000001";
const b = "00000000-0000-4000-8000-000000000002";
let account: AccountSession;
let pro: ProContext;
const originalDomain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
const originalClient = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;

beforeEach(async () => {
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "mobile-test";
  // A fresh real owner isolates tests; remounts within one scenario retain it.
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  await AsyncStorage.clear();
  prepareProNativeIO();
  // Usable UUIDs are explicitly published through F05 below; no backend is contacted.
  delete process.env.EXPO_PUBLIC_API_URL;
  jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");
  jest.mocked(Stack).mockImplementation(AppearanceRoute);
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  if (originalDomain === undefined) delete process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
  else process.env.EXPO_PUBLIC_AUTH0_DOMAIN = originalDomain;
  if (originalClient === undefined)
    delete process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
  else process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = originalClient;
  if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
});

/** Reads public presentation contracts; text exposes semantic values without style assertions. */
function AppearanceValues() {
  const theme = useTheme();
  const navigation = useNavigationTheme();
  return (
    <>
      <Text accessibilityLabel="Apparence">{theme.scheme}</Text>
      <Text accessibilityLabel="Accent Pro">{theme.membership.fill}</Text>
      <Text accessibilityLabel="Contexte sportif">{theme.context.primary}</Text>
      <Text accessibilityLabel="Fond neutre">{theme.colors.canvas}</Text>
      <Text accessibilityLabel="Navigation native">
        {String(navigation.colors.background)}{" "}
        {String(navigation.colors.primary)}
      </Text>
    </>
  );
}

/** Stateful route double; root Query, Auth0/session, Pro and theme owners stay real. */
function AppearanceRoute() {
  const currentAccount = useAccountSession();
  const currentPro = usePro();
  useEffect(() => {
    account = currentAccount;
    pro = currentPro;
  }, [currentAccount, currentPro]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  return (
    <>
      <AppearanceValues />
      <Text>Pro: {currentPro.state.status}</Text>
      <Pressable accessibilityRole="button" onPress={() => setEditing(true)}>
        <Text>Consulter le sport</Text>
      </Pressable>
      {editing && (
        <TextInput
          accessibilityLabel="Brouillon"
          value={draft}
          onChangeText={setDraft}
        />
      )}
    </>
  );
}

/** Mounts only the real owners; each scenario publishes and awaits its account explicitly. */
async function renderAccount() {
  await render(<RootLayout />);
}

/** Builds only synthetic SDK evidence; the provider's active map remains authoritative. */
function activeInfo(store: "APP_STORE" | "PROMOTIONAL" = "APP_STORE") {
  const active = { "Blockout Pro": entitlement({ store }) };
  return customerInfo({
    active,
    all: active,
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
}

it.each(["light", "dark"] as const)(
  "projects current paid and gifted SDK-active rights without changing neutral context in %s",
  async (scheme) => {
    // Given
    jest.mocked(Appearance.getColorScheme).mockReturnValue(scheme);
    await renderAccount();
    await waitFor(() => expect(account.status).toBe("authenticated"));
    await act(() => account.setAccount(account.generation, a));
    await screen.findByText("Pro: inactive");
    expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
      membershipColors[scheme].fill,
    );

    // When
    for (const store of ["APP_STORE", "PROMOTIONAL"] as const) {
      mockPurchases.getCustomerInfo.mockResolvedValueOnce(activeInfo(store));
      await act(() => pro.refresh());

      // Then
      expect(screen.getByText("Pro: active")).toBeOnTheScreen();
      expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
        membershipColors.pro[scheme].fill,
      );
      expect(screen.getByLabelText("Contexte sportif")).toHaveTextContent(
        neutralContext[scheme].primary,
      );
      expect(screen.getByLabelText("Fond neutre")).toHaveTextContent(
        appearanceColors[scheme].canvas,
      );
      expect(
        screen.getByRole("button", { name: "Consulter le sport" }),
      ).toBeEnabled();
    }
  },
);

it("keeps unknown account and unavailable SDK state neutral", async () => {
  // Given
  await render(<RootLayout />);
  await waitFor(() => expect(account.status).toBe("authenticated"));
  expect(screen.getByText("Pro: unavailable")).toBeOnTheScreen();
  expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
    membershipColors.light.fill,
  );
  mockPurchases.getCustomerInfo.mockRejectedValueOnce(
    new Error("synthetic read failure"),
  );

  // When
  await act(() => account.setAccount(account.generation, a));

  // Then
  await waitFor(() => expect(pro.verificationFailed).toBe(true));
  expect(screen.getByText("Pro: unavailable")).toBeOnTheScreen();
  expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
    membershipColors.light.fill,
  );
});

it.each(["signOut", "clearCredentials"] as const)(
  "removes the previous accent at F05 %s before native logout settles",
  async (action) => {
    // Given: clearCredentials is F05's local invalidation seam after owner-accepted erasure.
    await renderAccount();
    await waitFor(() => expect(account.status).toBe("authenticated"));
    await act(() => account.setAccount(account.generation, a));
    await screen.findByText("Pro: inactive");
    mockPurchases.getCustomerInfo.mockResolvedValueOnce(activeInfo());
    await act(() => pro.refresh());
    expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
      membershipColors.pro.light.fill,
    );
    const logout = Promise.withResolvers<CustomerInfo>();
    mockPurchases.logOut.mockReturnValueOnce(logout.promise);

    // When
    await act(() => account[action]());

    // Then
    expect(screen.getByText("Pro: guest")).toBeOnTheScreen();
    expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
      membershipColors.light.fill,
    );
    expect(
      screen.getByRole("button", { name: "Consulter le sport" }),
    ).toBeEnabled();

    // When
    await act(() => logout.resolve(activeInfo()));

    // Then
    expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
      membershipColors.light.fill,
    );
  },
);

it("clears gold during reassociation and keeps a failed current association neutral", async () => {
  // Given
  await renderAccount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() => account.setAccount(account.generation, a));
  await screen.findByText("Pro: inactive");
  mockPurchases.getCustomerInfo.mockResolvedValueOnce(activeInfo());
  await act(() => pro.refresh());
  expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
    membershipColors.pro.light.fill,
  );
  const login =
    Promise.withResolvers<Awaited<ReturnType<typeof mockPurchases.logIn>>>();
  mockPurchases.logIn.mockReturnValueOnce(login.promise);

  // When
  await act(() => account.setAccount(account.generation, b));

  // Then
  expect(screen.getByText("Pro: unavailable")).toBeOnTheScreen();
  expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
    membershipColors.light.fill,
  );

  // When
  await act(() => login.reject(new Error("synthetic association failure")));

  // Then
  expect(pro.state).toEqual(
    expect.objectContaining({ reason: "association-failed" }),
  );
  expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
    membershipColors.light.fill,
  );
});

it("rejects previous-session gold through A → guest → A, including a late active read", async () => {
  // Given
  await renderAccount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() => account.setAccount(account.generation, a));
  await screen.findByText("Pro: inactive");
  const previous = activeInfo();
  mockPurchases.getCustomerInfo.mockResolvedValueOnce(previous);
  await act(() => pro.refresh());
  expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
    membershipColors.pro.light.fill,
  );
  const oldRead = Promise.withResolvers<CustomerInfo>();
  mockPurchases.getCustomerInfo.mockReturnValueOnce(oldRead.promise);
  let refreshing: ReturnType<ProContext["refresh"]> | undefined;
  await act(() => {
    refreshing = pro.refresh();
  });

  // When
  await act(() => account.clearCredentials());
  expect(screen.getByText("Pro: guest")).toBeOnTheScreen();
  expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
    membershipColors.light.fill,
  );
  mockAuth0.webAuth.mockResolvedValueOnce(credentialsFor("auth0|synthetic"));
  await act(() => account.signIn("https://api.example.invalid"));
  await act(() => account.setAccount(account.generation, a));
  await screen.findByText("Pro: inactive");
  await act(async () => {
    oldRead.resolve(previous);
    await refreshing;
  });

  // Then
  expect(screen.getByText("Pro: inactive")).toBeOnTheScreen();
  expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
    membershipColors.light.fill,
  );
});

it("retains SDK-supplied cached active gold during failure, then removes it on reliable rights loss", async () => {
  // Given: historical dates do not override the SDK's active map or create an app expiry clock.
  await renderAccount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() => account.setAccount(account.generation, a));
  await screen.findByText("Pro: inactive");
  const cached = activeInfo();
  mockPurchases.getCustomerInfo.mockResolvedValueOnce(cached);
  await act(() => pro.refresh());
  expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
    membershipColors.pro.light.fill,
  );
  mockPurchases.getCustomerInfo.mockRejectedValueOnce(
    new Error("synthetic outage"),
  );

  // When
  await act(() => pro.refresh());

  // Then
  expect(pro.verificationFailed).toBe(true);
  expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
    membershipColors.pro.light.fill,
  );

  // When: a native event signals a current read; its payload cannot override that read.
  mockPurchases.getCustomerInfo.mockResolvedValueOnce(
    customerInfo({
      active: {},
      all: { "Blockout Pro": entitlement({ isActive: false }) },
      verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
    }),
  );
  const listener = mockPurchases.addCustomerInfoUpdateListener.mock.calls[0][0];
  await act(() => listener(cached));

  // Then
  expect(screen.getByText("Pro: inactive")).toBeOnTheScreen();
  expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
    membershipColors.light.fill,
  );
});

it("follows live system appearance without resetting the mounted route or draft or restoring old gold", async () => {
  // Given
  const subscribe = jest.spyOn(Appearance, "addChangeListener");
  await renderAccount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() => account.setAccount(account.generation, a));
  await screen.findByText("Pro: inactive");
  mockPurchases.getCustomerInfo.mockResolvedValueOnce(activeInfo());
  await act(() => pro.refresh());
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Consulter le sport" }));
  await user.type(screen.getByLabelText("Brouillon"), "Saisie conservée");

  // When
  for (const scheme of ["dark", "light"] as const) {
    jest.mocked(Appearance.getColorScheme).mockReturnValue(scheme);
    await act(() => {
      for (const [listener] of subscribe.mock.calls)
        listener({ colorScheme: scheme });
    });

    // Then
    expect(screen.getByLabelText("Apparence")).toHaveTextContent(scheme);
    expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
      membershipColors.pro[scheme].fill,
    );
    expect(screen.getByLabelText("Navigation native")).toHaveTextContent(
      `${appearanceColors[scheme].canvas} ${neutralContext[scheme].primary}`,
    );
    expect(screen.getByDisplayValue("Saisie conservée")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Consulter le sport" }),
    ).toBeEnabled();
  }

  // When
  await act(() => pro.refresh());
  jest.mocked(Appearance.getColorScheme).mockReturnValue("dark");
  await act(() => {
    for (const [listener] of subscribe.mock.calls)
      listener({ colorScheme: "dark" });
  });

  // Then
  expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
    membershipColors.dark.fill,
  );
  expect(screen.getByDisplayValue("Saisie conservée")).toBeOnTheScreen();
});
