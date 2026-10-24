import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Alert, Pressable, Text } from "react-native";
import type {
  CollectionSeasonResponse,
  SourceBindingResponse,
} from "../../../../.generated/schemas/index.zod";
import { getGetCollectionSourceQueryKey } from "../../../../.generated/mobile";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import {
  useAccountSession,
  useCurrentAccount,
} from "../../accounts/current-account";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { CollectionSeasonsScreen } from "../screens/collection-seasons-screen";
import { ProviderSourcesScreen } from "../screens/provider-sources-screen";
import { SourcePreparationScreen } from "../screens/source-preparation-screen";
import { SourceChildrenScreen } from "../screens/source-children-screen";

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
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
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
const environment = { ...process.env };
const seasonId = "00000000-0000-4000-8000-000000000179";
const sourceId = "00000000-0000-4000-8000-000000000180";
const candidateUrl =
  "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=137";
const draftUrl =
  "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=139";
const account = {
  accountId: "00000000-0000-4000-8000-000000000181",
  username: "Operator_179",
  email: "operator@example.invalid",
  principalCreatedAt: null,
  hasPhoto: false,
  permissions: { manageCollection: true },
};
let client = createQueryClient();
let season: CollectionSeasonResponse;
let source: SourceBindingResponse;
let sources: SourceBindingResponse[];
let permissions: object;

/** Synthetic complete source representation; decisive lifecycle/evidence fields stay at each scenario. */
function binding(
  overrides: Partial<SourceBindingResponse> = {},
): SourceBindingResponse {
  return {
    id: sourceId,
    seasonId,
    provider: "lnv",
    organizerReference: "137",
    label: "D1 masculine",
    revision: 2,
    candidateUrl,
    acceptedUrl: null,
    locked: false,
    validation: "unvalidated",
    validatedAt: null,
    seasonEvidence: null,
    reason: null,
    launched: false,
    ...overrides,
  };
}
/** Real Fetch responses exercise the generated decoder; no query or form behavior is mocked. */
function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Content-Type":
        status < 400 ? "application/json" : "application/problem+json",
    },
  });
}
/** Shared safe problem category, without provider text or a fabricated successful representation. */
function refused(status: number) {
  return json(
    {
      type:
        status === 409
          ? "urn:blockout:problem:stale-revision"
          : "urn:blockout:problem:unprocessable-content",
      title: "Refused",
      status,
    },
    status,
  );
}
/** Default read-only local peer; each mutation scenario installs its own explicit response. */
async function reads(url: RequestInfo | URL): Promise<Response> {
  const path = new URL(String(url)).pathname;
  if (path.endsWith("/accounts/me")) return json({ ...account, permissions });
  if (path.endsWith("/collection-seasons")) return json({ items: [season] });
  if (path.endsWith(`/collection-seasons/${seasonId}`)) return json(season);
  if (path.endsWith("/source-bindings")) return json({ items: sources });
  if (path.endsWith(`/source-bindings/${sourceId}`)) return json(source);
  if (path.endsWith("/children"))
    return json({ items: [], page: 0, hasNext: false });
  throw new Error(`Unexpected controlled request ${path}`);
}
beforeEach(() => {
  client = createQueryClient();
  permissions = { manageCollection: true };
  season = {
    id: seasonId,
    label: "2026/2027",
    startYear: 2026,
    revision: 5,
    state: "active",
  };
  source = binding();
  sources = [source];
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|operator"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuthLogout.mockReset().mockResolvedValue();
  mockFetch.mockReset().mockImplementation(reads);
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});
afterEach(() => {
  client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Real session, query and theme providers with native credential I/O and HTTP controlled locally. */
async function renderPreparation(
  content = <SourcePreparationScreen seasonId={seasonId} sourceId={sourceId} />,
) {
  return render(content, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <AccountSessionProvider>{children}</AccountSessionProvider>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  });
}
/** Chooses an actual displayed native confirmation; setup never accepts the command. */
async function confirm(label: string) {
  const action = jest
    .mocked(Alert.alert)
    .mock.lastCall?.[2]?.find((choice) => choice.text === label);
  if (!action?.onPress) throw new Error(`Missing native action ${label}`);
  await act(async () => action.onPress?.());
}
/** Opens the ordinary inline URL editor and types through the native input. */
async function editCandidate() {
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("button", { name: "Modifier le lien" }),
  );
  await user.clear(screen.getByLabelText("URL officielle"));
  await user.type(screen.getByLabelText("URL officielle"), draftUrl);
  return user;
}
/** Explicit actions use the existing owners so session invalidation and grant refresh remain real. */
function AccountActions() {
  const session = useAccountSession();
  const current = useCurrentAccount();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Déconnexion"
        onPress={() => void session.signOut()}
      >
        <Text>Déconnexion</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Relire les permissions"
        onPress={() => void current.refetch()}
      >
        <Text>Relire les permissions</Text>
      </Pressable>
    </>
  );
}

