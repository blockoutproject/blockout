import { useLayoutEffect, type PropsWithChildren } from "react";
import { useQueryClient, QueryClientProvider } from "@tanstack/react-query";
import { nativeAlertAction } from "../../../shared/native/test-support/native-alert";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import {
  cleanup,
  act,
  fireEvent,
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
import { CollectionDashboardScreen } from "../screens/collection-dashboard-screen";
import { SeasonPreparationScreen } from "../screens/season-preparation-screen";
import { ProviderSourcesScreen } from "../screens/provider-sources-screen";
import { SourcePreparationScreen } from "../screens/source-preparation-screen";
import { SourceChildrenScreen } from "../screens/source-children-screen";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";

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
  usePreventRemove: jest.fn(),
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
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
const mockIsFocused = jest.fn(() => true);
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
let publicClient = createQueryClient();
let client = publicClient;
// Failure presentation is isolated here; native retry defaults have their own Query suite.
publicClient.setQueryDefaults([], { retry: false });
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
  if (path.endsWith("/application-access"))
    return json(applicationAccessResponse());
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
  mockIsFocused.mockReset().mockReturnValue(true);
  publicClient = createQueryClient();
  client = publicClient;
  // Failure presentation is isolated here; native retry defaults have their own Query suite.
  publicClient.setQueryDefaults([], { retry: false });
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
afterEach(async () => {
  await cleanup();
  client.clear();
  publicClient.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Real session, query and theme providers; native identity, Router focus and HTTP are controlled boundaries. */
async function renderPreparation(
  content = <SourcePreparationScreen seasonId={seasonId} sourceId={sourceId} />,
) {
  return render(content, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={publicClient}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <PrivateQueries>
                <AccountFeedbackProvider>{children}</AccountFeedbackProvider>
              </PrivateQueries>
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  });
}

it.each(["candidate", "creation"] as const)(
  "cancels the %s draft only after native discard confirmation",
  async (kind) => {
    // Given
    const user = userEvent.setup();
    await renderPreparation(
      kind === "candidate" ? (
        <SourcePreparationScreen seasonId={seasonId} sourceId={sourceId} />
      ) : (
        <ProviderSourcesScreen seasonId={seasonId} provider="lnv" />
      ),
    );
    const open =
      kind === "candidate" ? "Modifier le lien" : "Ajouter une source";
    await user.press(await screen.findByRole("button", { name: open }));
    await user.clear(screen.getByLabelText("URL officielle"));
    await user.type(screen.getByLabelText("URL officielle"), draftUrl);

    // When
    await user.press(screen.getByRole("button", { name: "Annuler" }));
    await act(async () => nativeAlertAction("Continuer la saisie")());

    // Then
    expect(screen.getByDisplayValue(draftUrl)).toBeOnTheScreen();

    // When
    await user.press(screen.getByRole("button", { name: "Annuler" }));
    await act(async () => nativeAlertAction("Abandonner")());

    // Then
    expect(screen.queryByLabelText("URL officielle")).toBeNull();
    expect(
      mockFetch.mock.calls.every(
        ([, options]) => !options?.method || options.method === "GET",
      ),
    ).toBe(true);

    // When
    await user.press(screen.getByRole("button", { name: open }));

    // Then
    expect(screen.getByLabelText("URL officielle")).toHaveDisplayValue(
      kind === "candidate" ? candidateUrl : "",
    );
  },
);
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

it("lists canonical seasons in the production collection overview", async () => {
  // Given
  const user = userEvent.setup();
  await renderPreparation(<CollectionDashboardScreen />);

  // When
  await user.press(
    await screen.findByRole("link", { name: "2026/2027, Active" }),
  );

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/collection/[seasonId]",
    params: { seasonId },
  });
});

it("opens provider controls without loading unused source configuration", async () => {
  // Given
  const user = userEvent.setup();
  await renderPreparation(<SeasonPreparationScreen seasonId={seasonId} />);

  // When
  await user.press(
    await screen.findByRole("link", {
      name: "LNV, Les trois championnats professionnels",
    }),
  );

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/collection/[seasonId]/controls/[provider]",
    params: { seasonId, provider: "lnv" },
  });
  expect(
    mockFetch.mock.calls.some(([url]) =>
      String(url).includes("/source-bindings"),
    ),
  ).toBe(false);
});

