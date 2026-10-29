import { nativeAlertAction } from "../../../shared/native/test-support/native-alert";
import { createQueryClient } from "../../../shared/query/query-client";
import {
  cleanup,
  act,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import {
  CollectionControlScreen,
  CollectionDashboardScreen,
} from "../screens/collection-dashboard-screen";
import {
  AccountActions,
  collectionPeer,
  control,
  json,
  refused,
  renderCollection,
  result,
  seasonId,
} from "../test-support/collection-peer";

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
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useNavigation: () => ({ isFocused: mockIsFocused }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockIsFocused = jest.fn(() => true);
const environment = { ...process.env };
let peer: ReturnType<typeof collectionPeer>;
let client = createQueryClient();
beforeEach(() => {
  mockIsFocused.mockReset().mockReturnValue(true);
  peer = collectionPeer();
  client = createQueryClient();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|operator187"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuthLogout.mockReset().mockResolvedValue();
  mockFetch.mockReset().mockImplementation(peer.reads);
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});
afterEach(async () => {
  await cleanup();
  client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

it("separates competition seasons from the two seasonless controls", async () => {
  // Given
  const user = userEvent.setup();
  peer.controls = [
    control({ family: "club-sheets", seasonId: undefined }),
    control({
      id: "00000000-0000-4000-8000-000000000191",
      family: "geocoding",
      seasonId: undefined,
    }),
  ];
  await renderCollection(<CollectionDashboardScreen />, client);

  // When
  await user.press(await screen.findByRole("link", { name: "Fiches clubs" }));

  // Then
  expect(
    await screen.findByRole("link", { name: /2026\/2027/ }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("link", { name: "Géocodage" })).toBeOnTheScreen();
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/collection/clubs/[family]",
    params: { family: "club-sheets" },
  });
  expect(
    mockFetch.mock.calls.every(
      ([, options]) => !options?.method || options.method === "GET",
    ),
  ).toBe(true);
});

it("retains authorized seasons after a failed overview refresh with discreet feedback and no refresh button", async () => {
  // Given
  let unavailable = false;
  mockFetch.mockImplementation((url, options) =>
    unavailable && new URL(String(url)).pathname.endsWith("/collection-seasons")
      ? Promise.resolve(refused(503))
      : peer.reads(url, options),
  );
  await renderCollection(<CollectionDashboardScreen />, client);
  await screen.findByRole("link", { name: /2026\/2027/ });

  // When
  unavailable = true;
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("link", { name: /2026\/2027/ })).toBeOnTheScreen();
  expect(screen.getByRole("link", { name: "Fiches clubs" })).toBeOnTheScreen();
  expect(screen.getByRole("link", { name: "Géocodage" })).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();

  // When
  unavailable = false;
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await waitFor(() => expect(client.isFetching()).toBe(0));

  // Then
  expect(
    await screen.findByRole("link", { name: /2026\/2027/ }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("alert", { name: "Une erreur est survenue" }),
  ).not.toBeOnTheScreen();
});

it("refreshes only reads and retains uncertain integration and absent measurements while paused", async () => {
  // Given
  const user = userEvent.setup();
  peer.controls = [control({ enabled: false })];
  peer.results = [result()];
  await renderCollection(
    <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
    client,
  );
  expect(
    await screen.findByText("Intégration non confirmée"),
  ).toBeOnTheScreen();

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await user.press(
    await screen.findByRole("button", { name: "Afficher les diagnostics" }),
  );

  // Then
  expect(screen.getByText("En pause")).toBeOnTheScreen();
  expect(screen.getByText("Dernière tentative : jamais")).toBeOnTheScreen();
  expect(screen.getByText("Dernier succès complet : aucun")).toBeOnTheScreen();
  expect(
    screen.getByText("Obtenus : non mesuré · Rejetés : non mesuré"),
  ).toBeOnTheScreen();
  expect(screen.getByText("Diagnostic indisponible.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Relancer" })).toBeDisabled();
  expect(
    mockFetch.mock.calls.every(
      ([, options]) => !options?.method || options.method === "GET",
    ),
  ).toBe(true);
  expect(screen.queryByText(/classement|classification|mapping/i)).toBeNull();
});

it.each([202, 200])(
  "distinguishes accepted pending intent from a confirmed running cycle (%s)",
  async (status) => {
    // Given
    const user = userEvent.setup();
    const running = {
      id: "00000000-0000-4000-8000-000000000192",
      state: "running" as const,
      mode: "manual" as const,
      startedAt: "2026-10-24T12:00:00Z",
    };
    mockFetch.mockImplementation((url, options) =>
      options?.method === "POST"
        ? Promise.resolve(
            json(
              control(
                status === 202
                  ? { revision: 4, pendingRequestId: running.id }
                  : { revision: 4, cycle: running },
              ),
              status,
            ),
          )
        : peer.reads(url, options),
    );
    await renderCollection(
      <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
      client,
    );

    // When
    await user.press(await screen.findByRole("button", { name: "Relancer" }));
    await act(async () => nativeAlertAction("Relancer")());

    // Then
    expect(
      await screen.findByText(
        status === 202
          ? "Collecte demandée · en attente de démarrage"
          : "Collecte en cours",
      ),
    ).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(1);
    const write = mockFetch.mock.calls.find(
      ([, options]) => options?.method === "POST",
    );
    if (!write) throw new Error("Missing collection request");
    const [url, options] = write;
    expect(String(url)).toContain(
      `/collection-controls/${control().id}/requests`,
    );
    expect(JSON.parse(String(options?.body))).toEqual({ revision: 3 });
  },
);

it("pauses only the selected control and explicitly resumes before relaunch", async () => {
  // Given
  const user = userEvent.setup();
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT"
      ? Promise.resolve(json(control({ revision: 4, enabled: false })))
      : peer.reads(url, options),
  );
  await renderCollection(
    <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
    client,
  );

  // When
  await user.press(
    await screen.findByRole("button", { name: "Mettre en pause" }),
  );
  await act(async () => nativeAlertAction("Mettre en pause")());

  // Then
  expect(
    await screen.findByRole("button", { name: "Reprendre" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Relancer" })).toBeDisabled();
  const writes = mockFetch.mock.calls.filter(
    ([, options]) => options?.method === "PUT",
  );
  expect(writes).toHaveLength(1);
  expect(String(writes[0][0])).toContain(
    `/collection-controls/${control().id}/activity`,
  );
  expect(JSON.parse(String(writes[0][1]?.body))).toEqual({
    revision: 3,
    enabled: false,
  });
});

it.each([409, "lost"])(
  "requires explicit successful reread after %s and retains the scope across removal",
  async (failure) => {
    // Given
    const user = userEvent.setup();
    mockFetch.mockImplementation((url, options) =>
      options?.method === "POST"
        ? failure === "lost"
          ? Promise.reject(new TypeError("Connection lost"))
          : Promise.resolve(refused(409))
        : peer.reads(url, options),
    );
    const view = await renderCollection(
      <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
      client,
    );

    // When
    await user.press(await screen.findByRole("button", { name: "Relancer" }));
    await act(async () => nativeAlertAction("Relancer")());
    expect(
      await screen.findByText(
        "Le résultat doit être vérifié avant une nouvelle action.",
      ),
    ).toBeOnTheScreen();
    await view.rerender(<></>);
    await view.rerender(
      <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
    );

    // Then
    expect(
      await screen.findByRole("button", { name: "Relancer" }),
    ).toBeDisabled();
    peer.controls = [control({ revision: 9 })];
    // When
    await user.press(
      await screen.findByRole("button", { name: "Relire l’état" }),
    );
    // Then
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Relancer" })).toBeEnabled(),
    );
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(1);
    // When
    await user.press(await screen.findByRole("button", { name: "Relancer" }));
    await act(async () => nativeAlertAction("Relancer")());
    // Then
    await screen.findByText(
      "Le résultat doit être vérifié avant une nouvelle action.",
    );
    const writes = mockFetch.mock.calls.filter(
      ([, options]) => options?.method === "POST",
    );
    expect(writes).toHaveLength(2);
    expect(JSON.parse(String(writes[1][1]?.body))).toEqual({ revision: 9 });
  },
);

it("shows partial acquisition separately from failed integration and a previous success", async () => {
  // Given
  const user = userEvent.setup();
  peer.results = [
    result({
      phase: "acquisition",
      outcome: "partial",
      obtainedCount: 99,
      rejectedCount: 1,
      reason: "Une ligne rejetée.",
    }),
    result({ outcome: "failed", lastSuccessAt: "2026-10-23T12:00:00Z" }),
  ];
  await renderCollection(
    <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
    client,
  );

  // When
  await user.press(
    await screen.findByRole("button", { name: "Afficher les diagnostics" }),
  );

  // Then
  expect(screen.getByText("Acquisition partielle")).toBeOnTheScreen();
  expect(screen.getByText("Échec de l’intégration")).toBeOnTheScreen();
  expect(screen.getByText("Obtenus : 99 · Rejetés : 1")).toBeOnTheScreen();
  expect(screen.getByText("Une ligne rejetée.")).toBeOnTheScreen();
});

it("refuses a held confirmation after current permission withdrawal", async () => {
  // Given
  const user = userEvent.setup();
  await renderCollection(
    <>
      <CollectionControlScreen family="ffvb" seasonId={seasonId} />
      <AccountActions />
    </>,
    client,
  );
  await user.press(await screen.findByRole("button", { name: "Relancer" }));

  // When
  peer.permissions = { manageSporting: true };
  await user.press(
    await screen.findByRole("button", { name: "Actualiser les permissions" }),
  );
  await screen.findByText("Une erreur est survenue");
  await act(async () => nativeAlertAction("Relancer")());

  // Then
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(0);
});

it.each(["control", "season"] as const)(
  "refuses a confirmed collection request when its %s read is denied during credential retrieval",
  async (scope) => {
    // Given
    const user = userEvent.setup();
    const read = Promise.withResolvers<Response>();
    const credentials =
      Promise.withResolvers<ReturnType<typeof credentialsFor>>();
    const credentialRequested = Promise.withResolvers<void>();
    const mounted = await renderCollection(
      <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
      client,
    );
    await user.press(await screen.findByRole("button", { name: "Relancer" }));
    const refusedPath =
      scope === "control"
        ? `/collection-controls/${control().id}`
        : `/collection-seasons/${seasonId}`;
    mockFetch.mockImplementation((url, options) =>
      new URL(String(url)).pathname.endsWith(refusedPath) &&
      options?.method === "GET"
        ? read.promise
        : peer.reads(url, options),
    );
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
    await waitFor(() =>
      expect(screen.getByLabelText("Actualiser les données")).toBeBusy(),
    );
    mockAuth0.getCredentials.mockImplementationOnce(() => {
      credentialRequested.resolve();
      return credentials.promise;
    });

    // When
    await act(async () => nativeAlertAction("Relancer")());
    await act(async () => credentialRequested.promise);
    await act(async () => read.resolve(refused(403)));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    await act(async () =>
      credentials.resolve(credentialsFor("auth0|operator187")),
    );
    await waitFor(() => expect(client.isMutating()).toBe(0));

    // Then
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Relancer" })).toBeNull();
    await mounted.unmount();
  },
);

it("ignores an old-session command response without presenting a new success", async () => {
  // Given
  const user = userEvent.setup();
  const pending = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) =>
    options?.method === "POST" ? pending.promise : peer.reads(url, options),
  );
  await renderCollection(
    <>
      <CollectionControlScreen family="ffvb" seasonId={seasonId} />
      <AccountActions />
    </>,
    client,
  );
  await user.press(await screen.findByRole("button", { name: "Relancer" }));
  await act(async () => nativeAlertAction("Relancer")());
  await waitFor(() =>
    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: "POST" }),
    ),
  );

  // When
  await user.press(await screen.findByRole("button", { name: "Déconnexion" }));
  await screen.findByText("Session : guest");
  await act(async () =>
    pending.resolve(
      json(
        control({ pendingRequestId: "00000000-0000-4000-8000-000000000192" }),
        202,
      ),
    ),
  );
  await waitFor(() => expect(client.isMutating()).toBe(0));

  // Then
  expect(
    screen.queryByText("Collecte demandée · en attente de démarrage"),
  ).toBeNull();
});

