import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Stack, router } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Alert, Text } from "react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { createQueryClient } from "../../../shared/query/query-client";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ContributionScreen } from "../screens/contribution-screen";
import { matchDetail } from "../../sporting/test-support/consultation-data";
import { ownContributions } from "../test-support/contribution-data";

jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, init?: RequestInit) => mockFetch(url, init),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const match = matchDetail();
const previous = { ...process.env };
let client = createQueryClient();
beforeEach(() => {
  client = createQueryClient();
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|synthetic"));
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  mockFetch.mockReset().mockImplementation(async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("/application-access"))
      return Response.json(applicationAccessResponse());
    if (path.endsWith("/me")) return Response.json(accountResponse());
    if (path.includes("/stream-contributions"))
      return Response.json(
        init?.method === "POST"
          ? {
              revision: "next",
              contribution: {
                id: "00000000-0000-4000-8000-000000000003",
                url: "https://youtu.be/example",
                platform: "youtube",
                state: "active",
                submittedAt: "2026-10-28T10:00:00Z",
                canCancel: false,
                canWithdraw: true,
              },
            }
          : ownContributions(),
        { status: init?.method === "POST" ? 201 : 200 },
      );
    return Response.json(match);
  });
});
afterEach(async () => {
  await act(async () => {
    await client.cancelQueries();
  });
  await cleanup();
  client.clear();
  process.env = { ...previous };
  jest.restoreAllMocks();
});

/** Keeps the actual router, discard guard, form, Query and session; native credentials, alerts and HTTP alone are controlled. */
function Layout() {
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <AccountFeedbackProvider>
              <Stack />
            </AccountFeedbackProvider>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

it("leaves an acknowledged clean form without asking to discard the saved address", async () => {
  // Given
  await renderRouter(
    {
      _layout: Layout,
      index: () => <Text>Match origin</Text>,
      "matches/[matchId]/contribution": () => (
        <ContributionScreen matchId={match.match.id} />
      ),
    },
    { initialUrl: "/" },
  );
  await act(() =>
    router.push({
      pathname: "/matches/[matchId]/contribution",
      params: { matchId: match.match.id },
    }),
  );
  const user = userEvent.setup();
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    "https://youtu.be/example",
  );
  // When
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));
  // Then
  await waitFor(() =>
    expect(screen.getByText("Match origin")).toBeOnTheScreen(),
  );
  expect(Alert.alert).not.toHaveBeenCalled();
});