it("announces pending collection navigation without inventing a season destination", async () => {
  // Given
  const response = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url) =>
    String(url).endsWith("/collection-seasons") ? response.promise : reads(url),
  );

  // When
  await renderPreparation(<CollectionDashboardScreen />);

  // Then
  expect(
    await screen.findByRole("progressbar", {
      name: "Chargement des collectes",
    }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: "2026/2027, Active" }),
  ).not.toBeOnTheScreen();

  // When
  await act(() => response.resolve(json({ items: [season] })));

  // Then
  expect(
    await screen.findByRole("link", { name: "2026/2027, Active" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
});

it("shows an honest empty season list and recovers an initial read failure explicitly", async () => {
  // Given
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/collection-seasons") ? refused(503) : reads(url),
  );
  await renderPreparation(<CollectionDashboardScreen />);
  await screen.findByText("Une erreur est survenue");

  // When
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/collection-seasons")
      ? json({ items: [] })
      : reads(url),
  );
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

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
      await screen.findByText("Une erreur est survenue"),
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
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("button", { name: "Modifier le lien" }),
  );
  await user.clear(screen.getByLabelText("URL officielle"));
  await user.type(screen.getByLabelText("URL officielle"), draftUrl);
  mockFetch.mockImplementation(async (url, options) =>
    options?.method === "PUT"
      ? json((source = binding({ revision: 3, candidateUrl: draftUrl })))
      : reads(url),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

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

it.each(["unchanged", "trimmed"])(
  "preserves qualified feedback when saving an %s candidate",
  async (change) => {
    // Given
    source = binding({ validation: "qualified", seasonEvidence: "2026/2027" });
    await renderPreparation();
    const user = userEvent.setup();
    await user.press(
      await screen.findByRole("button", { name: "Modifier le lien" }),
    );
    if (change === "trimmed") {
      await user.clear(screen.getByLabelText("URL officielle"));
      await user.type(
        screen.getByLabelText("URL officielle"),
        `  ${candidateUrl}  `,
      );
    }
    mockFetch.mockImplementation(async (url, options) =>
      options?.method === "PUT" ? json(source) : reads(url),
    );

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));

    // Then
    expect(
      await screen.findByRole("button", { name: "Modifier le lien" }),
    ).toBeEnabled();
    expect(screen.getByText("Prête")).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Valider la source" }),
    ).not.toBeOnTheScreen();
  },
);

it("preserves dirty input through a background refetch and requires an explicit reread", async () => {
  // Given
  const user = userEvent.setup();
  await renderPreparation();
  await user.press(
    await screen.findByRole("button", { name: "Modifier le lien" }),
  );
  await user.clear(screen.getByLabelText("URL officielle"));
  await user.type(screen.getByLabelText("URL officielle"), draftUrl);
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
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled(),
  );
});

it.each([400, 403, 422])(
  "keeps the candidate after a confirmed %i refusal",
  async (status) => {
    // Given
    await renderPreparation();
    const user = userEvent.setup();
    await user.press(
      await screen.findByRole("button", { name: "Modifier le lien" }),
    );
    await user.clear(screen.getByLabelText("URL officielle"));
    await user.type(screen.getByLabelText("URL officielle"), draftUrl);
    mockFetch.mockImplementation(async (url, options) =>
      options?.method === "PUT" ? refused(status) : reads(url),
    );

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));

    // Then
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Une erreur est survenue. Veuillez réessayer plus tard.",
    );
    expect(screen.getByDisplayValue(draftUrl)).toBeOnTheScreen();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
    );
  },
);

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
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

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
    expect.objectContaining({ cancelable: true }),
  );
  await act(async () => nativeAlertAction("Confirmer la saison")());

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

it("rejects credential-bearing candidate input locally without losing it or sending a write", async () => {
  // Given
  await renderPreparation();
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("button", { name: "Modifier le lien" }),
  );
  await user.clear(screen.getByLabelText("URL officielle"));
  await user.type(screen.getByLabelText("URL officielle"), draftUrl);
  const invalid = "https://operator:password@example.invalid/source";
  await user.clear(screen.getByLabelText("URL officielle"));
  await user.type(screen.getByLabelText("URL officielle"), invalid);

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

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
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

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

  // When
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Relire l’état" })).toBeEnabled(),
  );
  await user.press(screen.getByRole("button", { name: "Relire l’état" }));
  await screen.findByText(
    "État relu. Vérifiez votre saisie avant une nouvelle action.",
  );
  await user.press(screen.getByRole("button", { name: "Ajouter une source" }));

  // Then
  expect(
    screen.getByLabelText("Référence de l’organisateur ou du championnat"),
  ).toHaveDisplayValue("");
  expect(screen.getByLabelText("URL officielle")).toHaveDisplayValue("");
});

