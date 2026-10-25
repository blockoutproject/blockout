import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
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
import { ProEntry } from "../components/pro-entry";
import { ProProfileEntry } from "../components/pro-profile-entry";
import { ProProvider } from "../pro-provider";

jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
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
  useFocusEffect: (callback: () => () => void) => {
    const { useEffect } = jest.requireActual("react");
    useEffect(callback, [callback]);
  },
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

// Navigation commands are controlled; the actual F05 session, invitation, F13 controls and profile render.
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};
const previousEnvironment = { ...process.env };
let account: AccountSession;
let client = createQueryClient();
const message = "Connectez-vous pour utiliser Blockout Pro";

beforeEach(() => {
  client = createQueryClient();
  Object.assign(process.env, {
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
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ActionFeedbackProvider scopeKey="test">
          <AccountSessionProvider>
            <SessionProbe />
            {content}
          </AccountSessionProvider>
        </ActionFeedbackProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  await screen.findByText("Session: guest");
}

it("places a distinct Pro action before Privacy in the existing admitted profile", async () => {
  // Given
  await mount(
    <ProProvider>
      <ProfileScreen admitted proEntry={<ProProfileEntry />} />
    </ProProvider>,
  );

  // When
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

  // Then
  expect(mockRouter.push).toHaveBeenCalledWith("/sign-in-invitation");
  expect(screen.getByText("Blockout Pro")).toBeOnTheScreen();
  expect(screen.getByText("Confidentialité")).toBeOnTheScreen();
  const actions = screen.getAllByRole(/button|link/);
  expect(
    actions.indexOf(screen.getByRole("button", { name: "Blockout Pro" })),
  ).toBeLessThan(
    actions.indexOf(screen.getByRole("link", { name: "Confidentialité" })),
  );
  expect(screen.getByText("Besoin d’aide ?")).toBeOnTheScreen();
  expect(mockPurchases.getCustomerInfo).not.toHaveBeenCalled();
  expect(Purchases.getOfferings).not.toHaveBeenCalled();
});

it("keeps Pro and its direct invitation behind ordinary F12 admission", async () => {
  // Given
  await mount(
    <>
      <ProProvider>
        <ProfileScreen admitted={false} proEntry={<ProProfileEntry />} />
      </ProProvider>
      <SignInInvitationScreen admitted={false} message={message} />
    </>,
  );

  // When / Then
  expect(
    screen.queryByRole("button", { name: "Blockout Pro" }),
  ).not.toBeOnTheScreen();
  expect(screen.queryByText(message)).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Se connecter" }),
  ).not.toBeOnTheScreen();
});

it("dismisses the price-free invitation without changing the originating context or consulting native offers", async () => {
  // Given
  await mount(
    <>
      <Text>Poule conservée</Text>
      <SignInInvitationScreen admitted message={message} />
    </>,
  );

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

  // When
  await act(() => account.invalidate());

  // Then
  await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
  expect(screen.queryByText(message)).not.toBeOnTheScreen();
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
});

it("requires a new explicit press after ordinary sign-in before calling a native host command", async () => {
  // Given: only the host navigation command is controlled; F05 sign-in and generation publication are real.
  const present = jest.fn();
  mockAuth0.webAuth.mockResolvedValue(credentialsFor("auth0|entry-test"));
  mockAuth0.saveCredentials.mockResolvedValue();
  await mount(<ProEntry onOpenPresentation={present} />);
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
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  expect(present).toHaveBeenCalledTimes(1);
});
