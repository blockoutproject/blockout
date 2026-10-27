import { router, Stack } from "expo-router";
import { Text } from "react-native";
import { renderRouter } from "expo-router/testing-library";
import SearchLayout from "../../../app/(ordinary)/search/_layout";
import { SearchFilters } from "../components/search-filters";
import { SearchFilterChoice } from "../components/search-filter-choice";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  act,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { SearchScreen } from "../screens/search-screen";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import { mockAuth0 } from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";

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
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
const mockFetch = jest.fn();
const environment = { ...process.env };
const firstId = "00000000-0000-4000-8000-000000000001";
const secondId = "00000000-0000-4000-8000-000000000002";
const season = { id: firstId, label: "2026/2027", startYear: 2026 };
const oldSeason = { id: secondId, label: "2018/2019", startYear: 2018 };
const futureSeason = {
  id: "00000000-0000-4000-8000-000000000003",
  label: "2040/2041",
  startYear: 2040,
};
const division = {
  id: "00000000-0000-4000-8000-000000000004",
  name: "Nationale",
  color: "#112233",
  gradient: null,
};
let seasons = [season, oldSeason];
let divisions = [division];
let choicesFail = false;
let client = createQueryClient();

/** Controls HTTP only; generation, response validation, Query, session and admission stay real. */
function publicReads(url: string): Promise<Response> {
  const path = new URL(url).pathname;
  if (path.endsWith("/application-access"))
    return Promise.resolve(Response.json(applicationAccessResponse()));
  if (path.endsWith("/sporting-search-options"))
    return Promise.resolve(
      choicesFail
        ? Response.json({ status: 503 }, { status: 503 })
        : Response.json({
            resourceType: new URL(url).searchParams.get("resourceType"),
            seasons,
            divisions,
            formats: ["6x6", "4x4", "2x2"],
            genders: ["female", "male", "mixed"],
          }),
    );
  if (path.endsWith("/clubs"))
    return Promise.resolve(
      Response.json({
        clubs: [
          { club: { id: firstId, name: "Volley" }, city: "Lyon" },
          { club: { id: secondId, name: "Volley" }, city: "Niort" },
        ],
      }),
    );
  if (path.endsWith("/teams"))
    return Promise.resolve(
      Response.json({
        teams: [
          {
            team: { id: firstId, name: "Volley professionnel" },
            season,
            classification: { format: "6x6", gender: "female" },
            professional: true,
          },
        ],
      }),
    );
  if (path.endsWith("/pools"))
    return Promise.resolve(
      Response.json({
        pools: [
          {
            pool: { id: firstId, name: "Poule A" },
            season,
            classification: {},
            competitionName: "Championnat public",
            phaseName: "Phase finale",
          },
        ],
      }),
    );
  throw new Error(`Unexpected controlled request ${path}`);
}

beforeEach(() => {
  client = createQueryClient();
  seasons = [season, oldSeason];
  divisions = [division];
  choicesFail = false;
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "test-client";
  jest.mocked(initializeV2Installation).mockResolvedValue(undefined);
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.getCredentials.mockReset();
  mockFetch.mockReset().mockImplementation(publicReads);
});
afterEach(async () => {
  await cleanup();
  client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Supplies the actual required owners; the membership input only selects F13 presentation. */
async function renderSearch() {
  return renderRouter(
    {
      _layout: () => (
        <Stack screenOptions={{ headerShown: false, animation: "none" }} />
      ),
      "search/_layout": SearchLayout,
      "search/index": SearchScreen,
      "search/filters": SearchFilters,
      "search/choice": SearchFilterChoice,
      detail: () => <Text>Controlled detail destination</Text>,
    },
    {
      initialUrl: "/search",
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>
          <ThemeProvider>
            <ApplicationAccessProvider>
              <AccountSessionProvider>
                <AccountFeedbackProvider>{children}</AccountFeedbackProvider>
              </AccountSessionProvider>
            </ApplicationAccessProvider>
          </ThemeProvider>
        </QueryClientProvider>
      ),
    },
  );
}

it("opens sporting filters without waiting for an account", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();

  // When
  await user.press(await screen.findByRole("button", { name: "Filtres" }));

  // Then
  expect(
    screen.getByRole("header", { name: "Filtrer les équipes" }),
  ).toBeOnTheScreen();
});

