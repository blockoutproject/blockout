import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { applicationAccessResponse as mockApplicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
import { renderRouter } from "expo-router/testing-library";
import Purchases from "react-native-purchases";
import type { AccountSession } from "../../accounts";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import { ProfileScreen } from "../../accounts/screens/profile-screen";
import { SignInInvitationScreen } from "../../accounts/screens/sign-in-invitation-screen";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { mockPurchases } from "../test-support/native-purchases";
import { ProEntry, ProProfileBadge } from "../components/pro-entry";
import * as proSessionModule from "../pro-session";
import { customerInfo, entitlement } from "../test-support/customer-info";
import { prepareProNativeIO } from "../test-support/pro-harness";
import { ProProfileEntry } from "../components/pro-profile-entry";
import { ProProvider, usePro, type ProContext } from "../pro-provider";
import { PrivacyEntry } from "../../privacy/components/privacy-sheet";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { revenueCat: { iosApiKey: "test_public" } } },
  },
}));
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    ...jest.requireActual("../test-support/native-purchases").mockPurchases,
    getOfferings: jest.fn(),
  },
}));
jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});

jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => mockRouter,
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL) =>
    String(url).endsWith("/application-access")
      ? Promise.resolve(Response.json(mockApplicationAccessResponse()))
      : Promise.reject(new Error("Unexpected HTTP request")),
}));

// Navigation commands are controlled; the actual F05 session, invitation, F13 controls and profile render.
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};
const previousEnvironment = { ...process.env };
let account: AccountSession;
let pro: ProContext;
let client = createQueryClient();
const message = "Connectez-vous pour utiliser Blockout Pro";

beforeEach(() => {
  client = createQueryClient();
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
  });
  jest.mocked(initializeV2Installation).mockReset().mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|entry-test"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuth.mockReset();
  mockRouter.canGoBack.mockReturnValue(true);
});
afterEach(async () => {
  await cleanup();
  client.clear();
  jest.restoreAllMocks();
  process.env = { ...previousEnvironment };
});

/** Captures the real session API without granting a usable business account. */
function SessionProbe() {
  const session = useAccountSession();
  useEffect(() => {
    account = session;
  }, [session]);
  return <Text>Session: {session.status}</Text>;
}

/** Mounts focused real owners; routing remains an explicitly controlled command boundary. */
async function mount(content: React.ReactNode) {
  await renderRouter(
    { index: () => <>{content}</> },
    {
      initialUrl: "/",
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>
          <ThemeProvider>
            <ActionFeedbackProvider scopeKey="test">
              <ApplicationAccessProvider>
                <AccountSessionProvider>
                  <SessionProbe />
                  {children}
                </AccountSessionProvider>
              </ApplicationAccessProvider>
            </ActionFeedbackProvider>
          </ThemeProvider>
        </QueryClientProvider>
      ),
    },
  );
}