it("keeps a manual draft read-only when ordinary refresh establishes terminal season closure", async () => {
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
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await screen.findByText(
    "Le résultat doit être vérifié avant une nouvelle action.",
  );
  season = { ...season, revision: 6, state: "closed" };

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

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
  await screen.findByRole("link", { name: "Préparer D1 masculine" });
  mockFetch.mockImplementation(async (url, options) =>
    options?.method === "POST" ? json({ ...season, revision: 6 }) : reads(url),
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Lancer les sources prêtes" }),
  );
  await act(async () => nativeAlertAction("Lancer")());

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

it("loads the next child page only from the visible idle list and retains bounded rows without an invented total", async () => {
  // Given
  const nextPage = Promise.withResolvers<Response>();
  mockFetch.mockImplementation(async (url) => {
    const parsed = new URL(String(url));
    if (!parsed.pathname.endsWith("/children")) return reads(url);
    const page = Number(parsed.searchParams.get("page"));
    if (page === 1) return nextPage.promise;
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
  mockIsFocused.mockReturnValue(false);
  await fireEvent(
    screen.getByTestId("collection-source-children-list"),
    "endReached",
  );

  // Then
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).includes("/children")),
  ).toHaveLength(1);

  // When
  mockIsFocused.mockReturnValue(true);
  await fireEvent(
    screen.getByTestId("collection-source-children-list"),
    "endReached",
  );
  await fireEvent(
    screen.getByTestId("collection-source-children-list"),
    "endReached",
  );
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([url]) => String(url).includes("/children")),
    ).toHaveLength(2),
  );
  await act(async () =>
    nextPage.resolve(
      json({
        items: [
          {
            id: "00000000-0000-4000-8000-000000000183",
            label: "Phase finale",
            kind: "pool",
          },
        ],
        page: 1,
        hasNext: false,
      }),
    ),
  );

  // Then
  expect(await screen.findByText("Phase finale")).toBeOnTheScreen();
  expect(screen.getByText("Phase régulière")).toBeOnTheScreen();

  // When
  await fireEvent(
    screen.getByTestId("collection-source-children-list"),
    "endReached",
  );

  // Then
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
  expect(
    screen.queryByRole("button", { name: "Charger la suite" }),
  ).not.toBeOnTheScreen();
});

it("retains child rows and retries the failed page after a toast while retaining explicit continuation", async () => {
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
  await fireEvent(
    screen.getByTestId("collection-source-children-list"),
    "endReached",
  );
  await screen.findByRole("button", {
    name: "Réessayer",
  });
  fails = false;

  // When
  await fireEvent(
    screen.getByTestId("collection-source-children-list"),
    "endReached",
  );

  // Then
  expect(screen.getByText("Phase régulière")).toBeOnTheScreen();
  expect(
    screen.getByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(
      ([url]) =>
        String(url).includes("/children") &&
        new URL(String(url)).searchParams.get("page") === "1",
    ),
  ).toHaveLength(1);

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

it("retains authorized child rows after a failed native refresh with discreet feedback", async () => {
  // Given
  let unavailable = false;
  mockFetch.mockImplementation((url) =>
    String(url).includes("/children")
      ? Promise.resolve(
          unavailable
            ? refused(503)
            : json({
                items: [
                  {
                    id: "00000000-0000-4000-8000-000000000182",
                    label: "Groupe conservé",
                    kind: "pool",
                  },
                ],
                page: 0,
                hasNext: false,
              }),
        )
      : reads(url),
  );
  await renderPreparation(
    <SourceChildrenScreen seasonId={seasonId} sourceId={sourceId} />,
  );
  await screen.findByText("Groupe conservé");

  // When
  unavailable = true;
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Groupe conservé")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
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
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await screen.findByText(
    "Le résultat doit être vérifié avant une nouvelle action.",
  );
  expect(screen.getByDisplayValue("137")).toBeOnTheScreen();
  expect(screen.getByDisplayValue(candidateUrl)).toBeOnTheScreen();
});

it("shows a server refusal after grant revocation while retaining a read-only draft", async () => {
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
  mockFetch.mockImplementation(async (url, options) =>
    options?.method === "PUT" ? refused(403) : reads(url),
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Relire les permissions" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Confirmer la saison" }),
    ).toBeDisabled(),
  );
  expect(screen.queryByText("Une erreur est survenue")).toBeNull();
  await act(async () => nativeAlertAction("Confirmer la saison")());

  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.some(([, options]) => options?.method === "PUT"),
    ).toBe(true),
  );
  expect(
    screen.getByRole("button", { name: "Confirmer la saison" }),
  ).toBeDisabled();
});

