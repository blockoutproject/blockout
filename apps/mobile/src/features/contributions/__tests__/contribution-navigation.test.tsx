import {
  useLayoutEffect,
  useState,
  type PropsWithChildren,
  ComponentType,
} from "react";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Stack, router } from "expo-router";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
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
import { OwnContributionsScreen } from "../screens/own-contributions-screen";
import { ContributionScreen } from "../screens/contribution-screen";
import { matchDetail } from "../../sporting/test-support/consultation-data";
import { ownContributions } from "../test-support/contribution-data";
import { MatchScreen } from "../../sporting/screens/match-screen";
import { AdvertisingProviders } from "../../advertising/test-support/advertising-providers";
import * as proSessionModule from "../../pro/pro-session";
import { prepareProNativeIO } from "../../pro/test-support/pro-harness";
import SignInInvitationRoute from "../../../app/(ordinary)/sign-in-invitation";
import { AccessAdmissionProvider } from "../../access/queries/use-access-admission";

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
let privateClient: ReturnType<typeof createQueryClient>;
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
    await privateClient.cancelQueries();
  });
  await cleanup();
  client.clear();
  privateClient?.clear();
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
            <PrivateQueries>
              <AccountFeedbackProvider>
                <Stack />
              </AccountFeedbackProvider>
            </PrivateQueries>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Supplies the real F12 ordinary admission to the production F05 route, as the application root does. */
function InvitationRoute() {
  return (
    <AccessAdmissionProvider>
      <SignInInvitationRoute />
    </AccessAdmissionProvider>
  );
}

