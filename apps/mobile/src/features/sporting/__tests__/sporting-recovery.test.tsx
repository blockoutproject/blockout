import { accountResponse } from "@/features/accounts/test-support/account-response";
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
import { layoutNativeTabs } from "@/shared/native/test-support/tab-view-native";
import {
  mockAuth0,
  credentialsFor,
} from "@/features/accounts/test-support/native-auth0";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import { applicationAccessResponse } from "@/shared/api/test-support/application-access";
import { useAccountSession } from "@/features/accounts/current-account";
import { useApplicationAccess } from "@/features/access/queries/use-application-access";
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
import {
  getGetMatchQueryKey,
  getGetPoolStandingsQueryKey,
} from "../../../../.generated/mobile";

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("@/features/pro/test-support/native-purchases")
    .mockPurchases,
}));
jest.mock("@/features/onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "@/features/accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  // These isolated features control native focus; route integration suites keep Router itself.
  useFocusEffect: (effect: () => void | (() => void)) =>
    jest.requireActual("react").useEffect(effect, [effect]),
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
const otherId = "00000000-0000-4000-8000-000000000008";

/** Controlled transport delegates fixture decoding without replacing feature reads. */
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

/** Measures real scenes beneath the initial presentation so their indispensable reads can resolve. */
async function layoutSportingPage() {
  await screen.findAllByRole("tab", { includeHiddenElements: true });
  await layoutNativeTabs();
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
    loadingLabel: "Chargement du club",
    element: <ClubScreen clubId={sportingId} />,
  },
  {
    kind: "team",
    path: `/teams/${sportingId}`,
    label: "Équipe des Rives",
    loadingLabel: "Chargement de l’équipe",
    element: <TeamScreen teamId={sportingId} />,
  },
  {
    kind: "pool",
    path: `/pools/${sportingId}`,
    label: "Pool",
    loadingLabel: "Chargement de la poule",
    element: <PoolScreen poolId={sportingId} />,
  },
  {
    kind: "match",
    path: `/matches/${sportingId}`,
    label: "Home",
    loadingLabel: "Chargement du match",
    element: <MatchScreen matchId={sportingId} />,
  },
];

it.each(pages)(
  "distinguishes waiting and initial failure on $kind, then explicitly retries",
  async ({ kind, path, element, label, loadingLabel }) => {
    // Given
    const response = Promise.withResolvers<Response>();
    mockFetch.mockImplementation((url: string) =>
      new URL(url).pathname === path ? response.promise : reads(url),
    );
    await renderPage(element);
    expect(
      await screen.findByRole("progressbar", { name: loadingLabel }),
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
      screen.queryByRole("progressbar", { name: loadingLabel }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(/Aucune équipe|Aucun match/),
    ).not.toBeOnTheScreen();

    // When
    mockFetch.mockImplementation(reads);
    await userEvent
      .setup()
      .press(screen.getByRole("button", { name: "Réessayer" }));
    if (kind !== "match") {
      await layoutSportingPage();
    }

    // Then
    expect((await screen.findAllByText(label)).length).toBeGreaterThan(0);
  },
);

it("retains authorized Match facts in Query while the destination shows a failed owner read", async () => {
  // Given
  const path = `/matches/${sportingId}`;
  const label = "Home";
  const queryKey = getGetMatchQueryKey(sportingId);
  await renderPage(<MatchScreen matchId={sportingId} />);
  await screen.findAllByText(label);
  const accepted = client.getQueryData(queryKey);
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname === path
      ? Promise.reject(new TypeError("offline"))
      : reads(url),
  );

  // When: an ordinary owner invalidation rereads only the addressed detail.
  await act(async () => {
    await client.invalidateQueries({ queryKey, exact: true });
    // Query schedules observer notifications at zero delay; commit them before inspecting retained UI.
    await jest.advanceTimersByTimeAsync(0);
  });

  // Then
  expect(client.getQueryState(queryKey)).toMatchObject({
    status: "error",
    fetchStatus: "idle",
  });
  expect(client.getQueryData(queryKey)).toEqual(accepted);
  expect(screen.queryAllByText(label)).toHaveLength(0);
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();
  expect(screen.queryByText(/Aucune équipe|Aucun match/)).not.toBeOnTheScreen();

  // When
  mockFetch.mockImplementation(reads);
  await act(async () => {
    await client.invalidateQueries({ queryKey, exact: true });
    await jest.advanceTimersByTimeAsync(0);
  });

  // Then
  expect(client.getQueryState(queryKey)).toMatchObject({
    status: "success",
    fetchStatus: "idle",
  });
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  expect(screen.getAllByText(label).length).toBeGreaterThan(0);
});

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