it("places a distinct Pro action before Privacy in the existing admitted profile", async () => {
  // Given
  await mount(
    <ProProvider>
      <ProfileScreen
        privacyEntry={<PrivacyEntry />}
        admitted
        proEntry={<ProProfileEntry />}
      />
    </ProProvider>,
  );
  await screen.findByText("Session: guest");

  // When
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

  // Then
  expect(mockRouter.push).toHaveBeenCalledWith("/sign-in-invitation");
  expect(screen.getByText("Blockout Pro")).toBeOnTheScreen();
  expect(
    screen.getByRole("link", { name: "Confidentialité" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("link", { name: "Politique de confidentialité" }),
  ).toBeOnTheScreen();
  const actions = screen.getAllByRole(/button|link/);
  expect(
    actions.indexOf(screen.getByRole("button", { name: "Blockout Pro" })),
  ).toBeLessThan(
    actions.indexOf(screen.getByRole("link", { name: "Confidentialité" })),
  );
  expect(
    screen.getByRole("button", { name: "Besoin d’aide ?" }),
  ).toBeOnTheScreen();
  expect(mockPurchases.getCustomerInfo).not.toHaveBeenCalled();
  expect(Purchases.getOfferings).not.toHaveBeenCalled();
});

it("keeps Pro and its direct invitation behind ordinary F12 admission", async () => {
  // Given
  const admitted = false;

  // When
  await mount(
    <>
      <ProProvider>
        <ProfileScreen
          privacyEntry={null}
          admitted={admitted}
          proEntry={<ProProfileEntry />}
        />
      </ProProvider>
      <SignInInvitationScreen admitted={admitted} message={message} />
    </>,
  );
  await screen.findByText("Session: guest");

  // Then
  expect(
    screen.queryByRole("button", { name: "Blockout Pro" }),
  ).not.toBeOnTheScreen();
  expect(screen.queryByText(message)).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Se connecter" }),
  ).not.toBeOnTheScreen();
});

it("requests dismissal of the price-free invitation without consulting native offers", async () => {
  // Given
  await mount(
    <>
      <Text>Poule conservée</Text>
      <SignInInvitationScreen admitted message={message} />
    </>,
  );
  await screen.findByText("Session: guest");

  // When
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Fermer" }));

  // Then
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(screen.getByText("Poule conservée")).toBeOnTheScreen();
  expect(screen.getByText(message)).toBeOnTheScreen();
  expect(screen.queryByText(/€|EUR|acheter|restaurer/i)).not.toBeOnTheScreen();
  expect(mockPurchases.getCustomerInfo).not.toHaveBeenCalled();
  expect(mockPurchases.logIn).not.toHaveBeenCalled();
});

it("replaces the invitation with ordinary sign-in, without any continuation parameter", async () => {
  // Given
  await mount(<SignInInvitationScreen admitted message={message} />);
  await screen.findByText("Session: guest");

  // When
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Se connecter" }));

  // Then
  expect(mockRouter.replace).toHaveBeenCalledWith("/sign-in");
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(mockPurchases.getCustomerInfo).not.toHaveBeenCalled();
});

it("removes the guest presentation immediately when its F05 generation changes", async () => {
  // Given
  await mount(<SignInInvitationScreen admitted message={message} />);
  await screen.findByText("Session: guest");

  // When
  await act(() => account.invalidate());

  // Then
  await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
  expect(screen.queryByText(message)).not.toBeOnTheScreen();
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
});

it("requires a new explicit press after ordinary sign-in before requesting presentation", async () => {
  // Given: only the host navigation command is controlled; F05 sign-in and generation publication are real.
  const present = jest.fn();
  mockAuth0.webAuth.mockResolvedValue(credentialsFor("auth0|entry-test"));
  mockAuth0.saveCredentials.mockResolvedValue();
  await mount(<ProEntry onOpenPresentation={present} />);
  await screen.findByText("Session: guest");
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

  // When
  await act(() => account.signIn("urn:synthetic:mobile"));
  await waitFor(() => expect(account.status).toBe("authenticated"));
  await act(() =>
    account.setAccount(
      account.generation,
      "00000000-0000-4000-8000-000000000246",
    ),
  );

  // Then
  expect(present).not.toHaveBeenCalled();
  expect(mockRouter.push).toHaveBeenCalledTimes(1);

  // When
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

  // Then
  expect(present.mock.calls).toEqual([[]]);
});

/** Observes the real Pro context beside the badge so explicit verification keeps its provider-owned lifecycle. */
function MembershipProbe() {
  const current = usePro();
  useEffect(() => {
    pro = current;
  }, [current]);
  return <ProProfileBadge />;
}

it("shows membership only from verified current-session rights and clears it when the generation changes", async () => {
  // Given
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  const inactive = prepareProNativeIO();
  const read =
    Promise.withResolvers<
      Awaited<ReturnType<typeof Purchases.getCustomerInfo>>
    >();
  mockPurchases.getCustomerInfo.mockReturnValue(read.promise);
  try {
    await mount(
      <ProProvider>
        <MembershipProbe />
      </ProProvider>,
    );
    await screen.findByText("Session: authenticated");
    await act(() =>
      account.setAccount(
        account.generation,
        "00000000-0000-4000-8000-000000000246",
      ),
    );
    await waitFor(() =>
      expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(1),
    );

    // Then: pending or unavailable evidence must not be presented as free membership.
    expect(screen.queryByText("Compte gratuit")).not.toBeOnTheScreen();
    expect(screen.queryByText("Compte Pro")).not.toBeOnTheScreen();

    // When
    await act(() => read.resolve(inactive));

    // Then
    expect(await screen.findByText("Compte gratuit")).toBeOnTheScreen();
    expect(screen.queryByText("Compte Pro")).not.toBeOnTheScreen();

    // Given
    const right = entitlement();
    mockPurchases.getCustomerInfo.mockResolvedValue(
      customerInfo({
        active: { "Blockout Pro": right },
        all: { "Blockout Pro": right },
        verification: right.verification,
      }),
    );

    // When
    await act(async () => {
      await pro.refresh();
    });

    // Then
    expect(await screen.findByText("Compte Pro")).toBeOnTheScreen();
    expect(screen.queryByText("Compte gratuit")).not.toBeOnTheScreen();

    // When
    await act(() => account.invalidate());

    // Then
    expect(screen.queryByText("Compte Pro")).not.toBeOnTheScreen();
    expect(screen.queryByText("Compte gratuit")).not.toBeOnTheScreen();
  } finally {
    await act(() => read.resolve(inactive));
  }
});
