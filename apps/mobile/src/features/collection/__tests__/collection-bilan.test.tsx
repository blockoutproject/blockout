import {
  act,
  cleanup,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";
import "@/shared/native/test-support/tab-view-native";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
import { createQueryClient } from "@/shared/query/query-client";
import { CollectionBilanFilters } from "../components/collection-bilan-filters";
import { CollectionBilanScreen } from "../screens/collection-bilan-screen";
import {
  collectionPeer,
  control,
  json,
  refused,
  renderCollection,
  result,
  seasonId,
} from "../test-support/collection-peer";

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
  useNavigation: () => ({ isFocused: () => mockIsFocused() }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const mockIsFocused = jest.fn(() => true);
const environment = { ...process.env };
const sourceId = "00000000-0000-4000-8000-000000000191";
const controlId = control().id;
const navigation = {
  onOpenFilters: jest.fn(),
  onViewSource: jest.fn(),
  onSearch: jest.fn(),
};
let peer: ReturnType<typeof collectionPeer>;
let client: ReturnType<typeof createQueryClient>;
let privateClient: ReturnType<typeof createQueryClient> | undefined;

beforeEach(() => {
  jest.useFakeTimers();
  peer = collectionPeer();
  client = createQueryClient();
  mockFetch.mockReset().mockImplementation(peer.reads);
  mockIsFocused.mockReset().mockReturnValue(true);
  jest.clearAllMocks();
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
});

afterEach(async () => {
  await cleanup();
  client.clear();
  privateClient?.clear();
  privateClient = undefined;
  await act(async () => jest.runOnlyPendingTimersAsync());
  jest.useRealTimers();
  process.env = { ...environment };
});

it("presents the accepted outcomes and opens only established source context", async () => {
  // Given: the same binding has a failure and a compact success; another row has only a safe code.
  const user = userEvent.setup();
  const source = {
    id: sourceId,
    label: "Ligue qualification",
    phaseReference: "régulière-01",
  };
  const reasonType = "urn:blockout:acquisition:unqualified-match-context";
  peer.results = [
    result({
      scopeLabel: "A · Saison régulière",
      outcome: "failed",
      source,
      reason: "Le tableau est illisible.",
    }),
    result({
      scopeLabel: "B · Saison régulière",
      outcome: "success",
      stage: "standings",
      source,
    }),
    result({
      scopeLabel: "C · Saison régulière",
      outcome: "partial",
      phase: "acquisition",
      obtainedCount: 0,
    }),
    result({
      scopeLabel: "D · Saison régulière",
      outcome: "unconfirmed",
      stage: "details",
      reasonType,
    }),
  ];
  await renderCollection(
    <CollectionBilanScreen
      header={<Text>Bilan</Text>}
      controlId={controlId}
      criteria={{}}
      {...navigation}
    />,
    client,
    (cache) => {
      privateClient = cache;
    },
  );

  // When
  await user.press(await screen.findByRole("link", { name: "Voir la source" }));

  // Then
  expect(navigation.onViewSource).toHaveBeenCalledWith(source);
  expect(screen.getAllByRole("link", { name: "Voir la source" })).toHaveLength(
    1,
  );
  expect(screen.getByText("Le tableau est illisible.")).toBeOnTheScreen();
  expect(screen.getByText(reasonType)).toBeOnTheScreen();
  expect(screen.getByText("Obtenus : 0")).toBeOnTheScreen();
  expect(
    screen.queryByText(/non mesuré|Diagnostic indisponible/),
  ).not.toBeOnTheScreen();
  expect(screen.getByText("Échouée")).toBeOnTheScreen();
  expect(screen.getByText("Réussie")).toBeOnTheScreen();
  expect(screen.getByText("Partielle")).toBeOnTheScreen();
  expect(screen.getByText("Non confirmée")).toBeOnTheScreen();
});

it("keeps the admitted rows after a failed continuation and retries only the requested page and criteria", async () => {
  // Given
  const user = userEvent.setup();
  const criteria = {
    query: "Poule A",
    sourceId,
    stage: "calendar",
    status: "failed",
  } as const;
  const source = { id: sourceId, label: "Nationale 2" };
  const reads: URLSearchParams[] = [];
  let continuationAvailable = false;
  mockFetch.mockImplementation(async (url, options) => {
    const { pathname, searchParams } = new URL(String(url));
    if (!pathname.endsWith("/results")) {
      return peer.reads(url, options);
    }
    reads.push(searchParams);
    if (searchParams.get("page") === "0") {
      return json({
        items: [result({ outcome: "failed", source })],
        page: 0,
        hasNext: true,
      });
    }
    return continuationAvailable
      ? json({
          items: [
            result({
              scopeLabel: "Nationale 2 · Poule A · seconde observation",
              phase: "acquisition",
              outcome: "failed",
              source,
            }),
          ],
          page: 1,
          hasNext: false,
        })
      : refused(503);
  });
  await renderCollection(
    <CollectionBilanScreen
      header={<Text>Bilan</Text>}
      controlId={controlId}
      criteria={criteria}
      {...navigation}
    />,
    client,
    (cache) => {
      privateClient = cache;
    },
  );
  await screen.findByRole("header", { name: "Nationale 2 · Poule A" });
  expect(
    screen.getByRole("button", { name: "Filtres actifs" }),
  ).toBeOnTheScreen();

  // When: a covered route cannot request another page. The first focused edge then fails.
  const list = screen.getByTestId("collection-bilan-list");
  mockIsFocused.mockReturnValue(false);
  await fireEvent(list, "endReached");
  expect(reads).toHaveLength(1);
  mockIsFocused.mockReturnValue(true);
  await fireEvent(list, "endReached");

  // Then: a footer is the only retry action, and later native edges do not retry it.
  const retry = await screen.findByRole("button", { name: "Réessayer" });
  expect(
    screen.getByRole("header", { name: "Nationale 2 · Poule A" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  await fireEvent(list, "endReached");
  expect(reads).toHaveLength(2);

  // When
  continuationAvailable = true;
  await user.press(retry);

  // Then
  expect(
    await screen.findByText("Nationale 2 · Poule A · seconde observation"),
  ).toBeOnTheScreen();
  expect(reads.map((params) => params.get("page"))).toEqual(["0", "1", "1"]);
  for (const params of reads) {
    expect(Object.fromEntries(params)).toMatchObject({
      ...criteria,
      size: "50",
    });
  }
});

it.each(["first", "full"])(
  "uses the common card after a failed %s read and retries only results",
  async (kind) => {
    // Given
    const user = userEvent.setup();
    let fail = kind === "first";
    let held: Promise<Response> | undefined;
    mockFetch.mockImplementation(async (url, options) => {
      if (!new URL(String(url)).pathname.endsWith("/results")) {
        return peer.reads(url, options);
      }
      return (
        held ??
        (fail
          ? refused(503)
          : json({ items: [result()], page: 0, hasNext: false }))
      );
    });
    await renderCollection(
      <CollectionBilanScreen
        header={<Text>Bilan</Text>}
        controlId={controlId}
        criteria={{}}
        {...navigation}
      />,
      client,
      (cache) => {
        privateClient = cache;
      },
    );

    // When
    if (kind === "full") {
      await screen.findByRole("header", { name: "Nationale 2 · Poule A" });
      fail = true;
      await fireEvent(
        screen.getByLabelText("Actualiser les données"),
        "refresh",
      );
    }

    // Then
    const card = await screen.findByRole("alert", {
      name: "Une erreur est survenue",
    });
    expect(screen.queryByText("Nationale 2 · Poule A")).not.toBeOnTheScreen();
    expect(
      screen.queryByLabelText("Actualiser les données"),
    ).not.toBeOnTheScreen();

    // When
    const response = Promise.withResolvers<Response>();
    held = response.promise;
    mockFetch.mockClear();
    await user.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    try {
      expect(card).toBeOnTheScreen();
      expect(
        await screen.findByRole("button", { name: "Réessayer", busy: true }),
      ).toBeDisabled();
      expect(
        mockFetch.mock.calls.map(([url]) => new URL(String(url)).pathname),
      ).toEqual([`/administration/collection-controls/${controlId}/results`]);
    } finally {
      await act(() =>
        response.resolve(json({ items: [result()], page: 0, hasNext: false })),
      );
    }
    expect(
      await screen.findByRole("header", { name: "Nationale 2 · Poule A" }),
    ).toBeOnTheScreen();
  },
);

it("applies the source, stage and status draft together without removing the committed search", async () => {
  // Given
  const user = userEvent.setup();
  const onApply = jest.fn();
  const source = {
    id: sourceId,
    seasonId,
    provider: "ffvb",
    organizerReference: "NAT",
    label: "Source qualification FFVB",
    candidateUrl: null,
    acceptedUrl: null,
    locked: false,
    validation: "unvalidated",
    validatedAt: null,
    seasonEvidence: null,
    reason: null,
    launched: false,
  };
  mockFetch.mockImplementation((url, options) =>
    new URL(String(url)).pathname.endsWith(
      `/collection-seasons/${seasonId}/source-bindings`,
    )
      ? Promise.resolve(
          json({
            items: [
              source,
              {
                ...source,
                provider: "lnv",
                id: controlId,
                label: "Source qualification LNV",
              },
            ],
          }),
        )
      : peer.reads(url, options),
  );
  await renderCollection(
    <CollectionBilanFilters
      seasonId={seasonId}
      provider="ffvb"
      initial={{ query: "Nationale" }}
      onClose={jest.fn()}
      onApply={onApply}
    />,
    client,
    (cache) => {
      privateClient = cache;
    },
  );

  // When
  await user.press(await screen.findByRole("button", { name: "Source" }));
  const choice = await screen.findByRole("radio", {
    name: "Source qualification FFVB",
  });
  expect(
    screen.queryByRole("radio", { name: "Source qualification LNV" }),
  ).not.toBeOnTheScreen();
  await user.press(choice);
  await user.press(screen.getByRole("button", { name: "Étape" }));
  await user.press(screen.getByRole("radio", { name: "Calendrier" }));
  await user.press(screen.getByRole("button", { name: "Statut" }));
  await user.press(screen.getByRole("radio", { name: "Échouée" }));
  expect(onApply).not.toHaveBeenCalled();
  await user.press(
    screen.getByRole("button", { name: "Appliquer les filtres" }),
  );

  // Then
  expect(onApply).toHaveBeenCalledWith({
    query: "Nationale",
    sourceId,
    stage: "calendar",
    status: "failed",
  });
});

it("commits the literal search on native submit without publishing each edited character", async () => {
  // Given
  const user = userEvent.setup();
  await renderCollection(
    <CollectionBilanScreen
      header={<Text>Bilan</Text>}
      controlId={controlId}
      criteria={{}}
      {...navigation}
    />,
    client,
    (cache) => {
      privateClient = cache;
    },
  );
  await screen.findByRole("header", { name: "Aucun résultat observé" });

  // When
  const field = screen.getByLabelText("Rechercher dans le bilan");
  await user.type(field, "  Poule A  ");

  // Then
  expect(navigation.onSearch).not.toHaveBeenCalled();

  // When
  await fireEvent(field, "submitEditing");

  // Then
  await waitFor(() =>
    expect(navigation.onSearch).toHaveBeenCalledWith("Poule A"),
  );
  expect(navigation.onSearch).toHaveBeenCalledTimes(1);
});