it("keeps an admitted pool's calendar and map independent of failed standings without waiting for Pro", async () => {
  // Given
  const user = userEvent.setup();
  let standingsFailed = false;
  mockFetch.mockImplementation((url: string) =>
    url.endsWith("/standings")
      ? Promise.resolve(
          standingsFailed
            ? Response.json({ status: 503 }, { status: 503 })
            : Response.json({
                poolId: sportingId,
                availability: "not-published",
                lastAttemptFailed: false,
                columns: [],
                rows: [],
              }),
        )
      : reads(url),
  );
  await renderPage(<PoolScreen poolId={sportingId} />);
  await layoutSportingPage();
  await screen.findByText("Pool");
  await screen.findByText("Pas de classement pour cette phase");

  // When: only an already admitted standings section becomes unavailable.
  standingsFailed = true;
  await act(() =>
    client.invalidateQueries({
      queryKey: getGetPoolStandingsQueryKey(sportingId),
      exact: true,
    }),
  );

  // Then
  await screen.findByRole("alert");
  expect(screen.getByText("Pool")).toBeOnTheScreen();

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
  await layoutNativeTabs();

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
  await waitFor(() =>
    expect(
      screen.queryByRole("link", { name: /E-mail du club/ }),
    ).not.toBeOnTheScreen(),
  );
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
  mockFetch.mockImplementation((url: string) => {
    if (url.endsWith(`/matches/${sportingId}`)) {
      return old.promise;
    }
    if (url.endsWith(`/matches/${otherId}`)) {
      return Promise.resolve(Response.json(current));
    }
    return reads(url);
  });
  const rendered = await renderPage(<MatchScreen matchId={sportingId} />);
  await screen.findByRole("progressbar", { name: "Chargement du match" });

  // When
  await rendered.rerender(<MatchScreen matchId={otherId} />);
  await screen.findByText("Current team");
  await act(() => old.resolve(Response.json(detail)));

  // Then
  expect(screen.getByText("Current team")).toBeOnTheScreen();
  expect(screen.queryByText("Home")).not.toBeOnTheScreen();
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
    if (url.endsWith("/accounts/me")) {
      return Promise.resolve(Response.json(accountResponse()));
    }
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
      if (url.endsWith("/accounts/me")) {
        return Promise.resolve(Response.json(maintainer));
      }
      if (url.endsWith("/application-access")) {
        const access = applicationAccessResponse();
        access.maintenance.active = true;
        return Promise.resolve(Response.json(access));
      }
      if (url.endsWith(`/clubs/${sportingId}`)) {
        return new Headers(options.headers).has("Blockout-Maintenance-Bypass")
          ? bypass.promise
          : Promise.resolve(Response.json(logoClub));
      }
      if (url.endsWith("/logo")) {
        return artwork.promise;
      }
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
    await layoutNativeTabs();
    await waitFor(() => expect(client.isFetching()).toBe(0));
    const user = userEvent.setup();

    // When
    await user.press(
      screen.getByRole("button", { name: "Use maintenance bypass" }),
    );
    await screen.findByRole("progressbar", { name: "Chargement du club" });
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
    if (context === "former") {
      await user.press(
        screen.getByRole("button", { name: "Use ordinary admission" }),
      );
    }
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
      mockFetch.mockImplementation((url: string) => {
        if (url.endsWith("/logo")) {
          return Promise.reject(new TypeError("offline"));
        }
        if (url.endsWith(`/clubs/${sportingId}`)) {
          return Promise.resolve(Response.json(logoClub));
        }
        return reads(url);
      });
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

it("replaces failed Match content with one destination card and recovers through Retry", async () => {
  // Given
  const path = `/matches/${sportingId}`;
  const label = "Home";
  await renderPage(<MatchScreen matchId={sportingId} />);
  await screen.findAllByText(label);
  await layoutNativeTabs();
  await screen.findByLabelText("Actualiser les données");
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
      name: "Une erreur est survenue",
    }),
  ).toBeOnTheScreen();
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();
  expect(screen.queryAllByText(label)).toHaveLength(0);
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();

  // When
  mockFetch.mockImplementation(reads);
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
});

it("uses only the destination card after a failed common Club refresh and recovers through Retry", async () => {
  // Given: the shared common boundary retains the loaded Club while its detail read fails.
  const path = `/clubs/${sportingId}`;
  const user = userEvent.setup();
  await renderPage(<ClubScreen clubId={sportingId} />);
  await screen.findAllByText("Club des Rives");
  await layoutNativeTabs();
  mockFetch.mockImplementation((url: string) =>
    new URL(url).pathname === path
      ? Promise.reject(new TypeError("offline"))
      : reads(url),
  );

  // When: fireEvent dispatches the native control event; device gestures have separate evidence.
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then: no parallel event toast competes with common required-read recovery.
  expect(
    await screen.findByRole("button", { name: "Réessayer" }),
  ).toBeEnabled();
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(screen.queryByText("Club des Rives")).not.toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Actualiser les données"),
  ).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Retour" })).toBeEnabled();

  // When
  mockFetch.mockImplementation(reads);
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findAllByText("Club des Rives")).not.toHaveLength(0);
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
});
