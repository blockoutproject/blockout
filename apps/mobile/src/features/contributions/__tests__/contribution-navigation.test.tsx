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
import { Alert, Button, Text } from "react-native";
import type { ComponentType } from "react";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { createQueryClient } from "../../../shared/query/query-client";
import {
  AccessAdmissionProvider,
  useAccessAdmission,
} from "../../access/queries/use-access-admission";
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
import { OwnContributionsScreen } from "../screens/own-contributions-screen";
import { ContributionScreen } from "../screens/contribution-screen";
import { matchDetail } from "../../sporting/test-support/consultation-data";
import { ownContributions } from "../test-support/contribution-data";
import { MatchScreen } from "../../sporting/screens/match-screen";
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

/** Keeps the actual router, discard guard, form, Query and session; native I/O, alerts and HTTP alone are controlled. */
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

it("keeps history revoked when a refused match opens it before technical mount reads fail", async () => {
  // Given: the real match screen keeps its F08 observer mounted after public data is refused.
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  const boundary = mockFetch.getMockImplementation();
  if (!boundary) throw new Error("Missing test HTTP boundary");
  let phase: "authorized" | "refused" | "unavailable" = "authorized";
  let ownReads = 0;
  mockFetch.mockImplementation(async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path === `/matches/${match.match.id}` && phase !== "authorized") {
      const status = phase === "refused" ? 404 : 500;
      return Response.json({ status }, { status });
    }
    if (path.includes("/stream-contributions")) {
      ownReads++;
      if (phase === "unavailable")
        return Response.json({ status: 500 }, { status: 500 });
      return Response.json(
        ownContributions({
          proposalCount: 1,
          items: [
            {
              id: "00000000-0000-4000-8000-000000000004",
              url: "https://youtu.be/private-history",
              platform: "youtube",
              state: "active",
              submittedAt: "2026-10-28T09:00:00Z",
              canCancel: false,
              canWithdraw: true,
            },
          ],
        }),
      );
    }
    return boundary(url, init);
  });
  const user = userEvent.setup();
  await renderRouter(
    {
      _layout: Layout,
      index: () => (
        <AdvertisingProviders>
          <MatchScreen matchId={match.match.id} />
        </AdvertisingProviders>
      ),
      "matches/[matchId]/contributions": () => (
        <OwnContributionsScreen matchId={match.match.id} />
      ),
    },
    { initialUrl: "/" },
  );
  await screen.findByRole("button", { name: "Mes contributions" });

  // When: a foreground public read refuses the match before the history route is opened.
  phase = "refused";
  await act(async () => {
    await client.refetchQueries({
      predicate: (query) =>
        query.queryKey.includes(`/matches/${match.match.id}`),
    });
  });
  await screen.findByRole("button", { name: "Réessayer" });
  phase = "unavailable";
  await act(() =>
    router.push({
      pathname: "/matches/[matchId]/contributions",
      params: { matchId: match.match.id },
    }),
  );
  await screen.findByText("Lien de diffusion");
  await waitFor(() => expect(client.isFetching()).toBe(0));

  // Then: technical mount failures cannot restore details revoked by the previous observer.
  expect(
    screen.queryByText("https://youtu.be/private-history"),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Retirer" }),
  ).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();

  // When: the public refusal can cancel a mount read; an explicit retry now reaches both failing endpoints.
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled(),
  );
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await waitFor(() => expect(ownReads).toBeGreaterThan(1));
  await waitFor(() => expect(client.isFetching()).toBe(0));

  // Then
  expect(
    screen.queryByText("https://youtu.be/private-history"),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Retirer" }),
  ).not.toBeOnTheScreen();

  // When: current successful reads authorize the match and its personal history again.
  phase = "authorized";
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findAllByText("https://youtu.be/private-history"),
  ).toHaveLength(2);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Retirer" })).toBeEnabled(),
  );
});

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

/** Applies the production F12 guard, so a business dependency failure removes ordinary route owners. */
function ProtectedNavigation() {
  const access = useAccessAdmission();
  return (
    <Stack>
      <Stack.Protected guard={!access.ordinary}>
        <Stack.Screen name="access" />
      </Stack.Protected>
      <Stack.Protected guard={access.ordinary}>
        <Stack.Screen name="index" />
        <Stack.Screen name="matches/[matchId]/contribution" />
      </Stack.Protected>
    </Stack>
  );
}
/** Uses the same actual providers as Layout, adding F12 admission and protected native routes. */
function ProtectedLayout() {
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <AccountFeedbackProvider>
              <AccessAdmissionProvider>
                <ProtectedNavigation />
              </AccessAdmissionProvider>
            </AccountFeedbackProvider>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
/** The gate retries only the real public check and existing-account read. */
function AccessRetry() {
  const access = useAccessAdmission();
  return <Button title="Vérifier accès" onPress={() => access.retry()} />;
}

it("retains the original draft and unresolved command across F12 protected-route removal", async () => {
  // Given
  const reads = mockFetch.getMockImplementation();
  let failRead = false;
  mockFetch.mockImplementation(async (url, init) => {
    if (String(url).includes("/stream-contributions")) {
      if (init?.method === "POST") {
        failRead = true;
        throw new TypeError("Response lost");
      }
      if (failRead)
        return Response.json(
          {
            type: "urn:blockout:problem:unavailable",
            title: "Unavailable",
            status: 503,
          },
          { status: 503 },
        );
    }
    if (!reads) throw new Error("Missing test HTTP boundary");
    return reads(url, init);
  });
  await renderRouter(
    {
      _layout: ProtectedLayout,
      access: AccessRetry,
      index: () => <Text>Match origin</Text>,
      "matches/[matchId]/contribution": () => (
        <ContributionScreen matchId={match.match.id} />
      ),
    },
    { initialUrl: "/" },
  );
  await screen.findByText("Match origin");
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
  await screen.findByRole("button", { name: "Vérifier accès" });
  failRead = false;
  await user.press(screen.getByRole("button", { name: "Vérifier accès" }));
  await screen.findByText("Match origin");
  await act(() =>
    router.push({
      pathname: "/matches/[matchId]/contribution",
      params: { matchId: match.match.id },
    }),
  );
  // Then
  expect(
    await screen.findByDisplayValue("https://youtu.be/example"),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Vérifier la contribution" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Soumettre le lien" }),
  ).toBeDisabled();
});

