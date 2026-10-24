import { act, screen, waitFor } from "@testing-library/react-native";
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
  confirm,
  control,
  json,
  pressAction,
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
const environment = { ...process.env };
let peer: ReturnType<typeof collectionPeer>;
beforeEach(() => {
  peer = collectionPeer();
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
afterEach(() => {
  peer.client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

it("separates competition seasons from the two seasonless controls", async () => {
  // Given
  peer.controls = [
    control({ family: "club-sheets", seasonId: undefined }),
    control({
      id: "00000000-0000-4000-8000-000000000191",
      family: "geocoding",
      seasonId: undefined,
    }),
  ];
  await renderCollection(<CollectionDashboardScreen />, peer.client);

  // When
  await pressAction("Fiches clubs");

  // Then
  expect(
    await screen.findByRole("button", { name: /2026\/2027/ }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Géocodage" })).toBeOnTheScreen();
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

it("refreshes only reads and retains uncertain integration and absent measurements while paused", async () => {
  // Given
  peer.controls = [control({ enabled: false })];
  peer.results = [result()];
  await renderCollection(
    <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
    peer.client,
  );
  expect(
    await screen.findByText("Intégration non confirmée"),
  ).toBeOnTheScreen();

  // When
  await pressAction("Actualiser");
  await pressAction("Afficher les diagnostics");

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
      peer.client,
    );

    // When
    await pressAction("Relancer");
    await confirm("Relancer");

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
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT"
      ? Promise.resolve(json(control({ revision: 4, enabled: false })))
      : peer.reads(url, options),
  );
  await renderCollection(
    <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
    peer.client,
  );

  // When
  await pressAction("Mettre en pause");
  await confirm("Mettre en pause");

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
    mockFetch.mockImplementation((url, options) =>
      options?.method === "POST"
        ? failure === "lost"
          ? Promise.reject(new TypeError("Connection lost"))
          : Promise.resolve(refused(409))
        : peer.reads(url, options),
    );
    const view = await renderCollection(
      <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
      peer.client,
    );

    // When
    await pressAction("Relancer");
    await confirm("Relancer");
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
    await pressAction("Relire l’état");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Relancer" })).toBeEnabled(),
    );
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(1);
    await pressAction("Relancer");
    await confirm("Relancer");
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
    peer.client,
  );

  // When
  await pressAction("Afficher les diagnostics");

  // Then
  expect(screen.getByText("Acquisition partielle")).toBeOnTheScreen();
  expect(screen.getByText("Échec de l’intégration")).toBeOnTheScreen();
  expect(screen.getByText("Obtenus : 99 · Rejetés : 1")).toBeOnTheScreen();
  expect(screen.getByText("Une ligne rejetée.")).toBeOnTheScreen();
});

it("refuses a held confirmation after current permission withdrawal", async () => {
  // Given
  await renderCollection(
    <>
      <CollectionControlScreen family="ffvb" seasonId={seasonId} />
      <AccountActions />
    </>,
    peer.client,
  );
  await pressAction("Relancer");

  // When
  peer.permissions = { manageSporting: true };
  await pressAction("Actualiser les permissions");
  await screen.findByText("Cette action nécessite une permission dédiée.");
  await confirm("Relancer");

  // Then
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(0);
});

it("ignores an old-session command response without presenting a new success", async () => {
  // Given
  let complete: ((response: Response) => void) | undefined;
  mockFetch.mockImplementation((url, options) =>
    options?.method === "POST"
      ? new Promise((resolve) => {
          complete = resolve;
        })
      : peer.reads(url, options),
  );
  await renderCollection(
    <>
      <CollectionControlScreen family="ffvb" seasonId={seasonId} />
      <AccountActions />
    </>,
    peer.client,
  );
  await pressAction("Relancer");
  const action = jest
    .mocked(Alert.alert)
    .mock.lastCall?.[2]?.find((choice) => choice.text === "Relancer");
  await act(async () => {
    action?.onPress?.();
  });
  await waitFor(() => expect(complete).toBeDefined());

  // When
  await pressAction("Déconnexion");
  await screen.findByText("Session : guest");
  const completeResponse = complete;
  if (!completeResponse) throw new Error("Missing in-flight response");
  await act(async () =>
    completeResponse(
      json(
        control({ pendingRequestId: "00000000-0000-4000-8000-000000000192" }),
        202,
      ),
    ),
  );
  await waitFor(() => expect(peer.client.isMutating()).toBe(0));

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
    peer.client,
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
    await renderCollection(
      <CollectionControlScreen family={family} />,
      peer.client,
    );

    // When
    await pressAction("Reprendre");
    await confirm("Reprendre");

    // Then
    expect(
      await screen.findByRole("button", { name: "Relancer" }),
    ).toBeEnabled();
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
    peer.client,
  );
  expect(
    await screen.findByText("Collecte demandée · en attente de démarrage"),
  ).toBeOnTheScreen();

  // When
  await pressAction("Mettre en pause");
  await confirm("Mettre en pause");

  // Then
  expect(await screen.findByText("Mise en pause en cours")).toBeOnTheScreen();
  expect(screen.getByText("Collecte en cours")).toBeOnTheScreen();
  expect(
    screen.queryByText("Collecte demandée · en attente de démarrage"),
  ).toBeNull();
  expect(screen.getByRole("button", { name: "En cours" })).toBeDisabled();
});

it("retains earlier rows and retries the failed next results page", async () => {
  // Given
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
    peer.client,
  );

  // When
  await pressAction("Charger la suite");
  await screen.findByText(
    "Les résultats sont indisponibles. Les observations déjà lues sont conservées.",
  );
  pageAvailable = true;
  await pressAction("Réessayer");

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

it("rejects a malformed command acknowledgement and keeps the uncertain scope locked after a failed reread", async () => {
  // Given
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
    peer.client,
  );

  // When
  await pressAction("Relancer");
  await confirm("Relancer");
  await screen.findByText(
    "Le résultat doit être vérifié avant une nouvelle action.",
  );
  readAvailable = false;
  await pressAction("Relire l’état");

  // Then
  expect(
    await screen.findByText(
      "La relecture a échoué. Le périmètre est conservé.",
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
  const view = await renderCollection(
    <CollectionControlScreen family="ffvb" seasonId={seasonId} />,
    peer.client,
  );
  await pressAction("Relancer");

  // When
  await view.rerender(<></>);
  await confirm("Relancer");

  // Then
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(0);
});