it.each([
  { name: "first submission", state: undefined, canSubmit: true },
  { name: "pending proposal", state: "pending", canSubmit: false },
  { name: "terminal proposal", state: "rejected", canSubmit: false },
  { name: "published proposal", state: "active", canSubmit: false },
] as const)(
  "opens the dedicated form or management screen from the match card for $name",
  async ({ state, canSubmit }) => {
    // Given
    jest.replaceProperty(
      proSessionModule,
      "proSession",
      proSessionModule.createProSession(),
    );
    prepareProNativeIO();
    const boundary = mockFetch.getMockImplementation();
    if (!boundary) throw new Error("Missing test HTTP boundary");
    const versionId = "00000000-0000-4000-8000-000000000004";
    mockFetch.mockImplementation((url, init) => {
      const path = new URL(String(url)).pathname;
      if (path === `/matches/${match.match.id}`)
        return Promise.resolve(
          Response.json({
            ...match,
            ...(state === "active"
              ? {
                  streamUrl: "https://youtu.be/personal",
                  streamContributionId: versionId,
                }
              : {}),
          }),
        );
      if (path.includes("/stream-contributions"))
        return Promise.resolve(
          Response.json(
            ownContributions({
              proposalCount: state ? 1 : 0,
              eligibility: { canSubmit, requiresApproval: false },
              ...(state === "active"
                ? {
                    activeContribution: {
                      id: versionId,
                      url: "https://youtu.be/personal",
                      platform: "youtube",
                      state: "active",
                      submittedAt: "2026-10-28T09:00:00Z",
                      canCancel: false,
                      canWithdraw: true,
                    },
                  }
                : {}),
              items: state
                ? [
                    {
                      id: versionId,
                      url: "https://youtu.be/personal",
                      platform: "youtube",
                      state,
                      submittedAt: "2026-10-28T09:00:00Z",
                      canCancel: state === "pending",
                      canWithdraw: state === "active",
                    },
                  ]
                : [],
            }),
          ),
        );
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
        "matches/[matchId]/contribution": () => (
          <ContributionScreen matchId={match.match.id} />
        ),
      },
      { initialUrl: "/" },
    );
    const entry = await screen.findByRole("button", {
      name:
        state === "active"
          ? "Modifier le lien"
          : state
            ? "Gérer mes propositions"
            : "Proposer un lien",
    });
    expect(
      screen.getByRole("header", { name: "Stream link" }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Mes contributions")).not.toBeOnTheScreen();
    expect(screen.queryByText("Gérer mes propositions")).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Stream link" }),
    ).not.toBeOnTheScreen();
    if (state !== "active")
      expect(
        screen.getByText("Aucun lien disponible pour ce match."),
      ).toBeOnTheScreen();

    // When
    expect(
      screen.queryByRole("link", { name: "Ouvrir le lien" }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText("Signaler")).not.toBeOnTheScreen();
    await user.press(entry);

    // Then
    if (state) {
      expect(
        await screen.findByRole("header", { name: "Mes propositions (1)" }),
      ).toBeOnTheScreen();
    } else {
      expect(
        await screen.findByLabelText("Adresse du lien"),
      ).toHaveDisplayValue("");
      expect(
        screen.queryByRole("header", { name: "Mes propositions (0)" }),
      ).not.toBeOnTheScreen();
    }
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(
      mockFetch.mock.calls.some(
        ([, init]) => init?.method === "POST" || init?.method === "PATCH",
      ),
    ).toBe(false);
  },
);

it("opens the existing guest invitation from an empty Stream link card without retaining a command", async () => {
  // Given
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  const user = userEvent.setup();
  await renderRouter(
    {
      _layout: Layout,
      index: () => (
        <AdvertisingProviders>
          <MatchScreen matchId={match.match.id} />
        </AdvertisingProviders>
      ),
      "sign-in-invitation": InvitationRoute,
    },
    { initialUrl: "/" },
  );
  const manage = await screen.findByRole("button", {
    name: "Proposer un lien",
  });
  expect(
    screen.getByText("Aucun lien disponible pour ce match."),
  ).toBeOnTheScreen();

  // When
  await user.press(manage);

  // Then
  expect(
    await screen.findByText("Connectez-vous pour proposer un Stream link"),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Se connecter" }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) =>
      String(url).includes("/stream-contributions"),
    ),
  ).toBe(false);
  expect(Alert.alert).not.toHaveBeenCalled();
});

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
  await screen.findByRole("button", { name: "Gérer mes propositions" });

  // When: a foreground public read refuses the match before the history route is opened.
  phase = "refused";
  await act(async () => {
    await privateClient.refetchQueries({
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
  await waitFor(() => expect(privateClient.isFetching()).toBe(0));

  // Then: technical mount failures cannot restore details revoked by the previous observer.
  expect(
    screen.queryByText("https://youtu.be/private-history"),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Retirer" }),
  ).not.toBeOnTheScreen();
  expect(
    await screen.findByRole("button", { name: "Réessayer" }),
  ).toBeOnTheScreen();

  // When: the public refusal can cancel a mount read; an explicit retry now reaches both failing endpoints.
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled(),
  );
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await waitFor(() => expect(ownReads).toBeGreaterThan(1));
  await waitFor(() => expect(privateClient.isFetching()).toBe(0));

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
    await screen.findByText("https://youtu.be/private-history"),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Adresse du lien")).toHaveDisplayValue(
    "https://youtu.be/private-history",
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Retirer" })).toBeEnabled(),
  );
});

it("leaves an acknowledged clean form without asking to discard the saved address", async () => {
  // Given
  await renderRouter(
    {
      _layout: Layout,
      index: () => <Text>Unrelated origin</Text>,
      "matches/[matchId]": () => <Text>Match origin</Text>,
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
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls.at(-1)?.[2]
      ?.find((button) => button.text === "Soumettre le lien")
      ?.onPress?.(),
  );

  // Then
  await waitFor(() =>
    expect(screen.getByText("Match origin")).toBeOnTheScreen(),
  );
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(jest.mocked(Alert.alert).mock.calls[0]?.[0]).toBe(
    "Soumettre ce lien ?",
  );
});

it("discards an unsent contribution draft when its route is removed", async () => {
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
  const user = userEvent.setup();
  await act(() =>
    router.push({
      pathname: "/matches/[matchId]/contribution",
      params: { matchId: match.match.id },
    }),
  );
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    "https://youtu.be/unsent",
  );
  // When
  await act(() => router.replace("/"));
  const discard = jest
    .mocked(Alert.alert)
    .mock.calls.at(-1)?.[2]
    ?.find((button) => button.style === "destructive");
  if (discard) await act(async () => discard.onPress?.());
  await screen.findByText("Match origin");
  await act(() =>
    router.push({
      pathname: "/matches/[matchId]/contribution",
      params: { matchId: match.match.id },
    }),
  );
  // Then
  expect(await screen.findByLabelText("Adresse du lien")).toHaveDisplayValue(
    "",
  );
  expect(
    mockFetch.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toHaveLength(0);
});

it("keeps a new visit's draft when an older detached submission completes", async () => {
  // Given
  const user = userEvent.setup();
  const response = Promise.withResolvers<Response>();
  const peer = mockFetch.getMockImplementation();
  if (!peer) throw new Error("Synthetic HTTP is required");
  mockFetch.mockImplementation((url, init) =>
    init?.method === "POST" ? response.promise : peer(url, init),
  );
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
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    "https://youtu.be/original",
  );
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls.at(-1)?.[2]
      ?.find((button) => button.text === "Soumettre le lien")
      ?.onPress?.(),
  );
  // When
  await act(() => router.replace("/"));
  const discard = jest
    .mocked(Alert.alert)
    .mock.calls.at(-1)?.[2]
    ?.find((button) => button.style === "destructive");
  if (discard) await act(async () => discard.onPress?.());
  await screen.findByText("Match origin");
  await act(() =>
    router.push({
      pathname: "/matches/[matchId]/contribution",
      params: { matchId: match.match.id },
    }),
  );
  await screen.findByLabelText("Adresse du lien");
  await waitFor(() =>
    expect(screen.getByLabelText("Adresse du lien")).toBeEnabled(),
  );
  await user.type(
    screen.getByLabelText("Adresse du lien"),
    "https://youtu.be/new-draft",
  );
  expect(
    screen.getByDisplayValue("https://youtu.be/new-draft"),
  ).toBeOnTheScreen();
  await act(async () =>
    response.resolve(
      Response.json(
        {
          revision: "next",
          contribution: {
            id: "00000000-0000-4000-8000-000000000003",
            url: "https://youtu.be/original",
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
  // Then
  expect(
    screen.getByDisplayValue("https://youtu.be/new-draft"),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toHaveLength(1);
});

it("keeps a confirmed replacement distinct from retained proposals after returning to the match", async () => {
  // Given
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  const boundary = mockFetch.getMockImplementation();
  if (!boundary) throw new Error("Missing test HTTP boundary");
  let acknowledged = false;
  let submissions = 0;
  const previous = {
    id: "00000000-0000-4000-8000-000000000004",
    url: "https://youtu.be/previous",
    platform: "youtube" as const,
    state: "active" as const,
    submittedAt: "2026-10-28T09:00:00Z",
    canCancel: false,
    canWithdraw: true,
  };
  mockFetch.mockImplementation(async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path === `/matches/${match.match.id}`)
      return Response.json({
        ...match,
        streamUrl: previous.url,
        streamContributionId: previous.id,
      });
    if (path.includes("/stream-contributions")) {
      if (init?.method === "POST") {
        submissions++;
        acknowledged = true;
        return boundary(url, init);
      }
      if (acknowledged) throw new TypeError("Controlled owner read failure");
      return Response.json(
        ownContributions({
          proposalCount: 1,
          activeContribution: previous,
          items: [previous],
        }),
      );
    }
    return boundary(url, init);
  });
  const user = userEvent.setup();
  await renderRouter(
    {
      _layout: Layout,
      "matches/[matchId]": () => (
        <AdvertisingProviders>
          <MatchScreen matchId={match.match.id} />
        </AdvertisingProviders>
      ),
      "matches/[matchId]/contributions": () => (
        <OwnContributionsScreen matchId={match.match.id} />
      ),
    },
    { initialUrl: `/matches/${match.match.id}` },
  );
  await user.press(
    await screen.findByRole("button", { name: "Modifier le lien" }),
  );
  await user.clear(await screen.findByLabelText("Adresse du lien"));
  await user.type(
    screen.getByLabelText("Adresse du lien"),
    "https://youtu.be/example",
  );

  // When
  await user.press(screen.getByRole("button", { name: "Remplacer le lien" }));
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls.at(-1)?.[2]
      ?.find((button) => button.text === "Remplacer le lien")
      ?.onPress?.(),
  );
  await waitFor(() =>
    expect(screen).toHavePathname(`/matches/${match.match.id}`),
  );
  await screen.findByRole("button", { name: "Réessayer" });
  expect(
    screen.queryByRole("link", { name: "Ouvrir le lien" }),
  ).not.toBeOnTheScreen();
  await act(() =>
    router.push({
      pathname: "/matches/[matchId]/contributions",
      params: { matchId: match.match.id },
    }),
  );

  // Then
  expect(await screen.findByText("Votre lien public")).toBeOnTheScreen();
  expect(
    screen.queryByText(
      /Les modifications déjà confirmées restent enregistrées/,
    ),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Réessayer la lecture" }),
  ).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Retirer" })).toBeDisabled();
  expect(submissions).toBe(1);
  expect(Alert.alert).toHaveBeenCalledTimes(1);
});

it("returns from the owned editor to the exact match after withdrawing its active projection", async () => {
  // Given: the acknowledgement removes the public editor while the retained draft is dirty.
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  const boundary = mockFetch.getMockImplementation();
  if (!boundary) throw new Error("Missing test HTTP boundary");
  const active = {
    id: "00000000-0000-4000-8000-000000000004",
    url: "https://youtu.be/public",
    platform: "youtube" as const,
    state: "active" as const,
    submittedAt: "2026-10-28T09:00:00Z",
    canCancel: false,
    canWithdraw: true,
  };
  let withdrawn = false;
  mockFetch.mockImplementation(async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path === `/matches/${match.match.id}`)
      return Response.json({
        ...match,
        ...(withdrawn
          ? {}
          : { streamUrl: active.url, streamContributionId: active.id }),
      });
    if (path.includes("/stream-contributions")) {
      if (init?.method === "PATCH") {
        withdrawn = true;
        return Response.json({
          revision: "withdrawn",
          contribution: { ...active, state: "withdrawn", canWithdraw: false },
        });
      }
      return Response.json(
        ownContributions({
          proposalCount: 1,
          activeContribution: withdrawn ? undefined : active,
          items: [
            {
              ...active,
              ...(withdrawn ? { state: "withdrawn", canWithdraw: false } : {}),
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
      "matches/[matchId]": () => (
        <AdvertisingProviders>
          <MatchScreen matchId={match.match.id} />
        </AdvertisingProviders>
      ),
      "matches/[matchId]/contributions": () => (
        <OwnContributionsScreen matchId={match.match.id} />
      ),
    },
    { initialUrl: `/matches/${match.match.id}` },
  );
  await user.press(
    await screen.findByRole("button", { name: "Modifier le lien" }),
  );
  await user.clear(await screen.findByLabelText("Adresse du lien"));
  await user.type(
    screen.getByLabelText("Adresse du lien"),
    "https://youtu.be/unsaved",
  );

  // When
  await user.press(screen.getByRole("button", { name: "Retirer" }));
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls[0]?.[2]?.find((button) => button.text === "Retirer le lien")
      ?.onPress?.(),
  );

  // Then
  await waitFor(() =>
    expect(screen).toHavePathname(`/matches/${match.match.id}`),
  );
  expect(
    await screen.findByRole("button", { name: "Proposer un lien" }),
  ).toBeOnTheScreen();
  expect(screen.queryByLabelText("Adresse du lien")).not.toBeOnTheScreen();
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(([, init]) => init?.method === "PATCH"),
  ).toHaveLength(1);
});

/** Uses one-shot read failures and keeps unused mutation GC timers out of the Jest process. */
function PrivateQueries({ children }: PropsWithChildren) {
  const cache = useQueryClient();
  useState(() => {
    cache.setQueryDefaults([], { retry: false });
    cache.setMutationDefaults([], { gcTime: Infinity });
  });
  useLayoutEffect(() => {
    privateClient = cache;
  }, [cache]);
  return children;
}