it("keeps a closed season navigable with no collection command", async () => {
  // Given
  peer.season = { ...peer.season, state: "closed" };
  peer.results = [result({ phase: "acquisition", outcome: "success" })];
  await renderCollection(
    <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
    client,
  );

  // When
  await screen.findByText("Saison clôturée · historique conservé");

  // Then
  expect(screen.queryByRole("button", { name: "Mettre en pause" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Relancer" })).toBeNull();
  expect(screen.getByText("Acquisition réussie")).toBeOnTheScreen();
});

it.each(["club-sheets", "geocoding"] as const)(
  "commands the %s family without a season query or setting",
  async (family) => {
    // Given
    const user = userEvent.setup();
    peer.controls = [control({ family, seasonId: undefined, enabled: false })];
    mockFetch.mockImplementation((url, options) =>
      options?.method === "PUT"
        ? Promise.resolve(
            json(
              control({
                family,
                seasonId: undefined,
                enabled: true,
                revision: 4,
              }),
            ),
          )
        : peer.reads(url, options),
    );
    await renderCollection(<CollectionControlScreen family={family} />, client);

    // When
    await user.press(await screen.findByRole("button", { name: "Reprendre" }));
    await act(async () => nativeAlertAction("Reprendre")());

    // Then
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Relancer" })).toBeEnabled(),
    );
    expect(
      mockFetch.mock.calls.some(
        ([url]) =>
          String(url).includes("seasonId") ||
          String(url).includes("collection-seasons"),
      ),
    ).toBe(false);
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(0);
  },
);

it("retains running evidence while pause cancels an unstarted request", async () => {
  // Given
  const user = userEvent.setup();
  peer.controls = [
    control({ pendingRequestId: "00000000-0000-4000-8000-000000000192" }),
  ];
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT"
      ? Promise.resolve(
          json(
            control({
              enabled: false,
              revision: 4,
              pendingRequestId: null,
              cycle: {
                id: "00000000-0000-4000-8000-000000000193",
                state: "running",
                mode: "periodic",
                startedAt: "2026-10-24T12:00:00Z",
              },
            }),
          ),
        )
      : peer.reads(url, options),
  );
  await renderCollection(
    <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
    client,
  );
  expect(
    await screen.findByText("Collecte demandée · en attente de démarrage"),
  ).toBeOnTheScreen();

  // When
  await user.press(
    await screen.findByRole("button", { name: "Mettre en pause" }),
  );
  await act(async () => nativeAlertAction("Mettre en pause")());

  // Then
  expect(await screen.findByText("Mise en pause en cours")).toBeOnTheScreen();
  expect(screen.getByText("Collecte en cours")).toBeOnTheScreen();
  expect(
    screen.queryByText("Collecte demandée · en attente de démarrage"),
  ).toBeNull();
  expect(screen.getByRole("button", { name: "En cours" })).toBeDisabled();
});

it("retains result rows and retries the failed page locally without replaying automatic edges", async () => {
  // Given
  const user = userEvent.setup();
  let pageAvailable = false;
  mockFetch.mockImplementation((url, options) => {
    const target = new URL(String(url));
    if (target.pathname.endsWith("/results")) {
      const page = Number(target.searchParams.get("page"));
      return Promise.resolve(
        page === 0
          ? json({ items: [result()], page: 0, hasNext: true })
          : pageAvailable
            ? json({
                items: [
                  result({
                    scopeId: "00000000-0000-4000-8000-000000000194",
                    scopeLabel: "Nationale 2 · Poule B",
                  }),
                ],
                page: 1,
                hasNext: false,
              })
            : refused(503),
      );
    }
    return peer.reads(url, options);
  });
  await renderCollection(
    <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
    client,
  );

  await screen.findByText("Nationale 2 · Poule A · Calendrier");

  // When
  mockIsFocused.mockReturnValue(false);
  await fireEvent(screen.getByTestId("collection-results-list"), "endReached");

  // Then
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).includes("page=1")),
  ).toHaveLength(0);

  // When
  mockIsFocused.mockReturnValue(true);
  await fireEvent(screen.getByTestId("collection-results-list"), "endReached");
  await screen.findByRole("button", {
    name: "Réessayer",
  });
  pageAvailable = true;
  await fireEvent(screen.getByTestId("collection-results-list"), "endReached");

  // Then
  expect(
    screen.getByText("Nationale 2 · Poule A · Calendrier"),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).includes("page=1")),
  ).toHaveLength(1);

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByText("Nationale 2 · Poule B · Calendrier"),
  ).toBeOnTheScreen();
  expect(
    screen.getByText("Nationale 2 · Poule A · Calendrier"),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).includes("page=1")),
  ).toHaveLength(2);
});

