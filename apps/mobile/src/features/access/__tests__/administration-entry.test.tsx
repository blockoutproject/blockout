import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { ApplicationAccessProvider } from "../queries/use-application-access";
import { applicationAccessResponse as mockApplicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import { useCurrentAccount } from "../../accounts/api/use-current-account";
import { ProfileScreen } from "../../accounts/screens/profile-screen";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { AdministrationEntry } from "../components/administration-entry";
import { AdministrationScreen } from "../screens/administration-screen";
import AdministrationRoute from "../../../app/(operations)/administration";

// The installed library controls native keyboard I/O; profile and admission behavior remain real.
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

// Navigation is an external boundary here; the discard guard has real-router coverage in its owning suite.
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  usePreventRemove: jest.fn(),
  useRouter: () => ({
    replace: jest.fn(),
    back: mockBack,
    canGoBack: () => true,
  }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    String(url).endsWith("/application-access")
      ? Promise.resolve(Response.json(mockApplicationAccessResponse()))
      : mockFetch(url, options),
}));

const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const mockBack = jest.fn();
let client = createQueryClient();
const environment = { ...process.env };
const account = {
  accountId: "00000000-0000-4000-8000-000000000174",
  username: "Player_174",
  email: "player@example.invalid",
  principalCreatedAt: null,
  hasPhoto: false,
  permissions: {},
};

beforeEach(() => {
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
    .mockResolvedValue(credentialsFor("auth0|operator"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuth
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|operator"));
  mockFetch.mockReset().mockImplementation(async () => json(account));
});
afterEach(() => {
  client.clear();
  jest.restoreAllMocks();
  process.env = { ...environment };
});

/** Real session, query, theme and generated transport; only native credentials and HTTP are controlled. */
async function renderAdministration(
  content = (
    <>
      <AdministrationEntry />
      <AdministrationScreen admitted />
    </>
  ),
) {
  return render(content, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ActionFeedbackProvider scopeKey="test">
            <ApplicationAccessProvider>
              <AccountSessionProvider>{children}</AccountSessionProvider>
            </ApplicationAccessProvider>
          </ActionFeedbackProvider>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  });
}

/** Exposes explicit refresh and sign-out through the existing owners, without a second session fixture. */
function AccountActions() {
  const session = useAccountSession();
  const query = useCurrentAccount();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Relire le compte"
        onPress={() => void query.refetch()}
      >
        <Text>Relire</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quitter la session"
        onPress={() => void session.clearCredentials()}
      >
        <Text>Quitter</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Rouvrir la session"
        onPress={() => void session.signIn("mobile-test")}
      >
        <Text>Rouvrir</Text>
      </Pressable>
    </>
  );
}