it("keeps a reopened draft retained when the original detached submission acknowledges later", async () => {
  // Given
  const acknowledged = Promise.withResolvers<Response>();
  const reads = mockFetch.getMockImplementation();
  let refuseMatch = false;
  mockFetch.mockImplementation(async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path.includes("/stream-contributions") && init?.method === "POST")
      return acknowledged.promise;
    if (path === `/matches/${match.match.id}` && refuseMatch)
      return Response.json(
        {
          type: "urn:blockout:problem:unavailable",
          title: "Unavailable",
          status: 503,
        },
        { status: 503 },
      );
    if (!reads) throw new Error("Missing test HTTP boundary");
    return reads(url, init);
  });
  await renderRouter(
    {
      _layout: ProtectedLayout,
      access: AccessRetry,
      index: () => <Text>Match origin</Text>,
      "matches/[matchId]/contribution": () => (
        <ContributionScreen matchId={match.match.id} />
      ),
    },
    { initialUrl: "/" },
  );
  await screen.findByText("Match origin");
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
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));

  // When: a separate current match read closes admission during the pending command.
  refuseMatch = true;
  await act(async () => {
    await client.refetchQueries({
      predicate: (query) =>
        query.queryKey.includes(`/matches/${match.match.id}`),
    });
  });
  await screen.findByRole("button", { name: "Vérifier accès" });
  refuseMatch = false;
  await user.press(screen.getByRole("button", { name: "Vérifier accès" }));
  await screen.findByText("Match origin");
  await act(() =>
    router.push({
      pathname: "/matches/[matchId]/contribution",
      params: { matchId: match.match.id },
    }),
  );
  await screen.findByDisplayValue("https://youtu.be/example");
  await act(async () =>
    acknowledged.resolve(
      Response.json(
        {
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
        },
        { status: 201 },
      ),
    ),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Soumettre le lien" }),
    ).toBeEnabled(),
  );
  await user.clear(screen.getByLabelText("Adresse du lien"));
  await user.type(
    screen.getByLabelText("Adresse du lien"),
    "https://youtu.be/new-draft",
  );

  // When: the reopened form crosses a second independent admission detour.
  refuseMatch = true;
  await act(async () => {
    await client.refetchQueries({
      predicate: (query) =>
        query.queryKey.includes(`/matches/${match.match.id}`),
    });
  });
  await screen.findByRole("button", { name: "Vérifier accès" });
  refuseMatch = false;
  await user.press(screen.getByRole("button", { name: "Vérifier accès" }));
  await screen.findByText("Match origin");
  await act(() =>
    router.push({
      pathname: "/matches/[matchId]/contribution",
      params: { matchId: match.match.id },
    }),
  );

  // Then
  expect(
    await screen.findByDisplayValue("https://youtu.be/new-draft"),
  ).toBeOnTheScreen();
});

it("keeps a confirmed new version distinct from the last known history after its refresh fails", async () => {
  // Given
  const boundary = mockFetch.getMockImplementation();
  if (!boundary) throw new Error("Missing test HTTP boundary");
  let acknowledged = false;
  let submissions = 0;
  mockFetch.mockImplementation(async (url, init) => {
    if (String(url).includes("/stream-contributions")) {
      if (init?.method === "POST") {
        submissions++;
        acknowledged = true;
        return boundary(url, init);
      }
      if (acknowledged) throw new TypeError("Controlled history read failure");
      return Response.json(
        ownContributions({
          proposalCount: 1,
          items: [
            {
              id: "00000000-0000-4000-8000-000000000004",
              url: "https://youtu.be/previous",
              platform: "youtube",
              state: "active",
              submittedAt: "2026-10-28T09:00:00Z",
              canCancel: false,
              canWithdraw: true,
            },
          ],
        }),
      );
    }
    return boundary(url, init);
  });
  const user = userEvent.setup();
  await renderRouter(
    {
      _layout: Layout,
      index: () => <OwnContributionsScreen matchId={match.match.id} />,
      "matches/[matchId]/contribution": () => (
        <ContributionScreen matchId={match.match.id} />
      ),
    },
    { initialUrl: "/" },
  );
  await user.press(await screen.findByRole("button", { name: "Remplacer" }));
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    "https://youtu.be/example",
  );

  // When
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));

  // Then
  expect(
    await screen.findByText("Dernier lien public connu"),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Votre lien public")).not.toBeOnTheScreen();
  expect(
    screen.getByText(/Les modifications déjà confirmées restent enregistrées/),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Retirer" })).toBeDisabled();
  expect(submissions).toBe(1);
  expect(Alert.alert).not.toHaveBeenCalled();
});
