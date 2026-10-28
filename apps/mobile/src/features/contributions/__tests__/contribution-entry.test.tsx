import { QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
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
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { accountResponse } from "../../accounts/test-support/account-response";
import { ownContributions } from "../test-support/contribution-data";

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
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, init?: RequestInit) => mockFetch(url, init),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const previous = { ...process.env };
let client = createQueryClient();
let context = ownContributions();
beforeEach(() => {
  client = createQueryClient();
  mockPush.mockReset();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|synthetic"));
  context = ownContributions();
  mockFetch.mockReset().mockImplementation(async (url) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("/application-access"))
      return Response.json(applicationAccessResponse());
    if (path.endsWith("/me")) return Response.json(accountResponse());
    return Response.json(context);
  });
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
            <ApplicationAccessProvider>
              <MatchContributionAction matchId="00000000-0000-4000-8000-000000000002" />
            </ApplicationAccessProvider>
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

it.each([
  "Le compte doit avoir au moins sept jours.",
  "L’ancienneté du compte est indisponible. Réessayez.",
  "La publication ouvre une heure avant le match.",
])("omits an unavailable contribution action: %s", async (reason) => {
  // Given: the generated owner response supplies current eligibility, including the account-age rule.
  context = ownContributions({
    eligibility: { canSubmit: false, requiresApproval: false, reason },
  });
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AccountSessionProvider>
          <ApplicationAccessProvider>
            <MatchContributionAction matchId="00000000-0000-4000-8000-000000000002" />
          </ApplicationAccessProvider>
        </AccountSessionProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  // When: the real Query and generated transport finish the eligibility read.
  await waitFor(() =>
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/stream-contributions"),
      expect.anything(),
    ),
  );
  await waitFor(() => expect(client.isFetching()).toBe(0));
  // Then: there is no disabled action, refusal copy, or navigation to an unusable form.
  expect(
    screen.queryByRole("button", { name: "Stream link" }),
  ).not.toBeOnTheScreen();
  expect(screen.queryByText(reason)).not.toBeOnTheScreen();
  expect(mockPush).not.toHaveBeenCalled();
});
