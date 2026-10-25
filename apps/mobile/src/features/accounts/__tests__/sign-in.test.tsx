import { applicationAccessResponse as mockApplicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import {
  CredentialsManagerErrorCodes,
  type Credentials,
} from "react-native-auth0";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../session/account-session-provider";
import { useCurrentAccount } from "../api/use-current-account";
import { SignInScreen } from "../screens/sign-in-screen";
import { ProfileScreen } from "../screens/profile-screen";
import { credentialsFor, mockAuth0 } from "../test-support/native-auth0";

// The installed library controls native keyboard I/O; form and session behavior remain real.
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

jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => ({ replace: mockNavigate, push: mockNavigate }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    String(url).endsWith("/application-access")
      ? Promise.resolve(Response.json(mockApplicationAccessResponse()))
      : mockFetch(url, options),
}));

const mockNavigate = jest.fn();
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
let queryClient = createQueryClient();
const configuration = {
  EXPO_PUBLIC_AUTH0_DOMAIN: process.env.EXPO_PUBLIC_AUTH0_DOMAIN,
  EXPO_PUBLIC_AUTH0_CLIENT_ID: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID,
  EXPO_PUBLIC_AUTH0_AUDIENCE: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE,
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
};
const account = {
  accountId: "00000000-0000-4000-8000-000000000169",
  username: "Player_169",
  email: "shared@example.invalid",
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

beforeEach(() => {
  queryClient = createQueryClient();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_AUTH0_AUDIENCE: "mobile-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  jest.mocked(initializeV2Installation).mockReset().mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|one"));
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuth.mockReset().mockResolvedValue(credentialsFor("auth0|one"));
  mockNavigate.mockReset();
  mockFetch
    .mockReset()
    .mockImplementation(async (_url, request) =>
      request?.method === "POST"
        ? json(account, 201)
        : problem(404, "not-found"),
    );
});
afterEach(() => {
  queryClient.clear();
  jest.useRealTimers();
  jest.restoreAllMocks();
  for (const [key, value] of Object.entries(configuration)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

/** Actual providers, controlled native/HTTP I/O and independently supplied F12 admission. */
async function renderJourney(content = <SignInScreen admitted />) {
  const client = queryClient;
  return render(content, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>{children}</AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  });
}

/** Local lifecycle action for delayed-response tests; the sole real session owner handles invalidation. */
function EndSession() {
  const session = useAccountSession();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quitter la session"
      onPress={() => void session.clearCredentials()}
    >
      <Text>Quitter</Text>
    </Pressable>
  );
}

it("allows guest continuation without opening Auth0 or establishing an account", async () => {
  // Given
  const user = userEvent.setup();
  await renderJourney();

  // When
  await user.press(
    screen.getByRole("button", { name: "Continuer en tant qu’invité" }),
  );

  // Then
  expect(mockNavigate).toHaveBeenCalledWith("/");
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(mockFetch).not.toHaveBeenCalled();
});

it("establishes explicitly after successful hosted login without replaying a protected action", async () => {
  // Given
  const user = userEvent.setup();
  await renderJourney();

  // When
  await user.press(screen.getByRole("button", { name: "Se connecter" }));

  // Then
  await screen.findByRole("button", { name: "Continuer en tant qu’invité" });
  expect(mockAuth0.webAuth.mock.calls[0].slice(4, 6)).toEqual([
    "mobile-test",
    "openid profile email offline_access",
  ]);
  expect(
    mockFetch.mock.calls.filter(([, request]) => request?.method === "POST"),
  ).toHaveLength(1);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/profile"));
  expect(mockNavigate).not.toHaveBeenCalledWith("/protected-action");
});

/** Observes only F05 identity, so establishment cannot rely on a profile query observer's effect. */
function EstablishedSessionProbe() {
  const session = useAccountSession();
  return <Text>Established account: {session.accountId ?? "unavailable"}</Text>;
}

it("publishes established identity without mounting a current-account reader", async () => {
  // Given
  const user = userEvent.setup();
  await renderJourney(
    <>
      <SignInScreen admitted />
      <EstablishedSessionProbe />
    </>,
  );

  // When
  await user.press(screen.getByRole("button", { name: "Se connecter" }));

  // Then
  expect(
    await screen.findByText(`Established account: ${account.accountId}`),
  ).toBeOnTheScreen();
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch.mock.calls[0][1]?.method).toBe("POST");
});