it("lists canonical seasons and opens their preparation without a dashboard", async () => {
  // Given
  const user = userEvent.setup();
  await renderPreparation(<CollectionSeasonsScreen />);

  // When
  await user.press(
    await screen.findByRole("button", { name: "2026/2027, Active" }),
  );

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/collection/[seasonId]",
    params: { seasonId },
  });
});

it("shows an honest empty season list and recovers an initial read failure explicitly", async () => {
  // Given
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/collection-seasons") ? refused(503) : reads(url),
  );
  const user = userEvent.setup();
  await renderPreparation(<CollectionSeasonsScreen />);
  await screen.findByText("Les saisons sont indisponibles.");

  // When
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/collection-seasons")
      ? json({ items: [] })
      : reads(url),
  );
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByText("Aucune saison découverte")).toBeOnTheScreen();
});

it.each([{}, { moderateStreams: true }, { manageSportingData: true }])(
  "requires the dedicated collection grant: %j",
  async (denied) => {
    // Given
    permissions = denied;

    // When
    await renderPreparation();

    // Then
    expect(
      await screen.findByText("Cette action nécessite une permission dédiée."),
    ).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.some(([url]) =>
        String(url).includes("/source-bindings"),
      ),
    ).toBe(false);
  },
);

it("shows missing source coverage without inventing seasonal evidence or mapping readiness", async () => {
  // Given
  source = binding({ candidateUrl: null });
  sources = [source];

  // When
  await renderPreparation(
    <ProviderSourcesScreen seasonId={seasonId} provider="lnv" />,
  );

  // Then
  expect(await screen.findByText("Source manquante")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Lancer les sources prêtes" }),
  ).toBeDisabled();
  expect(
    screen.queryByText(/mapping|classification|mappée/i),
  ).not.toBeOnTheScreen();
});