it.each([
  { projection: "results", status: 503 },
  { projection: "control", status: 500 },
] as const)(
  "retains authorized result rows after a failed $projection refresh with ordinary discreet feedback",
  async ({ projection, status }) => {
    // Given
    peer.results = [result()];
    let unavailable = false;
    const failedPath =
      projection === "results"
        ? "/results"
        : `/collection-controls/${control().id}`;
    mockFetch.mockImplementation((url, options) =>
      unavailable && new URL(String(url)).pathname.endsWith(failedPath)
        ? Promise.resolve(refused(status))
        : peer.reads(url, options),
    );
    await renderCollection(
      <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
      client,
    );
    await screen.findByText("Nationale 2 · Poule A · Calendrier");

    // When
    unavailable = true;
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then
    expect(
      await screen.findByRole("alert", {
        name: "Une erreur est survenue. Veuillez réessayer plus tard.",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Nationale 2 · Poule A · Calendrier"),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Réessayer" }),
    ).not.toBeOnTheScreen();

    // When
    unavailable = false;
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
    await waitFor(() => expect(client.isFetching()).toBe(0));

    // Then
    expect(
      await screen.findByText("Nationale 2 · Poule A · Calendrier"),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("alert", { name: "Une erreur est survenue" }),
    ).not.toBeOnTheScreen();
  },
);