it("offers explicit login when stored DPoP credentials cannot serve the Bearer configuration", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockAuth0.getCredentials.mockRejectedValueOnce({
    code: CredentialsManagerErrorCodes.DPOP_NOT_CONFIGURED,
    message: "Stored credentials require DPoP",
  });
  const user = userEvent.setup();
  await renderJourney();
  expect(screen.getByRole("button", { name: "Se connecter" })).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
  expect(mockAuth0.getCredentials).toHaveBeenCalledTimes(1);
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();

  // When
  await user.press(screen.getByRole("button", { name: "Se connecter" }));

  // Then
  expect(mockAuth0.webAuth).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(([, request]) => request?.method === "POST"),
  ).toHaveLength(1);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/profile"));
});

it.each([
  ["a0.session.user_cancelled", "Connexion annulée."],
  ["access_denied", "Connexion refusée."],
  ["a0.network_error", "La connexion est indisponible. Réessayez."],
])(
  "keeps guest access after native login outcome %s",
  async (code, message) => {
    // Given
    mockAuth0.webAuth.mockRejectedValue({
      code,
      message: "private native diagnostics",
    });
    const user = userEvent.setup();
    await renderJourney();

    // When
    await user.press(screen.getByRole("button", { name: "Se connecter" }));

    // Then
    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Continuer en tant qu’invité" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("link", { name: "Besoin d’aide ?" }),
    ).toBeOnTheScreen();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  },
);

it("retries missing initial email explicitly without asking for another valid login", async () => {
  // Given
  mockFetch.mockImplementation(async (_url, request) =>
    request?.method === "POST"
      ? problem(422, "provider-email-unavailable")
      : problem(404, "not-found"),
  );
  const user = userEvent.setup();
  await renderJourney();
  await user.press(screen.getByRole("button", { name: "Se connecter" }));
  expect(
    await screen.findByText(
      "Votre profil attend une adresse e-mail disponible auprès du fournisseur.",
    ),
  ).toBeOnTheScreen();
  expect(mockNavigate).not.toHaveBeenCalled();
  mockFetch.mockImplementation(async () => json(account));

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(mockAuth0.webAuth).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(([, request]) => request?.method === "POST"),
  ).toHaveLength(2);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/profile"));
});

it("never bootstraps an absent account during restoration or a profile read retry", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  const user = userEvent.setup();
  await renderJourney(<ProfileScreen admitted proEntry={null} />);
  expect(
    await screen.findByText("Votre compte Blockout est introuvable."),
  ).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    mockFetch.mock.calls.filter(([, request]) => request?.method === "POST"),
  ).toHaveLength(0);
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
});

it("renders the local editable profile after ordinary restoration", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockFetch.mockImplementation(async () => json(account));

  // When
  await renderJourney(<ProfileScreen admitted proEntry={null} />);

  // Then
  expect(await screen.findByDisplayValue("Player_169")).toBeOnTheScreen();
  expect(screen.getByDisplayValue("shared@example.invalid")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Choisir une photo de profil" }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.every(([, request]) => request?.method === "GET"),
  ).toBe(true);
});

it.each(["sign-in", "profile"])(
  "enters guest mode from an authenticated %s screen without retaining private account state",
  async (entry) => {
    // Given
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    mockFetch.mockImplementation(async () => json(account));
    const user = userEvent.setup();
    await renderJourney(
      <>
        <AccountReadProbe />
        {entry === "profile" ? (
          <ProfileScreen admitted proEntry={null} />
        ) : (
          <SignInScreen admitted />
        )}
      </>,
    );
    expect(
      await screen.findByText(`Current account: ${account.accountId}`),
    ).toBeOnTheScreen();

    // When
    await user.press(
      screen.getByRole("button", { name: "Continuer en tant qu’invité" }),
    );

    // Then
    await waitFor(() =>
      expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1),
    );
    expect(
      await screen.findByText("Current account: unavailable"),
    ).toBeOnTheScreen();
    expect(screen.queryByText(account.username)).not.toBeOnTheScreen();
    expect(mockNavigate).toHaveBeenCalledWith("/");
    await waitFor(() =>
      expect(
        queryClient.getQueriesData({}).map(([, data]) => data),
      ).not.toContainEqual(account),
    );
  },
);

