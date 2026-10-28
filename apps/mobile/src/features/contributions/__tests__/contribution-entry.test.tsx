import { QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { createQueryClient } from "../../../shared/query/query-client";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { MatchContributionAction } from "../../sporting/components/sporting-actions";

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
  useRouter: () => ({ push: mockPush }),
}));
const mockPush = jest.fn();
const previous = { ...process.env };
let client = createQueryClient();
beforeEach(() => {
  client = createQueryClient();
  mockPush.mockReset();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|synthetic"));
});
afterEach(async () => {
  await cleanup();
  client.clear();
  process.env = { ...previous };
});

it.each([true, false])(
  "opens only a neutral native entry for authenticated=%s",
  async (authenticated) => {
    // Given: the real session owner; no Pro SDK, private contribution or support data is needed to offer the entry.
    mockAuth0.hasValidCredentials.mockResolvedValue(authenticated);
    const user = userEvent.setup();
    await render(
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <AccountSessionProvider>
            <MatchContributionAction matchId="00000000-0000-4000-8000-000000000002" />
          </AccountSessionProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    // When
    await user.press(
      await screen.findByRole("button", { name: "Stream link" }),
    );
    // Then
    expect(mockPush).toHaveBeenCalledWith(
      authenticated
        ? {
            pathname: "/matches/[matchId]/contribution",
            params: { matchId: "00000000-0000-4000-8000-000000000002" },
          }
        : {
            pathname: "/sign-in-invitation",
            params: { reason: "contribution" },
          },
    );
    expect(screen.queryByText(/replay/i)).not.toBeOnTheScreen();
    expect(screen.queryByText(/support/i)).not.toBeOnTheScreen();
  },
);