/** Drives the real nested route and single-choice draft, without replacing form or query behavior. */
async function choose(label: string, value: string) {
  const user = userEvent.setup();
  await user.press(await screen.findByRole("button", { name: label }));
  await user.press(await screen.findByRole("radio", { name: value }));
}
/** Opens the current tab's draft and waits for the generated catalogue to be accepted. */
async function openFilters() {
  const user = userEvent.setup();
  await user.press(await screen.findByRole("button", { name: /Filtres/ }));
  await screen.findByRole("button", { name: "Saison" });
}
/** Accepts the editable draft through the visible action. */
async function applyFilters() {
  await userEvent
    .setup()
    .press(screen.getByRole("button", { name: "Appliquer les filtres" }));
}

it("retains independent team and pool criteria through Clubs with shared text", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();
  await user.paste(await screen.findByLabelText("Rechercher"), "Volley");
  await openFilters();
  await choose("Genre", "Féminin");
  await choose("Saison", "2018/2019");
  await choose("Division", "Nationale");
  await choose("Format", "4 × 4");
  await applyFilters();

  // When
  await user.press(screen.getByRole("tab", { name: "Poules" }));
  await openFilters();
  await choose("Genre", "Masculin");
  await applyFilters();
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await screen.findByText("Lyon");
  expect(screen.queryByRole("button", { name: /Filtres/ })).toBeNull();
  const clubRead = mockFetch.mock.calls
    .map(([url]) => new URL(String(url)))
    .findLast((url) => url.pathname.endsWith("/clubs"));
  expect([...(clubRead?.searchParams.keys() ?? [])]).toEqual(["q"]);
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await openFilters();

  // Then
  expect(
    screen.getByRole("button", { name: "Genre" }),
  ).toHaveAccessibilityValue({ text: "Féminin" });
  expect(
    screen.getByRole("button", { name: "Saison" }),
  ).toHaveAccessibilityValue({ text: "2018/2019" });
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  const read = mockFetch.mock.calls
    .map(([url]) => new URL(String(url)))
    .findLast((url) => url.pathname.endsWith("/teams"));
  expect(Object.fromEntries(read?.searchParams ?? [])).toEqual({
    q: "Volley",
    seasonId: oldSeason.id,
    divisionId: division.id,
    format: "4x4",
    gender: "female",
  });
  expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
});

it("discards a closed draft and resets to the newest currently offered season only when applied", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();
  await openFilters();
  await choose("Saison", "2018/2019");
  await applyFilters();
  seasons = [futureSeason, season, oldSeason];

  // When
  await openFilters();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison" }),
    ).toHaveAccessibilityValue({ text: oldSeason.label }),
  );
  await user.press(
    screen.getByRole("button", { name: "Réinitialiser les filtres" }),
  );
  expect(
    screen.getByRole("button", { name: "Saison" }),
  ).toHaveAccessibilityValue({ text: futureSeason.label });
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  await openFilters();

  // Then
  expect(
    screen.getByRole("button", { name: "Saison" }),
  ).toHaveAccessibilityValue({ text: oldSeason.label });
  await user.press(
    screen.getByRole("button", { name: "Réinitialiser les filtres" }),
  );
  await applyFilters();
  await openFilters();
  expect(
    screen.getByRole("button", { name: "Saison" }),
  ).toHaveAccessibilityValue({ text: futureSeason.label });
});

it("reconciles unavailable choices after success while failed catalogue reads preserve selections", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();
  await openFilters();
  await choose("Saison", "2018/2019");
  await choose("Division", "Nationale");
  await applyFilters();
  seasons = [];
  divisions = [];
  choicesFail = true;

  // When
  await openFilters();
  await waitFor(() =>
    expect(
      client
        .getQueryCache()
        .getAll()
        .some(
          (query) =>
            query.queryKey[0] === "discovery-options" &&
            query.state.status === "error",
        ),
    ).toBe(true),
  );
  expect(
    screen.getByRole("button", { name: "Saison" }),
  ).toHaveAccessibilityValue({ text: oldSeason.label });
  expect(
    screen.getByRole("button", { name: "Division" }),
  ).toHaveAccessibilityValue({ text: division.name });
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  choicesFail = false;
  await openFilters();

  // Then
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  await openFilters();
  expect(
    screen.getByRole("button", { name: "Saison" }),
  ).toHaveAccessibilityValue({ text: "Toutes les saisons" });
  expect(
    screen.getByRole("button", { name: "Division" }),
  ).toHaveAccessibilityValue({ text: "Tout afficher" });
});

