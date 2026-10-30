import { accountResponse } from "../../accounts/test-support/account-response";
import type { ReactElement } from "react";
import { type QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
import {
  mockAuth0,
  credentialsFor,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { useAccountSession } from "../../accounts/current-account";
import { useApplicationAccess } from "../../access/queries/use-application-access";
import {
  ConsultationProviders,
  consultationPublicClient,
} from "../test-support/consultation-providers";
import {
  consultationResponse,
  clubDetail,
  matchDetail,
  sportingId,
} from "../test-support/consultation-data";
import { ClubScreen } from "../screens/club-screen";
import { TeamScreen } from "../screens/team-screen";
import { PoolScreen } from "../screens/pool-screen";
import { MatchScreen } from "../screens/match-screen";
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
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
  useRouter: () => ({ back: mockBack, push: mockPush, canGoBack: () => true }),
  useNavigation: () => ({ isFocused: () => true }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

const environment = { ...process.env };
let client: QueryClient;
let publicClient: QueryClient;
let detail = matchDetail();
const season = detail.match.pool.season;
const otherId = "00000000-0000-4000-8000-000000000008";

function reads(url: string) {
  return consultationResponse(url, detail);
}

/** Captures the real principal-owned QueryClient without replacing session or query behavior. */
function captureClient(current: QueryClient) {
  client = current;
}

/** Renders real feature composition and providers; the caller decides which reads should settle. */
function renderPage(content: ReactElement) {
  return render(content, {
    wrapper: ({ children }) => (
      <ConsultationProviders
        publicClient={publicClient}
        onClient={captureClient}
      >
        {children}
      </ConsultationProviders>
    ),
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  publicClient = consultationPublicClient();
  detail = matchDetail();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "test-client";
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  jest.mocked(initializeV2Installation).mockResolvedValue(undefined);
  mockFetch.mockReset().mockImplementation(reads);
});
afterEach(async () => {
  await cleanup();
  client?.clear();
  publicClient.clear();
  await act(async () => jest.runOnlyPendingTimersAsync());
  jest.useRealTimers();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

const pages = [
  {
    kind: "club",
    path: `/clubs/${sportingId}`,
    label: "Club des Rives",
    element: <ClubScreen clubId={sportingId} />,
  },
  {
    kind: "team",
    path: `/teams/${sportingId}`,
    label: "Équipe des Rives",
    element: <TeamScreen teamId={sportingId} />,
  },
  {
    kind: "pool",
    path: `/pools/${sportingId}`,
    label: "Pool",
    element: <PoolScreen poolId={sportingId} />,
  },
  {
    kind: "match",
    path: `/matches/${sportingId}`,
    label: "Home",
    element: <MatchScreen matchId={sportingId} />,
  },
];

it.each(pages)(
  "distinguishes waiting and initial failure on $kind, then explicitly retries",
  async ({ path, element, label }) => {
    // Given
    const response = Promise.withResolvers<Response>();
    mockFetch.mockImplementation((url: string) =>
      new URL(url).pathname === path ? response.promise : reads(url),
    );
    await renderPage(element);
    expect(
      await screen.findByRole("progressbar", { name: "Chargement en cours" }),
    ).toBeOnTheScreen();
    expect(screen.queryByText(label)).not.toBeOnTheScreen();

    // When
    await act(() =>
      response.resolve(Response.json({ status: 503 }, { status: 503 })),
    );

    // Then
    expect(
      await screen.findByRole("alert", { name: "Une erreur est survenue" }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("progressbar", { name: "Chargement en cours" }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(/Aucune équipe|Aucun match/),
    ).not.toBeOnTheScreen();

    // When
    mockFetch.mockImplementation(reads);
    await userEvent
      .setup()
      .press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    expect((await screen.findAllByText(label)).length).toBeGreaterThan(0);
  },
);

it.each(pages)(
  "keeps authorized $kind facts after a failed owner invalidation",
  async ({ path, element, label }) => {
    // Given
    await renderPage(element);
    await screen.findAllByText(label);
    await layoutNativeTabs();
    mockFetch.mockImplementation((url: string) =>
      new URL(url).pathname === path
        ? Promise.reject(new TypeError("offline"))
        : reads(url),
    );

    // When: an ordinary owner invalidation rereads only the addressed detail.
    await act(() =>
      client.invalidateQueries({ queryKey: [path], exact: true }),
    );

    // Then
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(
      screen.queryByRole("button", { name: "Réessayer" }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(/Aucune équipe|Aucun match/),
    ).not.toBeOnTheScreen();

    // When
    mockFetch.mockImplementation(reads);
    await act(() =>
      client.invalidateQueries({ queryKey: [path], exact: true }),
    );

    // Then
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeOnTheScreen(),
    );
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  },
);

it.each([401, 403, 404])(
  "withdraws refused sensitive club facts (%s) before a later technical failure",
  async (status) => {
    // Given
    await renderPage(<ClubScreen clubId={sportingId} />);
    await screen.findByText("Club des Rives");
    await layoutNativeTabs();
    await screen.findByRole("link", { name: /E-mail du club/ });
    mockFetch.mockImplementation((url: string) =>
      url.endsWith(`/clubs/${sportingId}`)
        ? Promise.resolve(Response.json({ status }, { status }))
        : reads(url),
    );

    // When
    await act(() =>
      client.invalidateQueries({
        queryKey: [`/clubs/${sportingId}`],
        exact: true,
      }),
    );
    await screen.findByRole("alert");
    mockFetch.mockImplementation((url: string) =>
      url.endsWith(`/clubs/${sportingId}`)
        ? Promise.reject(new TypeError("offline"))
        : reads(url),
    );
    await userEvent
      .setup()
      .press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(screen.queryByText("Club des Rives")).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("link", { name: /E-mail du club/ }),
    ).not.toBeOnTheScreen();
    expect(screen.getByRole("alert")).toBeOnTheScreen();
  },
);

it("distinguishes a failed teams section from a successful empty season and keeps club contacts usable", async () => {
  // Given
  const user = userEvent.setup();
  mockFetch.mockImplementation((url: string) =>
    url.includes("/teams?")
      ? Promise.resolve(Response.json({ status: 503 }, { status: 503 }))
      : reads(url),
  );
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByText("Club des Rives");
  await layoutNativeTabs();
  await screen.findByText("Coordonnées");
  await layoutNativeTabs();

  // When
  await user.press(screen.getByRole("tab", { name: "Équipes" }));

  // Then
  expect(await screen.findByRole("alert")).toBeOnTheScreen();
  expect(
    screen.queryByText("Aucune équipe pour cette saison"),
  ).not.toBeOnTheScreen();
  expect(screen.getByText("Club des Rives")).toBeOnTheScreen();

  // When
  mockFetch.mockImplementation(reads);
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByText("Aucune équipe pour cette saison"),
  ).toBeOnTheScreen();
  await user.press(screen.getByRole("tab", { name: "Infos" }));
  expect(
    await screen.findByRole("link", { name: /E-mail du club/ }),
  ).toBeOnTheScreen();
});

it("keeps a pool's calendar and map independent of failed standings without waiting for Pro", async () => {
  // Given
  const user = userEvent.setup();
  mockFetch.mockImplementation((url: string) =>
    url.endsWith("/standings")
      ? Promise.resolve(Response.json({ status: 503 }, { status: 503 }))
      : reads(url),
  );
  await renderPage(<PoolScreen poolId={sportingId} />);
  await screen.findByText("Pool");
  await layoutNativeTabs();
  await screen.findByRole("alert");

  // When
  await user.press(screen.getByRole("tab", { name: "À venir" }));

  // Then
  expect(
    await screen.findByText("Aucun match pour cette sélection"),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("tab", { name: "Carte" }));

  // Then
  expect(
    await screen.findByText("Aucune localisation disponible"),
  ).toBeOnTheScreen();
  expect(mockAuth0.getCredentials).not.toHaveBeenCalled();
  expect(screen.queryByText(/Acheter|Vérification Pro/)).not.toBeOnTheScreen();
});

it("removes deliberately absent contacts and native artwork on their own successful read", async () => {
  // Given
  mockFetch.mockImplementation((url: string) =>
    url.endsWith(`/clubs/${sportingId}`)
      ? Promise.resolve(
          Response.json({
            ...clubDetail("Club des Rives"),
            club: {
              id: sportingId,
              name: "Club des Rives",
              logoUrl: `/clubs/${sportingId}/logo`,
            },
            contacts: { email: "club@example.invalid" },
          }),
        )
      : reads(url),
  );
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByRole("image", { name: "Logo : Club des Rives" });

  // When
  mockFetch.mockImplementation((url: string) =>
    url.endsWith(`/clubs/${sportingId}`)
      ? Promise.resolve(Response.json(clubDetail("Club des Rives")))
      : reads(url),
  );
  await act(() =>
    client.invalidateQueries({
      queryKey: [`/clubs/${sportingId}`],
      exact: true,
    }),
  );

  // Then
  expect(
    screen.queryByRole("link", { name: /E-mail du club/ }),
  ).not.toBeOnTheScreen();
  await waitFor(() =>
    expect(
      screen.queryByRole("image", { name: "Logo : Club des Rives" }),
    ).not.toBeOnTheScreen(),
  );
  expect(
    screen.getByRole("image", { name: "Logo absent : Club des Rives" }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).includes("/logo")),
  ).toBe(false);
});

it("never lets a delayed resource response replace the newly selected match", async () => {
  // Given
  const old = Promise.withResolvers<Response>();
  const current = {
    ...matchDetail(),
    match: {
      ...matchDetail().match,
      id: otherId,
      home: { id: otherId, name: "Current team" },
    },
  };
  mockFetch.mockImplementation((url: string) =>
    url.endsWith(`/matches/${sportingId}`)
      ? old.promise
      : url.endsWith(`/matches/${otherId}`)
        ? Promise.resolve(Response.json(current))
        : reads(url),
  );
  const rendered = await renderPage(<MatchScreen matchId={sportingId} />);
  await screen.findByRole("progressbar", { name: "Chargement en cours" });

  // When
  await rendered.rerender(<MatchScreen matchId={otherId} />);
  await screen.findByText("Current team");
  await act(() => old.resolve(Response.json(detail)));

  // Then
  expect(screen.getByText("Current team")).toBeOnTheScreen();
  expect(screen.queryByText("Home")).not.toBeOnTheScreen();
});

it("keeps season selection when an earlier teams request completes after a new selection", async () => {
  // Given
  const older = { id: otherId, label: "2025/2026", startYear: 2025 };
  const old = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url: string) => {
    const parsed = new URL(url);
    if (parsed.pathname === `/clubs/${sportingId}`)
      return Promise.resolve(
        Response.json({
          ...clubDetail("Club des Rives"),
          seasons: [season, older],
        }),
      );
    if (parsed.pathname.endsWith("/teams"))
      return parsed.searchParams.get("seasonId") === season.id
        ? old.promise
        : Promise.resolve(Response.json({ seasonId: older.id, items: [] }));
    return reads(url);
  });
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findByText("Club des Rives");
  await layoutNativeTabs();
  await screen.findByText("Coordonnées");
  await layoutNativeTabs();
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await screen.findByRole("progressbar", { name: "Chargement en cours" });

  // When
  await user.press(
    screen.getByRole("button", { name: `Saison ${season.label}` }),
  );
  await user.press(screen.getByRole("button", { name: older.label }));
  await layoutNativeTabs();
  await screen.findByText("Aucune équipe pour cette saison");
  await act(() =>
    old.resolve(
      Response.json({
        seasonId: season.id,
        items: [
          {
            team: { id: sportingId, name: "Obsolete team" },
            season,
            classification: {},
            professional: false,
          },
        ],
      }),
    ),
  );

  // Then
  expect(
    screen.getByRole("button", { name: `Saison ${older.label}` }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Obsolete team")).not.toBeOnTheScreen();
});

/** Explicit session/admission actions use real owners; no state/query hook is replaced by the fixture. */
function ContextActions() {
  const session = useAccountSession();
  const access = useApplicationAccess();
  return (
    <>
      <Text>{session.subject ?? "guest"}</Text>
      <Text>{session.accountId ? "Account ready" : "Account pending"}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Switch account"
        onPress={() => void session.signIn("mobile-test")}
      >
        <Text>Switch account</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Use maintenance bypass"
        onPress={() => access.requestBypass(session, true)}
      >
        <Text>Use maintenance bypass</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Use ordinary admission"
        onPress={access.clearBypass}
      >
        <Text>Use ordinary admission</Text>
      </Pressable>
    </>
  );
}

it("keeps a delayed old-account public result outside the new principal's private cache while Pro is unknown", async () => {
  // Given
  const old = Promise.withResolvers<Response>();
  const started = Promise.withResolvers<void>();
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|first"));
  mockAuth0.webAuth.mockResolvedValue(credentialsFor("auth0|second"));
  mockAuth0.saveCredentials.mockResolvedValue(undefined);
  let clubReads = 0;
  mockFetch.mockImplementation((url: string) => {
    if (url.endsWith("/accounts/me"))
      return Promise.resolve(Response.json(accountResponse()));
    if (url.endsWith(`/clubs/${sportingId}`)) {
      if (++clubReads === 1) {
        started.resolve();
        return old.promise;
      }
      return Promise.resolve(Response.json(clubDetail("Current account club")));
    }
    return reads(url);
  });
  await renderPage(
    <>
      <ContextActions />
      <ClubScreen clubId={sportingId} />
    </>,
  );
  await act(() => started.promise);
  await screen.findByText("auth0|first");
  const previousClient = client;

  // When
  mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|second"));
  await userEvent
    .setup()
    .press(screen.getByRole("button", { name: "Switch account" }));
  await screen.findByText("Current account club");
  await act(() =>
    old.resolve(Response.json(clubDetail("Obsolete account club"))),
  );

  // Then
  expect(client).not.toBe(previousClient);
  expect(screen.getByText("auth0|second")).toBeOnTheScreen();
  expect(screen.queryByText("Obsolete account club")).not.toBeOnTheScreen();
  expect(screen.getByText("Current account club")).toBeOnTheScreen();
});

it.each(["current", "former"] as const)(
  "keeps a %s bypass image refusal local to its credentialed context",
  async (context) => {
    // Given
    const bypass = Promise.withResolvers<Response>();
    const maintainer = accountResponse();
    maintainer.permissions.bypassMaintenance = true;
    const artwork = Promise.withResolvers<Response>();
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    mockAuth0.getCredentials.mockResolvedValue(
      credentialsFor("auth0|maintainer"),
    );
    const logoClub = {
      ...clubDetail("Public club"),
      club: {
        id: sportingId,
        name: "Public club",
        logoUrl: `/clubs/${sportingId}/logo`,
      },
    };
    mockFetch.mockImplementation((url: string, options: RequestInit) => {
      if (url.endsWith("/accounts/me"))
        return Promise.resolve(Response.json(maintainer));
      if (url.endsWith("/application-access")) {
        const access = applicationAccessResponse();
        access.maintenance.active = true;
        return Promise.resolve(Response.json(access));
      }
      if (url.endsWith(`/clubs/${sportingId}`))
        return new Headers(options.headers).has("Blockout-Maintenance-Bypass")
          ? bypass.promise
          : Promise.resolve(Response.json(logoClub));
      if (url.endsWith("/logo")) return artwork.promise;
      return reads(url);
    });
    await renderPage(
      <>
        <ContextActions />
        <ClubScreen clubId={sportingId} />
      </>,
    );
    await screen.findByText("Public club");
    await screen.findByText("Account ready");
    await waitFor(() => expect(client.isFetching()).toBe(0));
    const user = userEvent.setup();

    // When
    await user.press(
      screen.getByRole("button", { name: "Use maintenance bypass" }),
    );
    await screen.findByRole("progressbar", { name: "Chargement en cours" });
    await act(() =>
      bypass.resolve(
        Response.json({
          ...logoClub,
          contacts: { email: "bypass@example.invalid" },
        }),
      ),
    );
    await screen.findAllByRole("image", {
      name: "Chargement du logo : Public club",
    });
    await layoutNativeTabs();
    await screen.findByRole("link", { name: /bypass@example.invalid/ });
    await waitFor(() =>
      expect(
        mockFetch.mock.calls.some(([url]) => String(url).endsWith("/logo")),
      ).toBe(true),
    );
    if (context === "former")
      await user.press(
        screen.getByRole("button", { name: "Use ordinary admission" }),
      );
    await act(() =>
      artwork.resolve(Response.json({ status: 404 }, { status: 404 })),
    );
    if (context === "current") {
      await screen.findAllByRole("image", {
        name: "Logo indisponible : Public club",
      });
      expect(
        screen.getByRole("link", { name: /bypass@example.invalid/ }),
      ).toBeOnTheScreen();
      mockFetch.mockImplementation((url: string) =>
        url.endsWith("/logo")
          ? Promise.reject(new TypeError("offline"))
          : url.endsWith(`/clubs/${sportingId}`)
            ? Promise.resolve(Response.json(logoClub))
            : reads(url),
      );
      await act(() =>
        client.refetchQueries({
          predicate: (query) =>
            query.queryKey.includes(`/clubs/${sportingId}/logo`),
        }),
      );
      expect(
        screen.queryByRole("image", { name: "Logo : Public club" }),
      ).not.toBeOnTheScreen();
      await user.press(
        screen.getByRole("button", { name: "Use ordinary admission" }),
      );
    }

    // Then
    expect(
      screen.queryByRole("link", { name: /bypass@example.invalid/ }),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByRole("image", { name: "Logo : Public club" }),
    ).toBeOnTheScreen();
    const logoRequests = mockFetch.mock.calls.filter(([url]) =>
      String(url).endsWith("/logo"),
    );
    expect(new Headers(logoRequests[0][1].headers).get("Authorization")).toBe(
      "Bearer test-access-token",
    );
  },
);

it.each([
  {
    kind: "club",
    element: <ClubScreen clubId={sportingId} />,
    path: `/clubs/${sportingId}`,
    label: "Club des Rives",
  },
  {
    kind: "match",
    element: <MatchScreen matchId={sportingId} />,
    path: `/matches/${sportingId}`,
    label: "Home",
  },
])(
  "keeps $kind content and only one toast after a failed native pull, then recovers on the next pull",
  async ({ element, path, label }) => {
    // Given
    await renderPage(element);
    await screen.findAllByText(label);
    await layoutNativeTabs();
    await waitFor(() => expect(client.isFetching()).toBe(0));
    mockFetch.mockImplementation((url: string) =>
      new URL(url).pathname === path
        ? Promise.reject(new TypeError("offline"))
        : reads(url),
    );

    // When: userEvent cannot perform the native RefreshControl gesture.
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then
    expect(
      await screen.findByRole("alert", {
        name: "Une erreur est survenue. Veuillez réessayer plus tard.",
      }),
    ).toBeOnTheScreen();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: "Réessayer" }),
    ).not.toBeOnTheScreen();
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy();

    // When
    mockFetch.mockImplementation(reads);
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  },
);
