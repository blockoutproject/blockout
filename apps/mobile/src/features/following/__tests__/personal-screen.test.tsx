import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@testing-library/react-native";
import { View } from "react-native";
import { useEffect, type ReactNode, type PropsWithChildren } from "react";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import {
  createQueryClient,
  bindSessionQueries,
} from "../../../shared/query/query-client";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import {
  AccountSessionProvider,
  useAccountSession,
  type AccountSession,
} from "../../accounts/session/account-session-provider";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import {
  mockAuth0,
  credentialsFor,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ClubScreen } from "../../sporting/screens/club-screen";
import { SearchScreen } from "../../discovery/screens/search-screen";
import { SearchVisitProvider } from "../../discovery/forms/search-visit";
import { clubDetail } from "../../sporting/test-support/consultation-data";
import { PersonalScreen } from "../screens/personal-screen";
import { FollowButton } from "../components/follow-button";

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
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({ isFocused: () => true }),
}));
// The official native-inset double supplies the Modal window's measurement event in Jest.
jest.mock(
  "react-native-safe-area-context",
  () =>
    jest.requireActual("react-native-safe-area-context/src/jest/mock").default,
);
jest.mock("expo/fetch", () => ({
  fetch: (url: string, request?: RequestInit) => mockFetch(url, request),
}));
const mockPush = jest.fn();
const mockFetch = jest.fn<Promise<Response>, [string, RequestInit?]>();
const accountId = "00000000-0000-4000-8000-000000000001";
const older = {
  id: "00000000-0000-4000-8000-000000000002",
  startYear: 2025,
  label: "2025/2026",
};
const newer = {
  id: "00000000-0000-4000-8000-000000000003",
  startYear: 2026,
  label: "2026/2027",
};
const team = {
  type: "team",
  id: "00000000-0000-4000-8000-000000000004",
} as const;
const profile = {
  accountId,
  username: "Synthetic",
  email: "synthetic@example.invalid",
  principalCreatedAt: null,
  hasPhoto: false,
  permissions: {
    manageMaintenance: false,
    manageApplicationVersions: false,
    bypassMaintenance: false,
    manageSportingPresentation: false,
    manageSportingClassification: false,
    manageDivisionLifecycle: false,
    manageCollection: false,
    moderateStreamLinks: false,
  },
};
const environment = { ...process.env };
let client = createQueryClient();
let session: AccountSession;
let proposed = older;

/** Uses the root's real private-query cleanup; native identity/inset I/O and HTTP are controlled. */
function SessionBinding({ children }: PropsWithChildren) {
  const current = useAccountSession();
  useEffect(() => {
    session = current;
  }, [current]);
  useEffect(
    () => bindSessionQueries(client, current.subscribe, current.isCurrent),
    [current.subscribe, current.isCurrent],
  );
  return children;
}

/** Provides the actual F05/F12, Query, theme and feedback composition required by Home and follow actions. */
async function mount(extra?: ReactNode) {
  return render(
    <GestureHandlerRootView>
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <AccountFeedbackProvider>
                <SessionBinding>
                  <PersonalScreen />
                  {extra}
                </SessionBinding>
              </AccountFeedbackProvider>
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>,
  );
}

/** Synthetic current-owner HTTP responses go through the actual generated validation. */
async function transport(url: string, request?: RequestInit) {
  if (url.endsWith("/application-access"))
    return Response.json(applicationAccessResponse());
  if (url.endsWith("/accounts/me")) return Response.json(profile);
  if (url.includes("follow-options"))
    return Response.json({
      seasons: [newer, older],
      defaultSeasonId: proposed.id,
    });
  if (request?.method === "PUT") {
    proposed = newer;
    return Response.json({ following: true });
  }
  return Response.json({ following: false });
}

beforeEach(() => {
  client = createQueryClient();
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, gcTime: Infinity },
    mutations: { ...client.getDefaultOptions().mutations, gcTime: Infinity },
  });
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "test-client",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|synthetic"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuthLogout.mockReset().mockResolvedValue();
  mockFetch.mockReset().mockImplementation(transport);
  proposed = older;
});
afterEach(async () => {
  await cleanup();
  client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

it("keeps the selected season after an actual other-season follow invalidates current options", async () => {
  // Given
  const user = userEvent.setup();
  await mount(<FollowButton target={team} season={newer} />);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label }),
  );

  // When
  await user.press(screen.getByRole("tab", { name: "Suivis" }));
  await user.press(
    screen.getByRole("button", { name: "Suivre", disabled: false }),
  );

  // Then
  await screen.findByRole("button", { name: "Suivi", busy: false });
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([url]) => url.includes("follow-options"))
        .length,
    ).toBe(2),
  );
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: older.label });
  expect(
    screen.getByRole("tab", { name: "Suivis", selected: true }),
  ).toBeOnTheScreen();
});

it("keeps current choices after a failed explicit refresh and offers the next opening as retry", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label }),
  );
  mockFetch.mockImplementation((url, request) =>
    url.includes("follow-options")
      ? Promise.reject(new TypeError("Synthetic network failure"))
      : transport(url, request),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
  // Native Modal.onShow is not dispatched by the JavaScript press event.
  await fireEvent(screen.getByTestId("personal-season-modal"), "show");

  // Then
  await screen.findByRole("radio", { name: older.label, checked: true });
  await screen.findByRole("alert");
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([url]) => url.includes("follow-options"))
        .length,
    ).toBe(2),
  );
  expect(screen.getByRole("radio", { name: newer.label })).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
  // Native Modal.onShow is not dispatched by the JavaScript press event.
  await fireEvent(screen.getByTestId("personal-season-modal"), "show");

  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([url]) => url.includes("follow-options"))
        .length,
    ).toBe(3),
  );
});

