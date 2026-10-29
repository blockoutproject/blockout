import { accountResponse } from "../test-support/account-response";
import { AccountFeedbackProvider } from "../test-support/account-feedback-provider";
import { applicationAccessResponse as mockApplicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Alert, Text } from "react-native";
import { nativeAlertAction } from "../../../shared/native/test-support/native-alert";
import { Stack } from "expo-router";
import { Tabs, TabList, TabSlot, TabTrigger } from "expo-router/ui";
import ProfileLayout, {
  unstable_settings as profileStackSettings,
} from "../../../app/(ordinary)/(tabs)/profile/_layout";
import { renderRouter } from "expo-router/testing-library";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { AccountSessionProvider } from "../session/account-session-provider";
import { ProfileScreen } from "../screens/profile-screen";
import { ProfileEditScreen } from "../screens/profile-edit-screen";
import { credentialsFor, mockAuth0 } from "../test-support/native-auth0";

// Route history, account ownership and HTTP decoding remain real; only native/network I/O is controlled.
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, request?: RequestInit) =>
    String(url).endsWith("/application-access")
      ? Promise.resolve(Response.json(mockApplicationAccessResponse()))
      : mockFetch(url, request),
}));

const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
let client = createQueryClient();
const previousEnvironment = { ...process.env };
const account = accountResponse({
  accountId: "00000000-0000-4000-8000-000000000569",
  username: "Original",
  email: "profile@example.invalid",
  principalCreatedAt: "2020-01-02T03:04:05Z",
});

beforeEach(() => {
  client = createQueryClient();
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
  });
  jest.mocked(initializeV2Installation).mockReset().mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|one"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuth.mockReset().mockResolvedValue(credentialsFor("auth0|one"));
  mockFetch.mockReset().mockImplementation(async () => Response.json(account));
});

afterEach(async () => {
  await cleanup();
  client.clear();
  process.env = { ...previousEnvironment };
  jest.restoreAllMocks();
});

/** The installed headless tab navigator retains its nested profile Stack while another destination has focus. */
function ProfileTabs() {
  return (
    <Tabs>
      <TabSlot />
      <TabList>
        <TabTrigger name="profile" href="/profile" accessibilityLabel="Profil">
          <Text>Profil</Text>
        </TabTrigger>
        <TabTrigger
          name="search"
          href="/search"
          accessibilityLabel="Rechercher"
        >
          <Text>Rechercher</Text>
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

/** Uses real Router history and shared providers, with unrelated Pro/privacy destinations omitted. */
async function openProfile(initialUrl = "/profile") {
  await renderRouter(
    {
      _layout: () => (
        <Stack screenOptions={{ headerShown: false, animation: "none" }} />
      ),
      "(tabs)/_layout": ProfileTabs,
      "(tabs)/profile/_layout": {
        default: ProfileLayout,
        unstable_settings: profileStackSettings,
      },
      "(tabs)/profile/index": () => (
        <ProfileScreen admitted proEntry={null} privacyEntry={null} />
      ),
      "(tabs)/profile/edit": () => <ProfileEditScreen admitted />,
      "(tabs)/search": () => <Text>Recherche ouverte</Text>,
      "sign-in": () => <Text>Connexion ouverte</Text>,
    },
    {
      initialUrl,
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

it("opens the profile overview without mounting its editor", async () => {
  // Given
  await openProfile();

  // When
  await screen.findByText(account.username);

  // Then
  expect(screen.getByRole("header", { name: "Mon profil" })).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Modifier mon profil" }),
  ).toBeOnTheScreen();
  expect(screen.queryByLabelText("Pseudo")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Enregistrer" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Continuer en tant qu’invité" }),
  ).not.toBeOnTheScreen();
});

it("opens and cancels the separate editor without ending the account session", async () => {
  // Given
  const user = userEvent.setup();
  await openProfile();
  await screen.findByText(account.username);

  // When
  await user.press(screen.getByRole("button", { name: "Modifier mon profil" }));

  // Then
  expect(screen).toHavePathname("/profile/edit");
  expect(await screen.findByDisplayValue(account.username)).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Se déconnecter" }),
  ).not.toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Annuler" }));

  // Then
  expect(screen).toHavePathname("/profile");
  expect(
    await screen.findByRole("header", { name: "Mon profil" }),
  ).toBeOnTheScreen();
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.every(([, request]) => request?.method === "GET"),
  ).toBe(true);
});