it.each([false, true])(
  "keeps the same valued implicit or explicit season when a newer one appears: %s",
  async (explicit) => {
    // Given
    const user = userEvent.setup();
    await renderSearch();
    await openFilters();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Saison" }),
      ).toHaveAccessibilityValue({ text: season.label }),
    );
    if (explicit) await choose("Saison", season.label);
    await applyFilters();
    seasons = [futureSeason, season, oldSeason];

    // When
    await openFilters();
    await choose("Saison", futureSeason.label);
    await user.press(screen.getByRole("button", { name: "Fermer" }));
    await openFilters();

    // Then
    expect(
      screen.getByRole("button", { name: "Saison" }),
    ).toHaveAccessibilityValue({ text: season.label });
  },
);

it("reads current choices for a new visit and accepts All seasons without fallback", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();
  await openFilters();
  await choose("Saison", "Toutes les saisons");
  await applyFilters();
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await screen.findByText("Volley professionnel");
  const read = mockFetch.mock.calls
    .map(([url]) => new URL(String(url)))
    .findLast((url) => url.pathname.endsWith("/teams"));
  expect(read?.searchParams.has("seasonId")).toBe(false);
  await act(() => router.replace("/detail"));
  await screen.findByText("Controlled detail destination");
  seasons = [futureSeason, season, oldSeason];

  // When
  await act(() => router.push("/search"));
  await openFilters();

  // Then
  expect(
    screen.getByRole("button", { name: "Saison" }),
  ).toHaveAccessibilityValue({ text: futureSeason.label });
});

it("does not relax a strict empty combination or retain another tab's obsolete text results", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();
  await user.paste(await screen.findByLabelText("Rechercher"), "Volley");
  await screen.findByText("Volley professionnel");
  await openFilters();
  await choose("Genre", "Féminin");
  await applyFilters();
  mockFetch.mockImplementation((url) =>
    new URL(String(url)).pathname.endsWith("/teams")
      ? Promise.resolve(Response.json({ teams: [] }))
      : publicReads(url),
  );

  // When
  await user.press(screen.getByRole("tab", { name: "Clubs" }));
  await user.clear(screen.getByLabelText("Rechercher"));
  await user.paste(screen.getByLabelText("Rechercher"), "Absent");
  await user.press(screen.getByRole("tab", { name: "Équipes" }));
  await screen.findByText("Aucun résultat pour ces critères");
  await openFilters();

  // Then
  expect(
    screen.getByRole("button", { name: "Genre" }),
  ).toHaveAccessibilityValue({ text: "Féminin" });
  expect(screen.queryByText("Volley professionnel")).toBeNull();
  const read = mockFetch.mock.calls
    .map(([url]) => new URL(String(url)))
    .findLast((url) => url.pathname.endsWith("/teams"));
  expect(read?.searchParams.get("q")).toBe("Absent");
  expect(read?.searchParams.get("gender")).toBe("female");
});

it("preserves dirty draft values through a successful background options read", async () => {
  // Given
  await renderSearch();
  await openFilters();
  await choose("Genre", "Mixte");
  await choose("Saison", "2018/2019");
  seasons = [futureSeason, season, oldSeason];

  // When
  await act(async () => {
    await client.refetchQueries({ queryKey: ["discovery-options"] });
  });

  // Then
  expect(
    screen.getByRole("button", { name: "Genre" }),
  ).toHaveAccessibilityValue({ text: "Mixte" });
  expect(
    screen.getByRole("button", { name: "Saison" }),
  ).toHaveAccessibilityValue({ text: oldSeason.label });
  await applyFilters();
  await openFilters();
  expect(
    screen.getByRole("button", { name: "Genre" }),
  ).toHaveAccessibilityValue({ text: "Mixte" });
});

it("keeps initial option failure distinct from an empty successful catalogue and retries explicitly", async () => {
  // Given
  choicesFail = true;
  const user = userEvent.setup();
  await renderSearch();
  await user.press(await screen.findByRole("button", { name: "Filtres" }));
  await screen.findByRole("button", { name: "Réessayer" });
  expect(screen.queryByRole("button", { name: "Saison" })).toBeNull();
  choicesFail = false;
  seasons = [];

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByRole("button", { name: "Saison" }),
  ).toHaveAccessibilityValue({ text: "Toutes les saisons" });
  await applyFilters();
  expect(
    screen.getByRole("tab", { name: "Équipes", selected: true }),
  ).toBeOnTheScreen();
});