it.each(["sign-in", "profile"])(
  "does not announce guest mode when native clearing fails on %s",
  async (entry) => {
    // Given
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    mockAuth0.clearCredentials.mockRejectedValue(
      new Error("private storage failure"),
    );
    mockFetch.mockImplementation(async () => json(account));
    const user = userEvent.setup();
    await renderJourney(
      <>
        <AccountReadProbe />
        {entry === "profile" ? (
          <ProfileScreen admitted proEntry={null} />
        ) : (
          <SignInScreen admitted />
        )}
      </>,
    );
    expect(
      await screen.findByText(`Current account: ${account.accountId}`),
    ).toBeOnTheScreen();

    // When
    await user.press(
      screen.getByRole("button", { name: "Continuer en tant qu’invité" }),
    );

    // Then
    expect(
      await screen.findByText("La déconnexion locale a échoué. Réessayez."),
    ).toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
  },
);

it.each(["sign-in", "profile"])(
  "does not navigate from an obsolete guest handoff on %s",
  async (entry) => {
    // Given
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    mockFetch.mockImplementation(async () => json(account));
    const firstClear = Promise.withResolvers<void>();
    mockAuth0.clearCredentials
      .mockReturnValueOnce(firstClear.promise)
      .mockResolvedValueOnce();
    const user = userEvent.setup();
    await renderJourney(
      <>
        {entry === "profile" ? (
          <ProfileScreen admitted proEntry={null} />
        ) : (
          <SignInScreen admitted />
        )}
        <EndSession />
      </>,
    );
    await user.press(
      await screen.findByRole("button", {
        name: "Continuer en tant qu’invité",
      }),
    );

    // When
    await user.press(
      screen.getByRole("button", { name: "Quitter la session" }),
    );
    await act(async () => firstClear.resolve());

    // Then
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(
      screen.queryByText("La déconnexion locale a échoué. Réessayez."),
    ).not.toBeOnTheScreen();
  },
);

it("does not admit login or profile navigation through a controlled F12 refusal", async () => {
  // Given / When
  await renderJourney(<SignInScreen admitted={false} />);

  // Then
  expect(
    screen.queryByRole("button", { name: "Se connecter" }),
  ).not.toBeOnTheScreen();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(mockFetch).not.toHaveBeenCalled();
});

it.each(["while blocked", "after readmission"])(
  "requires an explicit retry when interrupted login finishes %s",
  async (completion) => {
    // Given
    const login = Promise.withResolvers<Credentials>();
    mockAuth0.webAuth.mockReturnValue(login.promise);
    const user = userEvent.setup();
    const journey = await renderJourney();
    await user.press(screen.getByRole("button", { name: "Se connecter" }));

    // When
    await journey.rerender(<SignInScreen admitted={false} />);
    if (completion === "after readmission")
      await journey.rerender(<SignInScreen admitted />);
    await act(async () => login.resolve(credentialsFor("auth0|one")));
    if (completion === "while blocked")
      await journey.rerender(<SignInScreen admitted />);

    // Then
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeEnabled();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    // When
    await user.press(screen.getByRole("button", { name: "Se connecter" }));

    // Then
    expect(mockAuth0.webAuth).toHaveBeenCalledTimes(1);
    expect(
      mockFetch.mock.calls.filter(([, request]) => request?.method === "POST"),
    ).toHaveLength(1);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/profile"));
  },
);

it("allows a new login after admission withdrawal and completed local sign-out", async () => {
  // Given
  const login = Promise.withResolvers<Credentials>();
  mockAuth0.webAuth.mockReturnValueOnce(login.promise);
  const user = userEvent.setup();
  const journey = await renderJourney(
    <>
      <SignInScreen admitted />
      <EndSession />
    </>,
  );
  await user.press(screen.getByRole("button", { name: "Se connecter" }));
  await journey.rerender(
    <>
      <SignInScreen admitted={false} />
      <EndSession />
    </>,
  );
  await act(async () => login.resolve(credentialsFor("auth0|one")));

  // When
  await user.press(screen.getByRole("button", { name: "Quitter la session" }));
  await journey.rerender(
    <>
      <SignInScreen admitted />
      <EndSession />
    </>,
  );

  // Then
  expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Se connecter" })).toBeEnabled();
  expect(mockFetch).not.toHaveBeenCalled();

  // When
  await user.press(screen.getByRole("button", { name: "Se connecter" }));

  // Then
  expect(mockAuth0.webAuth).toHaveBeenCalledTimes(2);
  expect(
    mockFetch.mock.calls.filter(([, request]) => request?.method === "POST"),
  ).toHaveLength(1);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/profile"));
});