it("rejects a source mutation arriving after the original F05 session ended", async () => {
  // Given
  await renderPreparation(
    <>
      <SourcePreparationScreen seasonId={seasonId} sourceId={sourceId} />
      <AccountActions />
    </>,
  );
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("button", { name: "Modifier le lien" }),
  );
  await user.clear(screen.getByLabelText("URL officielle"));
  await user.type(screen.getByLabelText("URL officielle"), draftUrl);
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
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
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

it("preserves a newer source read when an older accepted candidate response arrives later", async () => {
  // Given
  const response = Promise.withResolvers<Response>();
  await renderPreparation();
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("button", { name: "Modifier le lien" }),
  );
  await user.clear(screen.getByLabelText("URL officielle"));
  await user.type(screen.getByLabelText("URL officielle"), draftUrl);
  const accepted = binding({ revision: 3, candidateUrl: draftUrl });
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT" ? response.promise : reads(url),
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await screen.findByRole("button", {
    name: "Enregistrer",
    busy: true,
  });

  // When — a later server revision is admitted while the command acknowledgement is delayed.
  source = binding({ revision: 4, candidateUrl: `${candidateUrl}&PID=194` });
  await act(async () =>
    client.refetchQueries({
      predicate: ({ queryKey }) =>
        queryKey.some(
          (part) =>
            typeof part === "string" &&
            part.endsWith(`/source-bindings/${sourceId}`),
        ),
    }),
  );
  await act(async () => response.resolve(json(accepted)));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Modifier le lien" }),
    ).toBeEnabled(),
  );
  await user.press(screen.getByRole("button", { name: "Modifier le lien" }));

  // Then — acceptance is retained, but its older baseline cannot authorize another write.
  expect(
    client.getQueryCache().findAll({
      predicate: ({ queryKey }) =>
        queryKey.some(
          (part) =>
            typeof part === "string" &&
            part.endsWith(`/source-bindings/${sourceId}`),
        ),
    })[0]?.state.data,
  ).toMatchObject({ revision: 4, candidateUrl: source.candidateUrl });
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
});

it("keeps every provider blocked when an acknowledged source invalidates a season whose refresh fails", async () => {
  // Given
  const user = userEvent.setup();
  const view = await renderPreparation(
    <ProviderSourcesScreen seasonId={seasonId} provider="lnv" />,
  );
  await user.press(
    await screen.findByRole("button", { name: "Ajouter une source" }),
  );
  await user.type(
    screen.getByLabelText("Référence de l’organisateur ou du championnat"),
    "139",
  );
  await user.type(screen.getByLabelText("URL officielle"), draftUrl);
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "POST")
      return Promise.resolve(json(binding({ organizerReference: "139" }), 201));
    if (
      new URL(String(url)).pathname.endsWith(`/collection-seasons/${seasonId}`)
    )
      return Promise.resolve(refused(503));
    return reads(url);
  });

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await screen.findByText(
    "Source ajoutée. Relisez l’état avant une nouvelle action.",
  );
  await waitFor(() =>
    expect(
      client
        .getQueryCache()
        .getAll()
        .some(
          (query) =>
            query.state.isInvalidated && query.state.status === "error",
        ),
    ).toBe(true),
  );
  await view.rerender(
    <ProviderSourcesScreen seasonId={seasonId} provider="ffvb" />,
  );

  // Then
  // When
  await user.press(
    await screen.findByRole("button", { name: "Ajouter une source" }),
  );
  // Then
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  expect(screen.queryByText("Une erreur est survenue")).toBeNull();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
});

it("preserves an edited source URL when pull-to-refresh reads a newer source revision", async () => {
  // Given
  const user = userEvent.setup();
  await renderPreparation();
  await user.press(
    await screen.findByRole("button", { name: "Modifier le lien" }),
  );
  await user.clear(screen.getByLabelText("URL officielle"));
  await user.type(screen.getByLabelText("URL officielle"), draftUrl);
  expect(screen.queryByRole("button", { name: "Relire l’état" })).toBeNull();
  source = binding({ revision: 3, label: "D1 actualisée" });
  mockFetch.mockClear();

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await screen.findByRole("header", { name: "D1 actualisée" });
  expect(screen.getByDisplayValue(draftUrl)).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Relire l’état" })).toBeEnabled();
  expect(
    mockFetch.mock.calls.every(
      ([, options]) => !options?.method || options.method === "GET",
    ),
  ).toBe(true);
});