it("cancels a superseded filter read and rejects its late completion", async () => {
  // Given: generated transport, Query and native routes remain real; only HTTP is delayed.
  const user = userEvent.setup();
  const response = Promise.withResolvers<Response>();
  let oldSignal: AbortSignal | undefined;
  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    const parsed = new URL(url);
    if (
      parsed.pathname.endsWith("/teams") &&
      !parsed.searchParams.has("gender")
    ) {
      oldSignal = options?.signal ?? undefined;
      return response.promise;
    }
    return publicReads(url);
  });
  await renderSearch();
  await user.paste(await screen.findByLabelText("Rechercher"), "Volley");
  await waitFor(() => expect(oldSignal).toBeDefined());

  // When
  await openFilters();
  await choose("Genre", "Féminin");
  await applyFilters();
  await screen.findByText("Volley professionnel");
  await act(async () =>
    response.resolve(
      Response.json({
        teams: [
          {
            team: { id: firstId, name: "Obsolete filter result" },
            season,
            classification: {},
            professional: true,
          },
        ],
      }),
    ),
  );

  // Then
  expect(oldSignal?.aborted).toBe(true);
  expect(screen.queryByText("Obsolete filter result")).toBeNull();
  expect(screen.getByText("Volley professionnel")).toBeOnTheScreen();
});

it("restores the current tab text and filters after an ordinary detail-route return", async () => {
  // Given: destination content is controlled; the actual Router retains the search visit underneath it.
  const user = userEvent.setup();
  await renderSearch();
  await user.press(screen.getByRole("tab", { name: "Poules" }));
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await openFilters();
  await choose("Genre", "Masculin");
  await applyFilters();
  await screen.findByText("Championnat public · Phase finale");

  // When
  await act(() => router.push("/detail"));
  await screen.findByText("Controlled detail destination");
  await act(() => router.back());

  // Then
  expect(
    screen.getByRole("tab", { name: "Poules", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Volley")).toBeOnTheScreen();
  expect(
    screen.getByText("Championnat public · Phase finale"),
  ).toBeOnTheScreen();
  await openFilters();
  expect(
    screen.getByRole("button", { name: "Genre" }),
  ).toHaveAccessibilityValue({ text: "Masculin" });
});

it("reconciles disappeared draft choices on successful reload without erasing other edits", async () => {
  // Given
  await renderSearch();
  await openFilters();
  await choose("Saison", oldSeason.label);
  await choose("Division", division.name);
  await choose("Genre", "Mixte");
  seasons = [futureSeason, season];
  divisions = [];

  // When
  await act(async () =>
    client.refetchQueries({ queryKey: ["discovery-options"] }),
  );

  // Then
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison" }),
    ).toHaveAccessibilityValue({ text: futureSeason.label }),
  );
  expect(
    screen.getByRole("button", { name: "Division" }),
  ).toHaveAccessibilityValue({ text: "Tout afficher" });
  expect(
    screen.getByRole("button", { name: "Genre" }),
  ).toHaveAccessibilityValue({ text: "Mixte" });
});

it("retains filters when clearing text and resets the current criteria from the results heading", async () => {
  // Given
  const user = userEvent.setup();
  await renderSearch();
  await openFilters();
  await choose("Saison", oldSeason.label);
  await choose("Genre", "Féminin");
  await applyFilters();
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await screen.findByText("Volley professionnel");

  // When
  await user.press(
    screen.getByRole("button", { name: "Effacer la recherche" }),
  );
  await openFilters();
  expect(
    screen.getByRole("button", { name: "Saison" }),
  ).toHaveAccessibilityValue({ text: oldSeason.label });
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  await user.paste(screen.getByLabelText("Rechercher"), "Volley");
  await user.press(await screen.findByRole("button", { name: "Effacer" }));
  await openFilters();

  // Then
  expect(
    screen.getByRole("button", { name: "Saison" }),
  ).toHaveAccessibilityValue({ text: season.label });
  expect(
    screen.getByRole("button", { name: "Genre" }),
  ).toHaveAccessibilityValue({ text: "Tout afficher" });
});