it("rejects a malformed command acknowledgement and keeps the uncertain scope locked after a failed reread", async () => {
  // Given
  const user = userEvent.setup();
  let readAvailable = true;
  mockFetch.mockImplementation((url, options) =>
    options?.method === "POST"
      ? Promise.resolve(json({ ...control(), enabled: "invalid" }, 202))
      : !readAvailable &&
          String(url).endsWith(`/collection-controls/${control().id}`)
        ? Promise.resolve(refused(503))
        : peer.reads(url, options),
  );
  await renderCollection(
    <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
    client,
  );

  // When
  await user.press(await screen.findByRole("button", { name: "Relancer" }));
  await act(async () => nativeAlertAction("Relancer")());
  await screen.findByText(
    "Le résultat doit être vérifié avant une nouvelle action.",
  );
  readAvailable = false;
  await user.press(
    await screen.findByRole("button", { name: "Relire l’état" }),
  );

  // Then
  expect(
    await screen.findByText(
      "Une erreur est survenue. Veuillez réessayer plus tard.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Relancer" })).toBeDisabled();
  expect(
    screen.queryByText("Collecte demandée · en attente de démarrage"),
  ).toBeNull();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
});

it("invalidates a held native confirmation when its screen is removed", async () => {
  // Given
  const user = userEvent.setup();
  const view = await renderCollection(
    <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
    client,
  );
  await user.press(await screen.findByRole("button", { name: "Relancer" }));

  // When
  await view.rerender(<></>);
  await act(async () => nativeAlertAction("Relancer")());

  // Then
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(0);
});