it("removes the personal selector when its actual session signs out and uses the shared invitation", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Saison des suivis" }),
    ).toHaveAccessibilityValue({ text: older.label }),
  );

  const originalGeneration = session.generation;

  // When
  await act(async () => session.signOut());
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));

  // Then
  expect(
    screen.queryByRole("button", { name: "Saison des suivis" }),
  ).not.toBeOnTheScreen();
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/sign-in-invitation",
    params: { reason: "follow" },
  });
  expect(
    client
      .getQueryCache()
      .getAll()
      .filter(
        (query) =>
          query.queryKey[0] === "session" &&
          query.queryKey[1] === originalGeneration,
      ),
  ).toHaveLength(0);
});

it("leaves the actual club-season and search-input owners unchanged", async () => {
  // Given
  const user = userEvent.setup();
  mockFetch.mockImplementation((url, request) => {
    if (url.includes("/clubs/") && url.includes("/teams"))
      return Promise.resolve(Response.json({ seasonId: older.id, items: [] }));
    if (url.includes("/clubs/"))
      return Promise.resolve(
        Response.json({ ...clubDetail(), seasons: [older, newer] }),
      );
    if (url.includes("/sporting-search-options?"))
      return Promise.resolve(
        Response.json({
          resourceType: new URL(url).searchParams.get("resourceType"),
          seasons: [older],
          divisions: [],
          formats: ["6x6", "4x4", "2x2"],
          genders: ["female", "male", "mixed"],
        }),
      );
    if (url.includes("/teams?"))
      return Promise.resolve(Response.json({ teams: [] }));
    return transport(url, request);
  });
  await mount(
    <>
      <View accessibilityLabel="Public club">
        <ClubScreen clubId={team.id} />
      </View>
      <SearchVisitProvider>
        <SearchScreen />
      </SearchVisitProvider>
    </>,
  );
  const clubTeams = await within(
    screen.getByLabelText("Public club"),
  ).findByRole("tab", { name: "Équipes" });
  await layoutNativeTabs();
  await user.press(clubTeams);
  await screen.findByRole("button", { name: `Saison ${older.label}` });
  await user.type(screen.getByLabelText("Rechercher"), "Volleyball");
  await screen.findByText("Aucun résultat pour ces critères");

  // When
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
  await user.press(screen.getByRole("radio", { name: newer.label }));

  // Then
  expect(
    screen.getByRole("button", { name: `Saison ${older.label}` }),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Volleyball")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls
      .filter(([url]) => new URL(url).pathname === "/teams")
      .every(([url]) => new URL(url).searchParams.get("seasonId") === older.id),
  ).toBe(true);
  expect(
    screen.getByRole("button", { name: "Saison des suivis" }),
  ).toHaveAccessibilityValue({ text: newer.label });
});

it("distinguishes an initial options failure from successful empty options and retries the read", async () => {
  // Given
  const user = userEvent.setup();
  mockFetch.mockImplementation((url, request) =>
    url.includes("follow-options")
      ? Promise.reject(new TypeError("Synthetic network failure"))
      : transport(url, request),
  );
  await mount();

  // Then
  await screen.findByRole("button", { name: "Réessayer" });
  expect(
    screen.getByRole("button", { name: "Saison des suivis", disabled: true }),
  ).toHaveAccessibilityValue({ text: "Saison" });

  // When
  mockFetch.mockImplementation((url, request) =>
    url.includes("follow-options")
      ? Promise.resolve(Response.json({ seasons: [] }))
      : transport(url, request),
  );
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  await waitFor(() =>
    expect(
      screen.getByRole("button", {
        name: "Saison des suivis",
        disabled: false,
      }),
    ).toHaveAccessibilityValue({ text: "Toutes saisons" }),
  );
  await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
  expect(
    screen.getByRole("radio", { name: "Toutes les saisons", checked: true }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("radio", { name: older.label }),
  ).not.toBeOnTheScreen();
});

it.each([403, 404])(
  "suspends retained private choices after a current %i refusal and restores the retained selection only after a successful retry",
  async (status) => {
    // Given
    const user = userEvent.setup();
    await mount();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Saison des suivis" }),
      ).toHaveAccessibilityValue({ text: older.label }),
    );
    await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
    await user.press(screen.getByRole("radio", { name: newer.label }));
    mockFetch.mockImplementation((url, request) =>
      url.includes("follow-options")
        ? Promise.resolve(new Response(null, { status }))
        : transport(url, request),
    );

    // When
    await user.press(screen.getByRole("button", { name: "Saison des suivis" }));
    // Native Modal.onShow is not dispatched by the JavaScript press event.
    await fireEvent(screen.getByTestId("personal-season-modal"), "show");

    // Then
    await screen.findByRole("button", { name: "Réessayer" });
    expect(
      screen.getByRole("button", { name: "Saison des suivis", disabled: true }),
    ).toHaveAccessibilityValue({ text: "Saison" });
    expect(
      screen.queryByRole("radio", { name: older.label }),
    ).not.toBeOnTheScreen();

    // When
    mockFetch.mockImplementation((url, request) =>
      url.includes("follow-options")
        ? Promise.reject(new TypeError("Synthetic retry network failure"))
        : transport(url, request),
    );
    await user.press(screen.getByRole("button", { name: "Réessayer" }));
    await screen.findByRole("button", { name: "Réessayer", busy: false });

    // Then
    expect(
      screen.getByRole("button", { name: "Saison des suivis", disabled: true }),
    ).toHaveAccessibilityValue({ text: "Saison" });

    // When
    mockFetch.mockImplementation(transport);
    await user.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Saison des suivis",
          disabled: false,
        }),
      ).toHaveAccessibilityValue({ text: newer.label }),
    );
  },
);