it("hides retained source groups when the current catalog read is refused", async () => {
  // Given
  const user = userEvent.setup();
  mockFetch.mockImplementation((url) =>
    String(url).includes("/children")
      ? Promise.resolve(
          json({
            items: [
              {
                id: "00000000-0000-4000-8000-000000000182",
                label: "Groupe retenu",
                kind: "pool",
              },
            ],
            page: 0,
            hasNext: false,
          }),
        )
      : reads(url),
  );
  await renderPreparation(
    <SourceChildrenScreen seasonId={seasonId} sourceId={sourceId} />,
  );
  await screen.findByText("Groupe retenu");
  mockFetch.mockImplementation((url) =>
    String(url).includes("/children")
      ? Promise.resolve(refused(403))
      : reads(url),
  );

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(await screen.findByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(screen.queryByText("Groupe retenu")).not.toBeOnTheScreen();
  expect(screen.queryByText("Aucun groupe découvert")).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled();
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();

  // When
  mockFetch
    .mockClear()
    .mockImplementation((url) =>
      String(url).includes("/children")
        ? Promise.resolve(refused(503))
        : reads(url),
    );
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  expect(
    await screen.findByRole("button", { name: "Réessayer", busy: false }),
  ).toBeEnabled();
  expect(await screen.findByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(screen.queryByText("Groupe retenu")).not.toBeOnTheScreen();
  expect(screen.queryByText("Aucun groupe découvert")).not.toBeOnTheScreen();
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();

  // When
  mockFetch.mockClear().mockImplementation(reads);
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByText("Aucun groupe découvert")).toBeOnTheScreen();
  expect(screen.getByLabelText("Actualiser les données")).toBeEnabled();
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it("explains missing collection permission without leaving a disabled catalog in loading", async () => {
  // Given
  permissions = {};

  // When
  await renderPreparation(
    <SourceChildrenScreen seasonId={seasonId} sourceId={sourceId} />,
  );

  // Then
  expect(await screen.findByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).includes("/children")),
  ).toBe(false);
});

it("retains a source draft but disables its commands after the current source read is refused", async () => {
  // Given
  const user = userEvent.setup();
  await renderPreparation();
  await user.press(
    await screen.findByRole("button", { name: "Modifier le lien" }),
  );
  await user.clear(screen.getByLabelText("URL officielle"));
  await user.type(screen.getByLabelText("URL officielle"), draftUrl);
  mockFetch.mockImplementation((url) =>
    String(url).endsWith(`/source-bindings/${sourceId}`)
      ? Promise.resolve(refused(403))
      : reads(url),
  );

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Une erreur est survenue")).toBeNull();
  expect(screen.getByDisplayValue(draftUrl)).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  mockFetch.mockImplementation((url) =>
    String(url).endsWith(`/source-bindings/${sourceId}`)
      ? Promise.resolve(refused(503))
      : reads(url),
  );
  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  // Then
  await waitFor(() =>
    expect(screen.queryByText("Une erreur est survenue")).not.toBeOnTheScreen(),
  );
  expect(screen.getByDisplayValue(draftUrl)).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
});

it("keeps refused season navigation hidden through a failed reread until a successful owner retry", async () => {
  // Given
  const user = userEvent.setup();
  await renderPreparation(<SeasonPreparationScreen seasonId={seasonId} />);
  await screen.findByRole("link", {
    name: "LNV, Les trois championnats professionnels",
  });
  let status = 403;
  mockFetch.mockImplementation((url) =>
    String(url).endsWith(`/collection-seasons/${seasonId}`) && status !== 200
      ? Promise.resolve(refused(status))
      : reads(url),
  );

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await screen.findByRole("alert", { name: "Une erreur est survenue" });
  expect(
    screen.queryByRole("link", {
      name: "LNV, Les trois championnats professionnels",
    }),
  ).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Clôturer la saison" }),
  ).toBeNull();
  status = 503;
  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  // Then
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled(),
  );
  expect(
    screen.queryByRole("link", {
      name: "LNV, Les trois championnats professionnels",
    }),
  ).toBeNull();
  status = 200;
  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  // Then
  expect(
    await screen.findByRole("link", {
      name: "LNV, Les trois championnats professionnels",
    }),
  ).toBeEnabled();
  expect(screen.queryByText("Une erreur est survenue")).toBeNull();
});

/** Captures the identity-owned private cache while retaining the public cache for fixture cleanup. */
function PrivateQueries({ children }: PropsWithChildren) {
  const privateClient = useQueryClient();
  // Configure deterministic failure presentation before child Query observers mount.
  privateClient.setQueryDefaults([], { retry: false, gcTime: Infinity });
  privateClient.setMutationDefaults([], { gcTime: Infinity });
  useLayoutEffect(() => {
    client = privateClient;
  }, [privateClient]);
  return children;
}
