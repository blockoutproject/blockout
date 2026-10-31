import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Stack } from "expo-router";
import ProRoute from "../../../app/(ordinary)/pro";
import SupportLayout from "../../../app/(ordinary)/support/_layout";
import SupportChoiceRoute from "../../../app/(ordinary)/support/choice";
import SupportRoute from "../../../app/(ordinary)/support/index";
import { ProfileSupportAction } from "../../accounts/components/profile-support-action";
import { ProProfileEntry } from "../components/pro-profile-entry";
import { AccountAdmissionProvider } from "../../accounts/components/account-admission";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { useSupportVisit } from "../../support/forms/support-visit";
import { renderRouter } from "expo-router/testing-library";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Text } from "react-native";
import { useEffect, useState } from "react";
import { type CustomerCenterViewProps } from "react-native-purchases-ui";
import type { AccountSession } from "../../accounts";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { createQueryClient } from "../../../shared/query/query-client";
import { ProProvider } from "../pro-provider";
import * as proSessionModule from "../pro-session";
import { prepareProNativeIO } from "../test-support/pro-harness";
import { mockPurchases } from "../test-support/native-purchases";
import { customerInfo, entitlement } from "../test-support/customer-info";
import { signInAccount } from "../test-support/sign-in-account";
import { v2Offering } from "../test-support/offering";

jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));
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
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../test-support/native-purchases").mockPurchases,
}));
jest.mock("react-native-purchases-ui", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: {
      Paywall: () => <Text>Native paywall</Text>,
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
let mockCenter: CustomerCenterViewProps;
let account: AccountSession;
let setAdmitted: (value: boolean) => void;
let client = createQueryClient();
const previousEnvironment = { ...process.env };
const accountA = "00000000-0000-4000-8000-000000000318";
beforeEach(() => {
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "mobile-test";
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  const transport = jest.requireMock(
    "expo/fetch",
  ) as typeof import("expo/fetch");
  jest
    .mocked(transport.fetch)
    .mockImplementation(
      async (url) =>
        (String(url).endsWith("/application-access")
          ? Response.json(applicationAccessResponse())
          : new Response(null, { status: 404 })) as Awaited<
          ReturnType<typeof transport.fetch>
        >,
    );
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
  client.setQueryDefaults([], { retry: false, gcTime: Infinity });
});
afterEach(async () => {
  await cleanup();
  client.clear();
  jest.restoreAllMocks();
  process.env = { ...previousEnvironment };
});
/** Keeps actual Router/F12 injection and account owners alive across destinations. */
function Journey() {
  useQueryClient().setQueryDefaults([], { retry: false, gcTime: Infinity });
  const a = useAccountSession();
  const [admitted, updateAdmission] = useState(true);
  useEffect(() => {
    account = a;
    setAdmitted = updateAdmission;
  }, [a]);
  return (
    <AccountAdmissionProvider admitted={admitted}>
      <ActionFeedbackProvider scopeKey={a.subject ?? "guest"}>
        <Stack screenOptions={{ headerShown: false, animation: "none" }} />
      </ActionFeedbackProvider>
    </AccountAdmissionProvider>
  );
}
/** Real profile entry and independent F10 fallback; no provider dependency in support navigation. */
function Profile() {
  return (
    <>
      <ProProfileEntry />
      <ProfileSupportAction />
    </>
  );
}
/** Shows the real form and its admitted context without submitting a private request. */
function Support() {
  const { context } = useSupportVisit();
  return (
    <>
      <Text>{JSON.stringify(context)}</Text>
      <SupportRoute />
    </>
  );
}
/** Mounts production Pro and F10 routes; only SDK/HTTP I/O is controlled. */
async function mount() {
  const active = { "Blockout Pro": entitlement({ store: "APP_STORE" }) };
  mockPurchases.getCustomerInfo.mockResolvedValue(
    customerInfo({
      active,
      all: active,
      verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
    }),
  );
  await renderRouter(
    {
      _layout: Journey,
      profile: Profile,
      pro: ProRoute,
      "support/_layout": SupportLayout,
      "support/index": Support,
      "support/choice": SupportChoiceRoute,
    },
    {
      initialUrl: "/profile",
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>
          <ThemeProvider>
            <ApplicationAccessProvider>
              <AccountSessionProvider>
                <ProProvider>{children}</ProProvider>
              </AccountSessionProvider>
            </ApplicationAccessProvider>
          </ThemeProvider>
        </QueryClientProvider>
      ),
    },
  );
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() => signInAccount(account, accountA));
  await waitFor(() => expect(account.accountId).toBe(accountA));
}
it("only the recognized Custom Action removes Pro before the real F10 form, without SDK payload", async () => {
  // Given: a store from the other platform still uses the same bounded support route.
  const user = userEvent.setup();
  await mount();
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native management");
  const callback = mockCenter.onCustomActionSelected!;

  // When
  await act(() =>
    callback({ actionId: "unknown", purchaseIdentifier: "private-receipt" }),
  );
  expect(screen).toHavePathname("/pro");
  await act(() =>
    callback({ actionId: "f10-help", purchaseIdentifier: "private-receipt" }),
  );

  // Then
  expect(screen).toHavePathname("/support");
  expect(await screen.findByLabelText("Description")).toBeOnTheScreen();
  expect(screen.queryByText("Native management")).not.toBeOnTheScreen();
  expect(screen.queryByText(/private-receipt/)).not.toBeOnTheScreen();
  expect(screen.getByText(/"screen":"Pro"/)).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  expect(screen).toHavePathname("/profile");
});
it.each([accountA, "00000000-0000-4000-8000-000000000319"])(
  "rejects old support callbacks after guest and return to %s",
  async (nextAccount) => {
    // Given
    const user = userEvent.setup();
    await mount();
    await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
    await screen.findByText("Native management");
    const callback = mockCenter.onCustomActionSelected!;

    // When
    await act(() => account.clearCredentials());
    await act(() => signInAccount(account, nextAccount));
    await waitFor(() => expect(account.accountId).toBe(nextAccount));
    await act(() =>
      callback({ actionId: "f10-help", purchaseIdentifier: "private" }),
    );

    // Then
    expect(screen.queryByLabelText("Description")).not.toBeOnTheScreen();
    expect(screen).toHavePathname("/profile");
  },
);
it("keeps profile assistance usable after closing failed native management and leaving authentication", async () => {
  // Given: the native view owns its error; it exposes only ordinary dismissal to Blockout.
  const user = userEvent.setup();
  await mount();
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native management");
  mockPurchases.getCustomerInfo.mockRejectedValue(
    new Error("provider unavailable"),
  );

  // When
  await act(() => mockCenter.onDismiss!());
  await act(() => account.clearCredentials());
  await user.press(screen.getByRole("button", { name: "Besoin d’aide ?" }));

  // Then
  expect(screen).toHavePathname("/support");
  expect(await screen.findByLabelText("Description")).toBeOnTheScreen();
  expect(screen.getByText(/"screen":"Profil"/)).toBeOnTheScreen();
});
it("does not open support when F12 withdraws ordinary admission", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native management");
  const callback = mockCenter.onCustomActionSelected!;

  // When
  await act(() => setAdmitted(false));
  await act(() => callback({ actionId: "f10-help", purchaseIdentifier: null }));

  // Then
  expect(screen.queryByLabelText("Description")).not.toBeOnTheScreen();
});
