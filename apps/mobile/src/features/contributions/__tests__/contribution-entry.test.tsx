import { QueryClientProvider } from "@tanstack/react-query";
import type { ComponentType } from "react";
import {
  act,
  cleanup,
  fireEvent,
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
import {
  MatchContributionAction,
  useMatchContributionAction,
} from "../../sporting/components/sporting-actions";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { accountResponse } from "../../accounts/test-support/account-response";
import { ownContributions } from "../test-support/contribution-data";
import { MatchScreen } from "../../sporting/screens/match-screen";
import { matchDetail } from "../../sporting/test-support/consultation-data";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { AdvertisingProviders } from "../../advertising/test-support/advertising-providers";
import * as proSessionModule from "../../pro/pro-session";
import { prepareProNativeIO } from "../../pro/test-support/pro-harness";

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../../pro/test-support/native-purchases")
    .mockPurchases,
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
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({ isFocused: () => true }),
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
/** Uses the actual public action and its read owner, as the match refresh composition does. */
function Entry() {
  const entry = useMatchContributionAction(
    "00000000-0000-4000-8000-000000000002",
  );
  return <MatchContributionAction entry={entry} />;
}
let client = createQueryClient();
let context = ownContributions();
beforeEach(() => {
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
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
    return Response.json(
      path.includes("/stream-contributions") ? context : matchDetail(),
    );
  });
});

it.each(["refused", "owner outage", "profile outage"])(
  "offers the action after match refresh recovers from %s",
  async (initial) => {
    // Given: an initially unavailable action on the real match screen and Query owners.
    context = ownContributions({
      eligibility: {
        canSubmit: false,
        requiresApproval: false,
        reason: "Le compte doit avoir au moins sept jours.",
      },
    });
    let recovering = false;
    const peer = mockFetch.getMockImplementation();
    mockFetch.mockImplementation(async (url, init) => {
      if (
        !recovering &&
        ((initial === "owner outage" &&
          String(url).includes("/stream-contributions")) ||
          (initial === "profile outage" && String(url).endsWith("/me")))
      )
        throw new TypeError("Controlled test network failure");
      if (!peer) throw new Error("Missing test HTTP boundary");
      return peer(url, init);
    });
    await render(
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <AccountFeedbackProvider>
                <AdvertisingProviders>
                  <MatchScreen matchId={matchDetail().match.id} />
                </AdvertisingProviders>
              </AccountFeedbackProvider>
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          initial === "profile outage" ? "/me" : "/stream-contributions",
        ),
        expect.anything(),
      ),
    );
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(
      screen.queryByRole("button", { name: "Stream link" }),
    ).not.toBeOnTheScreen();
    // When: time-dependent eligibility changes and the user refreshes the match itself.
    recovering = true;
    context = ownContributions();
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
    // Then: the same entry becomes usable without remount, polling or a separate permission flow.
    expect(
      await screen.findByRole("button", { name: "Stream link" }),
    ).toBeOnTheScreen();
  },
);
afterEach(async () => {
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await act(async () => {
    await client.cancelQueries();
  });
  await cleanup();
  client.clear();
  process.env = { ...previous };
  jest.restoreAllMocks();
});

it.each([true, false])(
  "opens only a neutral native entry for authenticated=%s",
  async (authenticated) => {
    // Given: the real session and eligibility owners; neither Pro nor support controls the entry.
    mockAuth0.hasValidCredentials.mockResolvedValue(authenticated);
    const user = userEvent.setup();
    await render(
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <AccountSessionProvider>
            <ApplicationAccessProvider>
              <Entry />
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
  const response = Promise.withResolvers<Response>();
  const peer = mockFetch.getMockImplementation();
  mockFetch.mockImplementation((url, init) => {
    if (String(url).includes("/stream-contributions")) return response.promise;
    if (!peer) throw new Error("Missing test HTTP boundary");
    return peer(url, init);
  });
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AccountSessionProvider>
          <ApplicationAccessProvider>
            <Entry />
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
  await act(async () => {
    response.resolve(Response.json(context));
  });
  await waitFor(() => expect(client.isFetching()).toBe(0));
  // Then: there is no disabled action, refusal copy, or navigation to an unusable form.
  expect(
    screen.queryByRole("button", { name: "Stream link" }),
  ).not.toBeOnTheScreen();
  expect(screen.queryByText(reason)).not.toBeOnTheScreen();
  expect(mockPush).not.toHaveBeenCalled();
});