it("asks once before discarding editor changes and preserves the session", async () => {
  // Given
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const user = userEvent.setup();
  await openProfile();
  await user.press(
    await screen.findByRole("button", { name: "Modifier mon profil" }),
  );
  await screen.findByDisplayValue(account.username);
  await user.clear(screen.getByLabelText("Pseudo"));
  await user.type(screen.getByLabelText("Pseudo"), "Unsaved");

  // When
  await user.press(screen.getByRole("button", { name: "Annuler" }));

  // Then
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(screen).toHavePathname("/profile/edit");
  expect(screen.getByDisplayValue("Unsaved")).toBeOnTheScreen();

  // When
  await act(() => nativeAlertAction("Continuer la saisie")());

  // Then
  expect(screen).toHavePathname("/profile/edit");
  expect(screen.getByDisplayValue("Unsaved")).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Annuler" }));
  await act(() => nativeAlertAction("Abandonner")());

  // Then
  expect(screen).toHavePathname("/profile");
  expect(Alert.alert).toHaveBeenCalledTimes(2);
  expect(screen.getByText(account.username)).toBeOnTheScreen();
  expect(screen.queryByDisplayValue("Unsaved")).not.toBeOnTheScreen();
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
});

it("keeps a refused draft in the editor and returns only after an explicitly retried save succeeds", async () => {
  // Given
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const user = userEvent.setup();
  await openProfile();
  await user.press(
    await screen.findByRole("button", { name: "Modifier mon profil" }),
  );
  await screen.findByDisplayValue(account.username);
  await user.clear(screen.getByLabelText("Pseudo"));
  await user.type(screen.getByLabelText("Pseudo"), "Chosen");
  mockFetch.mockImplementation(async (_url, request) =>
    request?.method === "PATCH"
      ? new Response(
          JSON.stringify({
            type: "urn:blockout:problem:username-unavailable",
            title: "Conflict",
            status: 409,
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/problem+json" },
          },
        )
      : Response.json(account),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  expect(
    await screen.findByText("Ce pseudo est déjà utilisé."),
  ).toBeOnTheScreen();
  expect(screen).toHavePathname("/profile/edit");
  expect(screen.getByDisplayValue("Chosen")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, request]) => request?.method === "PATCH"),
  ).toHaveLength(1);

  // Given
  const response = Promise.withResolvers<Response>();
  try {
    mockFetch.mockImplementation(async (_url, request) =>
      request?.method === "PATCH" ? response.promise : Response.json(account),
    );

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await screen.findByRole("button", { name: "Enregistrer", busy: true });

    // Then
    expect(screen).toHavePathname("/profile/edit");
    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled();

    // When
    await act(() =>
      response.resolve(Response.json({ ...account, username: "Chosen" })),
    );

    // Then
    await waitFor(() => expect(screen).toHavePathname("/profile"));
    expect(await screen.findByText("Chosen")).toBeOnTheScreen();
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
    expect(
      mockFetch.mock.calls.filter(([, request]) => request?.method === "PATCH"),
    ).toHaveLength(2);
  } finally {
    // Settle this controlled transport even when a regression assertion fails before acknowledgement.
    await act(() => response.resolve(Response.json(account)));
  }
});

it("offers sign-in and independent public links to a guest without profile-editing commands", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  const user = userEvent.setup();
  await openProfile();

  // When
  const signIn = await screen.findByRole("button", { name: "Se connecter" });

  // Then
  expect(
    screen.getByRole("link", { name: "Politique de confidentialité" }),
  ).toBeDisabled();
  expect(
    screen.queryByRole("button", { name: "Modifier mon profil" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Enregistrer" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Se déconnecter" }),
  ).not.toBeOnTheScreen();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();

  // When
  await user.press(signIn);

  // Then
  expect(await screen.findByText("Connexion ouverte")).toBeOnTheScreen();
  expect(screen).toHavePathname("/sign-in");
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
});

it("retains the editor and dirty values across ordinary tab changes", async () => {
  // Given
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const user = userEvent.setup();
  await openProfile();
  await user.press(
    await screen.findByRole("button", { name: "Modifier mon profil" }),
  );
  await screen.findByDisplayValue(account.username);
  await user.clear(screen.getByLabelText("Pseudo"));
  await user.type(screen.getByLabelText("Pseudo"), "Retained");

  // When
  await user.press(screen.getByLabelText("Rechercher"));

  // Then
  expect(await screen.findByText("Recherche ouverte")).toBeOnTheScreen();
  expect(screen).toHavePathname("/search");
  expect(Alert.alert).not.toHaveBeenCalled();

  // When
  await user.press(screen.getByLabelText("Profil"));

  // Then
  expect(screen).toHavePathname("/profile/edit");
  expect(await screen.findByDisplayValue("Retained")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.every(([, request]) => request?.method === "GET"),
  ).toBe(true);
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
});