it("preserves guest access when F14 initialization fails before restoration", async () => {
  // Given
  jest
    .mocked(initializeV2Installation)
    .mockRejectedValue(new Error("private storage failure"));
  const user = userEvent.setup();
  await renderJourney();

  // When
  await user.press(
    screen.getByRole("button", { name: "Continuer en tant qu’invité" }),
  );

  // Then
  expect(mockNavigate).toHaveBeenCalledWith("/");
  expect(mockAuth0.hasValidCredentials).not.toHaveBeenCalled();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
});

it("rejects a late establishment response after local session invalidation", async () => {
  // Given
  const pending = Promise.withResolvers<Response>();
  mockFetch.mockImplementation(async (_url, request) =>
    request?.method === "POST" ? pending.promise : problem(404, "not-found"),
  );
  const user = userEvent.setup();
  await renderJourney(
    <>
      <SignInScreen admitted />
      <EndSession />
    </>,
  );
  await user.press(screen.getByRole("button", { name: "Se connecter" }));

  // When
  await user.press(screen.getByRole("button", { name: "Quitter la session" }));
  await act(async () => pending.resolve(json(account, 201)));

  // Then
  expect(mockNavigate).not.toHaveBeenCalledWith("/profile");
  expect(screen.queryByText("Player_169")).not.toBeOnTheScreen();
});

/** Observes the real account/session integration without a navigation or provider double. */
function AccountReadProbe() {
  const query = useCurrentAccount();
  const session = useAccountSession();
  return (
    <>
      <Text>Current account: {session.accountId ?? "unavailable"}</Text>
      <Text>Read: {query.fetchStatus}</Text>
    </>
  );
}

it("discards a credential failure from an obsolete establishment session", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  const credentials = Promise.withResolvers<never>();
  mockAuth0.getCredentials
    .mockResolvedValueOnce(credentialsFor("auth0|one"))
    .mockReturnValue(credentials.promise);
  const user = userEvent.setup();
  await renderJourney(
    <>
      <SignInScreen admitted />
      <EndSession />
    </>,
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeEnabled(),
  );
  await user.press(screen.getByRole("button", { name: "Se connecter" }));
  await waitFor(() =>
    expect(mockAuth0.getCredentials).toHaveBeenCalledTimes(2),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Quitter la session" }));
  await act(async () =>
    credentials.reject(new Error("private old SDK failure")),
  );

  // Then
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeEnabled(),
  );
  expect(
    screen.queryByText(
      "Votre identité est connectée, mais votre profil Blockout est indisponible.",
    ),
  ).not.toBeOnTheScreen();
  expect(mockFetch).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalledWith("/profile");
});

it("suspends account reads throughout native credential clearing", async () => {
  // Given
  jest.useFakeTimers();
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockFetch.mockImplementation(async () => json(account));
  const clearing = Promise.withResolvers<void>();
  mockAuth0.clearCredentials.mockReturnValue(clearing.promise);
  const user = userEvent.setup();
  await renderJourney(
    <>
      <AccountReadProbe />
      <EndSession />
    </>,
  );
  expect(
    await screen.findByText(`Current account: ${account.accountId}`),
  ).toBeOnTheScreen();
  const before = mockFetch.mock.calls.length;

  // When
  await user.press(screen.getByRole("button", { name: "Quitter la session" }));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });

  // Then
  expect(screen.getByText("Current account: unavailable")).toBeOnTheScreen();
  expect(mockFetch).toHaveBeenCalledTimes(before);

  // When
  await act(async () => {
    clearing.resolve();
  });
  jest.useRealTimers();
});

/** Synthetic canonical response for controlled transport, not native networking evidence. */
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
/** Uses only canonical public classifications without private provider diagnostics. */
function problem(status: number, type: string) {
  return new Response(
    JSON.stringify({
      type: `urn:blockout:problem:${type}`,
      status,
      title: "Unavailable",
    }),
    { status, headers: { "Content-Type": "application/problem+json" } },
  );
}