it.each(["settled", "in-flight"])(
  "retains an uncertain %s command through A → B → A navigation",
  async (timing) => {
    // Given
    const user = userEvent.setup();
    peer.controls = [
      control(),
      control({
        id: "00000000-0000-4000-8000-000000000195",
        family: "geocoding",
        seasonId: undefined,
      }),
    ];
    const pending = Promise.withResolvers<Response>();
    mockFetch.mockImplementation((url, options) =>
      options?.method === "POST"
        ? timing === "settled"
          ? Promise.resolve(refused(409))
          : pending.promise
        : peer.reads(url, options),
    );
    const view = await renderCollection(
      <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
      client,
    );

    // When
    await user.press(await screen.findByRole("button", { name: "Relancer" }));
    await act(async () => nativeAlertAction("Relancer")());
    if (timing === "settled")
      await screen.findByText(
        "Le résultat doit être vérifié avant une nouvelle action.",
      );
    await view.rerender(<CollectionControlScreen family="geocoding" />);
    await screen.findByRole("header", { name: "Géocodage" });
    if (timing === "in-flight") {
      await act(async () => pending.resolve(refused(409)));
      await waitFor(() => expect(client.isMutating()).toBe(0));
    }
    await view.rerender(
      <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
    );

    // Then
    expect(
      await screen.findByText(
        "Le résultat doit être vérifié avant une nouvelle action.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Relancer" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Relire l’état" }),
    ).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(1);
  },
);

it("keeps a newer running read when an older accepted pending acknowledgement arrives", async () => {
  // Given
  const user = userEvent.setup();
  const pending = Promise.withResolvers<Response>();
  const geocoding = control({
    id: "00000000-0000-4000-8000-000000000195",
    family: "geocoding",
    seasonId: undefined,
  });
  peer.controls = [control(), geocoding];
  mockFetch.mockImplementation((url, options) =>
    options?.method === "POST" ? pending.promise : peer.reads(url, options),
  );
  const view = await renderCollection(
    <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
    client,
  );

  // When
  await user.press(await screen.findByRole("button", { name: "Relancer" }));
  await act(async () => nativeAlertAction("Relancer")());
  await view.rerender(<CollectionControlScreen family="geocoding" />);
  await screen.findByRole("header", { name: "Géocodage" });
  peer.controls = [
    control({
      revision: 5,
      cycle: {
        id: "00000000-0000-4000-8000-000000000193",
        state: "running",
        mode: "manual",
        startedAt: "2026-10-24T12:00:00Z",
      },
    }),
    geocoding,
  ];
  await view.rerender(
    <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
  );
  await screen.findByText("Collecte en cours");
  await act(async () =>
    pending.resolve(
      json(
        control({
          revision: 4,
          pendingRequestId: "00000000-0000-4000-8000-000000000192",
        }),
        202,
      ),
    ),
  );
  await waitFor(() => expect(client.isMutating()).toBe(0));

  // Then
  expect(screen.getByText("Collecte en cours")).toBeOnTheScreen();
  expect(
    screen.queryByText("Collecte demandée · en attente de démarrage"),
  ).toBeNull();
  expect(screen.getByRole("button", { name: "En cours" })).toBeDisabled();
});

it("keeps completion freshness already read at the same editing revision as a delayed pause acknowledgement", async () => {
  // Given
  const user = userEvent.setup();
  const cycle = {
    id: "00000000-0000-4000-8000-000000000193",
    state: "running" as const,
    mode: "manual" as const,
    startedAt: "2026-10-24T12:00:00Z",
  };
  const pending = Promise.withResolvers<Response>();
  const geocoding = control({
    id: "00000000-0000-4000-8000-000000000195",
    family: "geocoding",
    seasonId: undefined,
  });
  peer.controls = [control({ cycle }), geocoding];
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT" ? pending.promise : peer.reads(url, options),
  );
  const view = await renderCollection(
    <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
    client,
  );

  // When
  await user.press(
    await screen.findByRole("button", { name: "Mettre en pause" }),
  );
  await act(async () => nativeAlertAction("Mettre en pause")());
  await view.rerender(<CollectionControlScreen family="geocoding" />);
  await screen.findByRole("header", { name: "Géocodage" });
  peer.controls = [
    control({
      revision: 4,
      enabled: false,
      cycle: {
        ...cycle,
        state: "completed",
        completedAt: "2026-10-24T12:01:00Z",
      },
    }),
    geocoding,
  ];
  await view.rerender(
    <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
  );
  await screen.findByText("Dernier cycle terminé");
  await act(async () =>
    pending.resolve(json(control({ revision: 4, enabled: false, cycle }))),
  );
  await waitFor(() => expect(client.isMutating()).toBe(0));

  // Then
  expect(screen.getByText("Dernier cycle terminé")).toBeOnTheScreen();
  expect(screen.queryByText("Collecte en cours")).toBeNull();
});