it("saves an inline candidate and clears old qualification before another explicit validation", async () => {
  // Given
  source = binding({ validation: "qualified", seasonEvidence: "2026/2027" });
  await renderPreparation();
  const user = await editCandidate();
  mockFetch.mockImplementation(async (url, options) =>
    options?.method === "PUT"
      ? json((source = binding({ revision: 3, candidateUrl: draftUrl })))
      : reads(url),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer le lien" }));

  // Then
  expect(
    await screen.findByText(
      "Lien enregistré. La source doit être validée à nouveau.",
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Prête")).not.toBeOnTheScreen();
  const write = mockFetch.mock.calls.find(
    ([, options]) => options?.method === "PUT",
  );
  expect(JSON.parse(String(write?.[1]?.body))).toEqual({
    revision: 2,
    candidateUrl: draftUrl,
  });
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(0);
});

it("preserves dirty input through a background refetch and requires an explicit reread", async () => {
  // Given
  await renderPreparation();
  await editCandidate();
  const query = client
    .getQueryCache()
    .findAll()
    .find((q) =>
      q.queryKey.includes(getGetCollectionSourceQueryKey(sourceId)[0]),
    );
  if (!query) throw new Error("Source query missing");
  source = binding({ revision: 3, candidateUrl: `${candidateUrl}&other=1` });

  // When
  await act(async () => {
    await client.refetchQueries({ queryKey: query.queryKey, exact: true });
  });

  // Then
  expect(screen.getByDisplayValue(draftUrl)).toBeOnTheScreen();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Enregistrer le lien" }),
    ).toBeDisabled(),
  );
});

it.each([400, 403, 422])(
  "keeps the candidate after a confirmed %i refusal",
  async (status) => {
    // Given
    await renderPreparation();
    const user = await editCandidate();
    mockFetch.mockImplementation(async (url, options) =>
      options?.method === "PUT" ? refused(status) : reads(url),
    );

    // When
    await user.press(
      screen.getByRole("button", { name: "Enregistrer le lien" }),
    );

    // Then
    expect(
      await screen.findByText(
        "L’action a été refusée. Votre saisie est conservée.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByDisplayValue(draftUrl)).toBeOnTheScreen();
  },
);

it.each(["conflict", "uncertain", "invalid-response"])(
  "rereads before explicit candidate resubmission after %s",
  async (outcome) => {
    // Given
    await renderPreparation();
    const user = await editCandidate();
    let writes = 0;
    mockFetch.mockImplementation(async (url, options) => {
      if (options?.method === "PUT") {
        writes++;
        if (writes === 1) {
          if (outcome === "uncertain") throw new TypeError("Lost response");
          return outcome === "conflict" ? refused(409) : json({ revision: 3 });
        }
        return json(
          (source = binding({ revision: 4, candidateUrl: draftUrl })),
        );
      }
      return reads(url);
    });

    // When
    await user.press(
      screen.getByRole("button", { name: "Enregistrer le lien" }),
    );
    await screen.findByText(
      "Le résultat doit être vérifié avant une nouvelle action.",
    );
    source = binding({ revision: 3 });
    await user.press(screen.getByRole("button", { name: "Relire l’état" }));

    // Then
    await screen.findByText(
      "État relu. Vérifiez votre saisie avant une nouvelle action.",
    );
    expect(screen.getByDisplayValue(draftUrl)).toBeOnTheScreen();
    expect(writes).toBe(1);

    // When
    await user.press(
      screen.getByRole("button", { name: "Enregistrer le lien" }),
    );

    // Then
    await screen.findByText(
      "Lien enregistré. La source doit être validée à nouveau.",
    );
    const calls = mockFetch.mock.calls.filter(
      ([, options]) => options?.method === "PUT",
    );
    expect(JSON.parse(String(calls[1][1]?.body)).revision).toBe(3);
  },
);

it("keeps an uncertain candidate blocked when reread fails", async () => {
  // Given
  await renderPreparation();
  const user = await editCandidate();
  mockFetch.mockImplementation(async (_url, options) =>
    options?.method === "PUT" ? refused(409) : refused(503),
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer le lien" }));
  await screen.findByText(
    "Le résultat doit être vérifié avant une nouvelle action.",
  );

  // When
  await user.press(screen.getByRole("button", { name: "Relire l’état" }));

  // Then
  expect(
    await screen.findByText(
      "La relecture a échoué. Votre saisie est conservée.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue(draftUrl)).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Enregistrer le lien" }),
  ).toBeDisabled();
});

it("keeps 202 pending distinct from qualification and only rereads on demand", async () => {
  // Given
  const user = userEvent.setup();
  await renderPreparation();
  await screen.findByRole("button", { name: "Valider la source" });
  mockFetch.mockImplementation(async (url, options) =>
    options?.method === "POST"
      ? json((source = binding({ revision: 3, validation: "pending" })), 202)
      : reads(url),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Valider la source" }));

  // Then
  expect(await screen.findByText("Validation en attente")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Confirmer la saison" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);

  // When
  source = binding({
    revision: 4,
    validation: "confirmation-required",
    reason: "Attribution saisonnière manquante",
  });
  await user.press(screen.getByRole("button", { name: "Relire l’état" }));

  // Then
  expect(await screen.findByText("À confirmer")).toBeOnTheScreen();
});

it("confirms only missing seasonal attribution with the exact canonical season", async () => {
  // Given
  source = binding({ validation: "confirmation-required" });
  const user = userEvent.setup();
  await renderPreparation();
  await screen.findByRole("button", { name: "Confirmer la saison" });
  mockFetch.mockImplementation(async (url, options) =>
    options?.method === "PUT"
      ? json(
          (source = binding({
            revision: 3,
            validation: "qualified",
            seasonEvidence: "2026/2027",
          })),
        )
      : reads(url),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Confirmer la saison" }));
  expect(Alert.alert).toHaveBeenCalledWith(
    "Confirmer 2026/2027 ?",
    "Confirmez uniquement si cette page correspond bien à la saison préparée.",
    expect.any(Array),
  );
  await confirm("Confirmer la saison");

  // Then
  expect(await screen.findByText("Prête")).toBeOnTheScreen();
  const write = mockFetch.mock.calls.find(
    ([, options]) => options?.method === "PUT",
  );
  expect(JSON.parse(String(write?.[1]?.body))).toEqual({
    revision: 2,
    seasonLabel: "2026/2027",
  });
});

it("never offers confirmation to override invalid evidence", async () => {
  // Given
  source = binding({ validation: "invalid", reason: "Saison contradictoire" });

  // When
  await renderPreparation();

  // Then
  expect(await screen.findByText("Saison contradictoire")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Confirmer la saison" }),
  ).not.toBeOnTheScreen();
});

it.each(["locked", "closed"])("keeps %s sources read-only", async (state) => {
  // Given
  if (state === "closed") season.state = "closed";
  else
    source = binding({
      locked: true,
      launched: true,
      acceptedUrl: candidateUrl,
      validation: "qualified",
    });

  // When
  await renderPreparation();

  // Then
  expect(
    await screen.findByText(
      state === "closed" ? "Saison clôturée" : "Verrouillée",
    ),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Modifier le lien" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Valider la source" }),
  ).not.toBeOnTheScreen();
});

it.each([409, 422, "lost"])(
  "preserves the launch selection after %s without replay",
  async (outcome) => {
    // Given
    source = binding({ validation: "qualified" });
    sources = [
      source,
      binding({
        id: "00000000-0000-4000-8000-000000000182",
        label: "D1 féminine",
        locked: true,
        launched: true,
      }),
    ];
    const user = userEvent.setup();
    await renderPreparation(
      <ProviderSourcesScreen seasonId={seasonId} provider="lnv" />,
    );
    await screen.findByRole("button", { name: "Préparer D1 masculine" });
    mockFetch.mockImplementation(async (url, options) => {
      if (options?.method === "POST") {
        if (outcome === "lost") throw new TypeError("Lost response");
        return refused(Number(outcome));
      }
      return reads(url);
    });

    // When
    await user.press(
      screen.getByRole("button", { name: "Lancer les sources prêtes" }),
    );
    await confirm("Lancer");

    // Then
    await screen.findByText(
      outcome === 422
        ? "L’action a été refusée. Votre saisie est conservée."
        : "Le résultat doit être vérifié avant une nouvelle action.",
    );
    expect(jest.mocked(Alert.alert).mock.lastCall?.[1]).toContain(
      "D1 masculine",
    );
    expect(jest.mocked(Alert.alert).mock.lastCall?.[1]).not.toContain(
      "D1 féminine",
    );
    const writes = mockFetch.mock.calls.filter(
      ([, options]) => options?.method === "POST",
    );
    expect(writes).toHaveLength(1);
    expect(JSON.parse(String(writes[0][1]?.body))).toEqual({
      revision: 5,
      sourceBindingIds: [sourceId],
    });
  },
);

it("rereads a failed launch without discarding selections before a new explicit launch", async () => {
  // Given
  source = binding({ validation: "qualified" });
  sources = [source];
  const user = userEvent.setup();
  await renderPreparation(
    <ProviderSourcesScreen seasonId={seasonId} provider="lnv" />,
  );
  await screen.findByRole("button", { name: "Préparer D1 masculine" });
  let writes = 0;
  mockFetch.mockImplementation(async (url, options) => {
    if (options?.method === "POST") {
      writes++;
      return writes === 1 ? refused(409) : json({ ...season, revision: 7 });
    }
    return reads(url);
  });
  await user.press(
    screen.getByRole("button", { name: "Lancer les sources prêtes" }),
  );
  await confirm("Lancer");
  await screen.findByText(
    "Le résultat doit être vérifié avant une nouvelle action.",
  );
  season.revision = 6;
  sources = [
    ...sources,
    binding({
      id: "00000000-0000-4000-8000-000000000183",
      label: "D2 masculine",
      validation: "qualified",
    }),
  ];

  // When
  await user.press(screen.getByRole("button", { name: "Relire l’état" }));
  await screen.findByText(
    "État relu. Vérifiez votre saisie avant une nouvelle action.",
  );

  // Then
  expect(writes).toBe(1);
  expect(
    screen.getByRole("button", { name: "Lancer les sources prêtes" }),
  ).toBeEnabled();

  // When
  await user.press(
    screen.getByRole("button", { name: "Lancer les sources prêtes" }),
  );
  await confirm("Lancer");

  // Then
  await screen.findByText("Sources sélectionnées lancées.");
  const calls = mockFetch.mock.calls.filter(
    ([, options]) => options?.method === "POST",
  );
  expect(JSON.parse(String(calls[1][1]?.body)).revision).toBe(6);
  expect(JSON.parse(String(calls[1][1]?.body)).sourceBindingIds).toEqual([
    sourceId,
  ]);
});

it("rejects credential-bearing candidate input locally without losing it or sending a write", async () => {
  // Given
  await renderPreparation();
  const user = await editCandidate();
  const invalid = "https://operator:password@example.invalid/source";
  await user.clear(screen.getByLabelText("URL officielle"));
  await user.type(screen.getByLabelText("URL officielle"), invalid);

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer le lien" }));

  // Then
  expect(
    await screen.findByText(
      "Saisissez une URL HTTP ou HTTPS sans identifiant.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue(invalid)).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PUT"),
  ).toBe(false);
});

it("adds only an unqualified candidate for the explicit provider and current season revision", async () => {
  // Given
  sources = [];
  const user = userEvent.setup();
  await renderPreparation(
    <ProviderSourcesScreen seasonId={seasonId} provider="lnv" />,
  );
  await user.press(
    await screen.findByRole("button", { name: "Ajouter une source" }),
  );
  await user.type(
    screen.getByLabelText("Référence de l’organisateur ou du championnat"),
    "137",
  );
  await user.type(screen.getByLabelText("URL officielle"), candidateUrl);
  mockFetch.mockImplementation(async (url, options) => {
    if (options?.method === "POST") {
      sources = [binding()];
      season.revision = 6;
      return json(sources[0], 201);
    }
    return reads(url);
  });

  // When
  await user.press(
    screen.getByRole("button", { name: "Enregistrer la source" }),
  );

  // Then
  await screen.findByText(
    "Source ajoutée. Relisez l’état avant une nouvelle action.",
  );
  const writes = mockFetch.mock.calls.filter(
    ([, options]) => options?.method === "POST",
  );
  expect(writes).toHaveLength(1);
  expect(JSON.parse(String(writes[0][1]?.body))).toEqual({
    seasonRevision: 5,
    provider: "lnv",
    organizerReference: "137",
    candidateUrl,
  });
});

it("keeps a manual draft read-only when the reread establishes terminal season closure", async () => {
  // Given
  sources = [];
  const user = userEvent.setup();
  await renderPreparation(
    <ProviderSourcesScreen seasonId={seasonId} provider="lnv" />,
  );
  await user.press(
    await screen.findByRole("button", { name: "Ajouter une source" }),
  );
  await user.type(
    screen.getByLabelText("Référence de l’organisateur ou du championnat"),
    "137",
  );
  await user.type(screen.getByLabelText("URL officielle"), candidateUrl);
  mockFetch.mockImplementation(async (url, options) =>
    options?.method === "POST" ? refused(409) : reads(url),
  );
  await user.press(
    screen.getByRole("button", { name: "Enregistrer la source" }),
  );
  await screen.findByText(
    "Le résultat doit être vérifié avant une nouvelle action.",
  );
  season = { ...season, revision: 6, state: "closed" };

  // When
  await user.press(screen.getByRole("button", { name: "Relire l’état" }));

  // Then
  await screen.findByText("Saison clôturée");
  expect(screen.getByDisplayValue(candidateUrl)).toBeOnTheScreen();
  expect(screen.getByLabelText("URL officielle")).toBeDisabled();
});

it("launches an initial-import-locked qualified binding unchanged", async () => {
  // Given
  source = binding({
    locked: true,
    acceptedUrl: candidateUrl,
    validation: "qualified",
    launched: false,
  });
  sources = [source];
  const user = userEvent.setup();
  await renderPreparation(
    <ProviderSourcesScreen seasonId={seasonId} provider="lnv" />,
  );
  await screen.findByRole("button", { name: "Préparer D1 masculine" });
  mockFetch.mockImplementation(async (url, options) =>
    options?.method === "POST" ? json({ ...season, revision: 6 }) : reads(url),
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Lancer les sources prêtes" }),
  );
  await confirm("Lancer");

  // Then
  await screen.findByText("Sources sélectionnées lancées.");
  const write = mockFetch.mock.calls.find(
    ([, options]) => options?.method === "POST",
  );
  expect(JSON.parse(String(write?.[1]?.body))).toEqual({
    revision: 5,
    sourceBindingIds: [sourceId],
  });
});

it("reads bounded direct children and their next page without exposing mapping or an invented total", async () => {
  // Given
  const user = userEvent.setup();
  mockFetch.mockImplementation(async (url) => {
    const parsed = new URL(String(url));
    if (!parsed.pathname.endsWith("/children")) return reads(url);
    const page = Number(parsed.searchParams.get("page"));
    return json({
      items: [
        {
          id: `00000000-0000-4000-8000-00000000018${page + 2}`,
          label: page === 0 ? "Phase régulière" : "Phase finale",
          kind: "pool",
        },
      ],
      page,
      hasNext: page === 0,
    });
  });
  await renderPreparation(
    <SourceChildrenScreen seasonId={seasonId} sourceId={sourceId} />,
  );
  await screen.findByText("Phase régulière");

  // When
  await user.press(screen.getByRole("button", { name: "Afficher la suite" }));

  // Then
  expect(await screen.findByText("Phase finale")).toBeOnTheScreen();
  expect(screen.getByText("Phase régulière")).toBeOnTheScreen();
  const pages = mockFetch.mock.calls.filter(([url]) =>
    String(url).includes("/children"),
  );
  expect(
    pages.map(([url]) => new URL(String(url)).searchParams.get("page")),
  ).toEqual(["0", "1"]);
  expect(
    pages.every(
      ([url]) => new URL(String(url)).searchParams.get("size") === "50",
    ),
  ).toBe(true);
  expect(screen.queryByText(/mapping|classification/i)).not.toBeOnTheScreen();
});

it("retries the failed next child page instead of only refreshing already loaded children", async () => {
  // Given
  const user = userEvent.setup();
  let fails = true;
  mockFetch.mockImplementation(async (url) => {
    const parsed = new URL(String(url));
    if (!parsed.pathname.endsWith("/children")) return reads(url);
    const page = Number(parsed.searchParams.get("page"));
    if (page === 1 && fails) return refused(503);
    return json({
      items: [
        {
          id: `00000000-0000-4000-8000-00000000018${page + 2}`,
          label: page === 0 ? "Phase régulière" : "Phase finale",
          kind: "pool",
        },
      ],
      page,
      hasNext: page === 0,
    });
  });
  await renderPreparation(
    <SourceChildrenScreen seasonId={seasonId} sourceId={sourceId} />,
  );
  await screen.findByText("Phase régulière");
  await user.press(screen.getByRole("button", { name: "Afficher la suite" }));
  await screen.findByText("Les groupes sont indisponibles.");
  fails = false;

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByText("Phase finale")).toBeOnTheScreen();
  expect(screen.getByText("Phase régulière")).toBeOnTheScreen();
  const pages = mockFetch.mock.calls.filter(([url]) =>
    String(url).includes("/children"),
  );
  expect(
    pages.map(([url]) => new URL(String(url)).searchParams.get("page")),
  ).toEqual(["0", "1", "1"]);
});

it("retains the manual supported-source draft after a duplicate conflict", async () => {
  // Given
  sources = [];
  const user = userEvent.setup();
  await renderPreparation(
    <ProviderSourcesScreen seasonId={seasonId} provider="lnv" />,
  );
  await user.press(
    await screen.findByRole("button", { name: "Ajouter une source" }),
  );
  await user.type(
    screen.getByLabelText("Référence de l’organisateur ou du championnat"),
    "137",
  );
  await user.type(screen.getByLabelText("URL officielle"), candidateUrl);
  mockFetch.mockImplementation(async (url, options) =>
    options?.method === "POST" ? refused(409) : reads(url),
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Enregistrer la source" }),
  );

  // Then
  await screen.findByText(
    "Le résultat doit être vérifié avant une nouvelle action.",
  );
  expect(screen.getByDisplayValue("137")).toBeOnTheScreen();
  expect(screen.getByDisplayValue(candidateUrl)).toBeOnTheScreen();
});

it("blocks a held confirmation after grant revocation while retaining a read-only draft", async () => {
  // Given
  source = binding({ validation: "confirmation-required" });
  await renderPreparation(
    <>
      <SourcePreparationScreen seasonId={seasonId} sourceId={sourceId} />
      <AccountActions />
    </>,
  );
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("button", { name: "Confirmer la saison" }),
  );
  permissions = {};

  // When
  await user.press(
    screen.getByRole("button", { name: "Relire les permissions" }),
  );
  await screen.findByText("Cette action nécessite une permission dédiée.");
  await confirm("Confirmer la saison");

  // Then
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PUT"),
  ).toBe(false);
});

it("rejects a source mutation arriving after the original F05 session ended", async () => {
  // Given
  await renderPreparation(
    <>
      <SourcePreparationScreen seasonId={seasonId} sourceId={sourceId} />
      <AccountActions />
    </>,
  );
  const user = await editCandidate();
  const originalQueryKey = client
    .getQueryCache()
    .findAll()
    .find((query) =>
      query.queryKey.includes(getGetCollectionSourceQueryKey(sourceId)[0]),
    )?.queryKey;
  if (!originalQueryKey) throw new Error("Source query missing");
  const pending = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT" ? pending.promise : reads(url),
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer le lien" }));
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.some(([, options]) => options?.method === "PUT"),
    ).toBe(true),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Déconnexion" }));
  await act(async () =>
    pending.resolve(json(binding({ revision: 3, candidateUrl: draftUrl }))),
  );

  // Then
  expect(
    screen.queryByText(
      "Lien enregistré. La source doit être validée à nouveau.",
    ),
  ).not.toBeOnTheScreen();
  expect(
    client.getQueryData<SourceBindingResponse>(originalQueryKey)?.candidateUrl,
  ).not.toBe(draftUrl);
});