it("recovers a failed identity read without hiding independent profile navigation or establishing an account", async () => {
  // Given
  mockFetch.mockRejectedValue(new TypeError("Network unavailable"));
  const user = userEvent.setup();
  await openProfile();
  await screen.findByRole("alert", { name: "Une erreur est survenue" });

  // When
  const retry = screen.getByRole("button", { name: "Réessayer" });

  // Then
  expect(screen.getByRole("button", { name: "Besoin d’aide ?" })).toBeEnabled();
  expect(
    screen.getByRole("link", { name: "Politique de confidentialité" }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Modifier mon profil" }),
  ).not.toBeOnTheScreen();

  // When
  mockFetch.mockImplementation(async () => Response.json(account));
  await user.press(retry);

  // Then
  expect(await screen.findByText(account.username)).toBeOnTheScreen();
  expect(
    screen.queryByRole("alert", { name: "Une erreur est survenue" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.every(([, request]) => request?.method === "GET"),
  ).toBe(true);
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(screen).toHavePathname("/profile");
});

it("keeps the selected search tab when an editor save completes in the background", async () => {
  // Given
  const user = userEvent.setup();
  await openProfile();
  await user.press(
    await screen.findByRole("button", { name: "Modifier mon profil" }),
  );
  await screen.findByDisplayValue(account.username);
  await user.clear(screen.getByLabelText("Pseudo"));
  await user.type(screen.getByLabelText("Pseudo"), "Accepted_background");
  const response = Promise.withResolvers<Response>();
  try {
    mockFetch.mockImplementation(async (_url, request) =>
      request?.method === "PATCH" ? response.promise : Response.json(account),
    );
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await screen.findByRole("button", { name: "Enregistrer", busy: true });
    await user.press(screen.getByLabelText("Rechercher"));
    await screen.findByText("Recherche ouverte");

    // When
    await act(() =>
      response.resolve(
        Response.json({ ...account, username: "Accepted_background" }),
      ),
    );

    // Then
    await waitFor(() => expect(client.isMutating()).toBe(0));
    expect(screen).toHavePathname("/search");
    expect(screen.getByText("Recherche ouverte")).toBeOnTheScreen();

    // When
    await user.press(screen.getByLabelText("Profil"));

    // Then
    expect(screen).toHavePathname("/profile");
    expect(await screen.findByText("Accepted_background")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "Mon profil" }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Enregistrer" }),
    ).not.toBeOnTheScreen();
    expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
  } finally {
    // Settle this controlled transport even when a regression assertion fails before acknowledgement.
    await act(() => response.resolve(Response.json(account)));
  }
});

it("stops showing a cached profile photo when a current account refresh confirms its removal", async () => {
  // Given
  const previousReader = Object.getOwnPropertyDescriptor(
    globalThis,
    "FileReader",
  );
  /** Controls only native image decoding; current account and binary-photo reads retain their real Query caches. */
  class PhotoReader {
    result = "data:image/png;base64,accepted";
    onload?: () => void;
    /** Completes the native preview boundary without replacing its transport or cache owner. */
    readAsDataURL() {
      this.onload?.();
    }
  }
  Object.defineProperty(globalThis, "FileReader", {
    configurable: true,
    value: PhotoReader,
  });
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/photo")
      ? new Response(png, { headers: { "Content-Type": "image/png" } })
      : Response.json({ ...account, hasPhoto: true }),
  );
  try {
    await openProfile();
    await screen.findByRole("image", { name: "Photo de profil" });
    mockFetch.mockImplementation(async () =>
      Response.json({ ...account, hasPhoto: false }),
    );

    // When
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then
    await waitFor(() =>
      expect(
        screen.queryByRole("image", { name: "Photo de profil" }),
      ).not.toBeOnTheScreen(),
    );
    expect(screen.getByText(account.username)).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Modifier mon profil" }),
    ).toBeEnabled();
  } finally {
    await cleanup();
    if (previousReader)
      Object.defineProperty(globalThis, "FileReader", previousReader);
    else Reflect.deleteProperty(globalThis, "FileReader");
  }
});

it("returns a directly opened editor to its anchored profile overview", async () => {
  // Given
  const user = userEvent.setup();
  await openProfile("/profile/edit");
  await screen.findByDisplayValue(account.username);
  expect(screen).toHavePathname("/profile/edit");

  // When
  await user.press(screen.getByRole("button", { name: "Annuler" }));

  // Then
  expect(screen).toHavePathname("/profile");
  expect(await screen.findByText(account.username)).toBeOnTheScreen();
  expect(screen.getByRole("header", { name: "Mon profil" })).toBeOnTheScreen();
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
});