it.each([
  {},
  {
    manageMaintenance: false,
    manageApplicationVersions: false,
    manageCollection: false,
  },
  { bypassMaintenance: true },
  {
    manageSportingClassification: false,
    manageDivisionLifecycle: false,
    moderateStreamLinks: true,
  },
  { isAdmin: true, owner: true, futureAction: true },
])(
  "does not infer technical commands from unrelated or missing capabilities: %j",
  async (permissions) => {
    // Given
    mockFetch.mockImplementation(async () => json({ ...account, permissions }));

    // When
    await renderAdministration();

    // Then
    expect(
      await screen.findByText("Une erreur est survenue"),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("link", { name: "Administration technique" }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("link", { name: "Maintenance" }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("link", { name: "Versions minimales" }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("link", { name: "Collectes" }),
    ).not.toBeOnTheScreen();
  },
);

it.each([
  ["manageMaintenance", "Maintenance"],
  ["manageApplicationVersions", "Versions minimales"],
  ["manageCollection", "Collectes"],
])(
  "presents only the dedicated command granted by %s",
  async (capability, label) => {
    // Given
    mockFetch.mockImplementation(async () =>
      json({
        ...account,
        permissions: { [capability]: true, futureAction: true },
      }),
    );

    // When
    await renderAdministration();

    // Then
    expect(
      await screen.findByRole("link", { name: "Administration technique" }),
    ).toBeOnTheScreen();
    expect(await screen.findByRole("link", { name: label })).toBeOnTheScreen();
    for (const other of [
      "Maintenance",
      "Versions minimales",
      "Collectes",
    ].filter((value) => value !== label)) {
      expect(screen.queryByRole("link", { name: other })).not.toBeOnTheScreen();
    }
    expect(
      mockFetch.mock.calls.every(
        ([, request]) =>
          request?.method === "GET" &&
          !new Headers(request.headers).has("Blockout-Maintenance-Bypass"),
      ),
    ).toBe(true);
    expect(
      screen.queryByText(/Pro|publication légale|permissions/i),
    ).not.toBeOnTheScreen();
  },
);

it.each(["true", 1, null])(
  "does not coerce malformed capabilities (%s) into grants",
  async (manageMaintenance) => {
    // Given
    mockFetch.mockImplementation(async () =>
      json({ ...account, permissions: { manageMaintenance } }),
    );

    // When
    await renderAdministration();

    // Then
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Une erreur est survenue",
    );
    expect(
      screen.queryByRole("link", { name: "Administration technique" }),
    ).not.toBeOnTheScreen();
  },
);

it("removes a revoked command independently while retaining another current grant", async () => {
  // Given
  mockFetch.mockImplementation(async () =>
    json({
      ...account,
      permissions: { manageMaintenance: true, manageApplicationVersions: true },
    }),
  );
  const user = userEvent.setup();
  await renderAdministration(
    <>
      <AccountActions />
      <AdministrationEntry />
      <AdministrationScreen admitted />
    </>,
  );
  await screen.findByRole("link", { name: "Maintenance" });
  mockFetch.mockImplementation(async () =>
    json({
      ...account,
      permissions: {
        manageMaintenance: false,
        manageApplicationVersions: true,
      },
    }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Relire le compte" }));

  // Then
  await waitFor(() =>
    expect(
      screen.queryByRole("link", { name: "Maintenance" }),
    ).not.toBeOnTheScreen(),
  );
  expect(
    screen.getByRole("link", { name: "Versions minimales" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("link", { name: "Administration technique" }),
  ).toBeOnTheScreen();
});

it("hides retained capabilities after a refused account refresh behind an opaque read card", async () => {
  // Given
  mockFetch.mockImplementation(async () =>
    json({ ...account, permissions: { manageMaintenance: true } }),
  );
  const user = userEvent.setup();
  await renderAdministration(
    <>
      <AccountActions />
      <AdministrationEntry />
      <AdministrationScreen admitted />
    </>,
  );
  await screen.findByRole("link", { name: "Maintenance" });
  mockFetch.mockImplementation(async () =>
    json({ type: "about:blank", title: "Forbidden", status: 403 }, 403),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Relire le compte" }));

  // Then
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Une erreur est survenue",
  );
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled();
  expect(
    screen.queryByRole("link", { name: "Maintenance" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: "Administration technique" }),
  ).not.toBeOnTheScreen();
});

it("discards an account response completed after the F05 generation ends", async () => {
  // Given
  const response = Promise.withResolvers<Response>();
  mockFetch.mockReturnValue(response.promise);
  const user = userEvent.setup();
  await renderAdministration(
    <>
      <AccountActions />
      <AdministrationEntry />
      <AdministrationScreen admitted />
    </>,
  );
  await waitFor(() => expect(mockFetch).toHaveBeenCalled());

  // When
  await user.press(screen.getByRole("button", { name: "Quitter la session" }));
  await act(async () =>
    response.resolve(
      json({ ...account, permissions: { manageMaintenance: true } }),
    ),
  );

  // Then
  expect(
    screen.queryByRole("link", { name: "Maintenance" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: "Administration technique" }),
  ).not.toBeOnTheScreen();
  expect(client.getQueriesData({}).map(([, data]) => data)).not.toContainEqual(
    expect.objectContaining({ permissions: { manageMaintenance: true } }),
  );
});

it("offers no commands to a guest and performs no current-account read", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(false);

  // When
  await renderAdministration();

  // Then
  expect(await screen.findByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: "Administration technique" }),
  ).not.toBeOnTheScreen();
  expect(mockFetch).not.toHaveBeenCalled();
});

it("does not restore an old grant after returning to the same account in a new F05 generation", async () => {
  // Given
  const oldResponse = Promise.withResolvers<Response>();
  mockFetch
    .mockReturnValueOnce(oldResponse.promise)
    .mockImplementation(async () =>
      json({ ...account, permissions: { manageApplicationVersions: true } }),
    );
  const user = userEvent.setup();
  await renderAdministration(
    <>
      <AccountActions />
      <AdministrationEntry />
      <AdministrationScreen admitted />
    </>,
  );
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

  // When
  await user.press(screen.getByRole("button", { name: "Quitter la session" }));
  await user.press(screen.getByRole("button", { name: "Rouvrir la session" }));
  await screen.findByRole("link", { name: "Versions minimales" });
  await act(async () =>
    oldResponse.resolve(
      json({ ...account, permissions: { manageMaintenance: true } }),
    ),
  );

  // Then
  expect(
    screen.queryByRole("link", { name: "Maintenance" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.getByRole("link", { name: "Versions minimales" }),
  ).toBeOnTheScreen();
});

it("recovers current command presentation only after an explicit successful retry", async () => {
  // Given
  mockFetch.mockImplementation(async () =>
    json({ type: "about:blank", title: "Unavailable", status: 503 }, 503),
  );
  const user = userEvent.setup();
  await renderAdministration();
  await screen.findByRole("alert");
  expect(
    screen.queryByRole("link", { name: "Administration technique" }),
  ).not.toBeOnTheScreen();
  mockFetch.mockImplementation(async () =>
    json({ ...account, permissions: { manageMaintenance: true } }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByRole("link", { name: "Maintenance" }),
  ).toBeOnTheScreen();
  expect(
    await screen.findByRole("link", { name: "Administration technique" }),
  ).toBeOnTheScreen();
});

it("hands back navigation to the router without an account command", async () => {
  // Given
  const user = userEvent.setup();
  await renderAdministration(<AdministrationScreen admitted={false} />);

  // When
  await user.press(screen.getByRole("button", { name: "Retour" }));

  // Then
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.every(([, request]) => request?.method === "GET"),
  ).toBe(true);
});

it("keeps direct route admission closed with no F12 composition, even with a management grant", async () => {
  // Given
  mockFetch.mockImplementation(async () =>
    json({ ...account, permissions: { manageMaintenance: true } }),
  );

  // When
  await renderAdministration(
    <>
      <AdministrationEntry />
      <AdministrationRoute />
    </>,
  );
  await screen.findByRole("link", { name: "Administration technique" });

  // Then
  expect(
    screen.getByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: "Maintenance" }),
  ).not.toBeOnTheScreen();
});

it("inserts the administration entry without replacing the current profile or its public links", async () => {
  // Given
  mockFetch.mockImplementation(async () =>
    json({ ...account, permissions: { manageMaintenance: true } }),
  );

  // When
  await renderAdministration(<ProfileScreen admitted proEntry={null} />);

  // Then
  expect(
    await screen.findByRole("link", { name: "Administration technique" }),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue(account.username)).toBeOnTheScreen();
  expect(screen.getByDisplayValue(account.email)).toBeOnTheScreen();
  expect(
    screen.getByRole("link", { name: "Confidentialité" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Continuer en tant qu’invité" }),
  ).toBeOnTheScreen();
});

/** Synthetic generated-response input; never contacts a provider or real account. */
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

it.each([
  "manageSportingClassification",
  "manageDivisionLifecycle",
  "manageSportingPresentation",
])("offers only the delivered division destination for %s", async (grant) => {
  // Given
  mockFetch.mockImplementation(async () =>
    json({ ...account, permissions: { [grant]: true } }),
  );

  // When
  await renderAdministration();

  // Then
  expect(
    await screen.findByRole("link", { name: "Administration technique" }),
  ).toBeOnTheScreen();
  expect(
    await screen.findByRole("link", { name: "Divisions" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: "Collectes" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: "Maintenance" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: "Versions minimales" }),
  ).not.toBeOnTheScreen();
});