it("blocks refresh and automatic paging while a collection command is awaiting acknowledgement", async () => {
  // Given
  const user = userEvent.setup();
  const acknowledgement = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "POST") return acknowledgement.promise;
    if (new URL(String(url)).pathname.endsWith("/results"))
      return Promise.resolve(
        json({ items: [result()], page: 0, hasNext: true }),
      );
    return peer.reads(url, options);
  });
  await renderCollection(
    <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
    client,
  );
  await screen.findByText("Nationale 2 · Poule A · Calendrier");

  // When
  await user.press(await screen.findByRole("button", { name: "Relancer" }));
  await act(async () => nativeAlertAction("Relancer")());
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.some(([, options]) => options?.method === "POST"),
    ).toBe(true),
  );

  // Then
  await waitFor(() =>
    expect(screen.getByLabelText("Actualiser les données")).toBeDisabled(),
  );
  mockFetch.mockClear();
  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await fireEvent(screen.getByTestId("collection-results-list"), "endReached");
  // Then
  expect(mockFetch).not.toHaveBeenCalled();

  // When
  await act(async () =>
    acknowledgement.resolve(
      json(
        control({
          revision: 4,
          pendingRequestId: "00000000-0000-4000-8000-000000000192",
        }),
        202,
      ),
    ),
  );

  // Then
  expect(
    await screen.findByText("Collecte demandée · en attente de démarrage"),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Actualiser les données")).toBeEnabled();
});
