import { accountResponse } from "../test-support/account-response";
import {
  TECHNICAL_ERROR,
  TECHNICAL_ERROR_TITLE,
} from "@/shared/components/error-copy";
import { AccountFeedbackProvider } from "../test-support/account-feedback-provider";
import { applicationAccessResponse as mockApplicationAccessResponse } from "@/shared/api/test-support/application-access";
import { ApplicationAccessProvider } from "@/features/access/queries/use-application-access";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { createQueryClient } from "@/shared/query/query-client";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import { AccountSessionProvider } from "../session/account-session-provider";
import { SignInScreen } from "../screens/sign-in-screen";
import { ProfileScreen } from "../screens/profile-screen";
import { credentialsFor, mockAuth0 } from "../test-support/native-auth0";

// The installed library controls native keyboard I/O; form and session behavior remain real.
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
jest.mock("@/features/onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});

// Navigation is an external boundary here; the discard guard has real-router coverage in its owning suite.
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  usePreventRemove: jest.fn(),
  useRouter: () => ({
    replace: mockNavigate,
    push: mockNavigate,
  }),
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
const account = accountResponse({
  accountId: "00000000-0000-4000-8000-000000000169",
  username: "Player_169",
  email: "shared@example.invalid",
});

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
      json(account, request?.method === "POST" ? 201 : 200),
    );
});
afterEach(async () => {
  await cleanup();
  queryClient.clear();
  jest.restoreAllMocks();
  for (const [key, value] of Object.entries(configuration)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
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
            <AccountSessionProvider>
              <AccountFeedbackProvider>{children}</AccountFeedbackProvider>
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  });
}

it("continues as guest without opening hosted login or establishing an account", async () => {
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

it("dispatches explicit establishment through the subject remount and then opens Profile", async () => {
  // Given
  const user = userEvent.setup();
  await renderJourney();

  // When
  await user.press(screen.getByRole("button", { name: "Se connecter" }));

  // Then
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/profile"));
  expect(mockAuth0.webAuth).toHaveBeenCalledTimes(1);
  expect(mockAuth0.webAuth.mock.calls[0].slice(4, 6)).toEqual([
    "mobile-test",
    "openid profile email offline_access",
  ]);
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
  expect(mockNavigate).not.toHaveBeenCalledWith("/protected-action");
});

it.each(["accepted", "lost"] as const)(
  "returns to the requested internal destination after the %s establishment outcome",
  async (outcome) => {
    // Given: native login and Query are real; navigation and the HTTP response are controlled.
    const returnTo = "/matches/745?source=notification";
    mockFetch.mockImplementation(async (_url, options) => {
      if (options?.method === "POST" && outcome === "lost") {
        throw new TypeError("Response lost");
      }
      return json(account, options?.method === "POST" ? 201 : 200);
    });
    const user = userEvent.setup();
    await renderJourney(<SignInScreen admitted returnTo={returnTo} />);

    // When
    await user.press(screen.getByRole("button", { name: "Se connecter" }));

    // Then
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(returnTo));
    expect(mockNavigate).not.toHaveBeenCalledWith("/profile");
    expect(mockAuth0.webAuth).toHaveBeenCalledTimes(1);
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(1);
  },
);

it.each([
  ["a0.session.user_cancelled", "Connexion annulée."],
  ["a0.network_error", TECHNICAL_ERROR],
])("retains guest recovery after hosted login %s", async (code, message) => {
  // Given
  mockAuth0.webAuth.mockRejectedValue({
    code,
    message: "Private provider detail",
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

  // When: a new explicit interactive attempt must reopen hosted login, not restore credentials.
  await user.press(screen.getByRole("button", { name: "Se connecter" }));

  // Then
  await waitFor(() => expect(mockAuth0.webAuth).toHaveBeenCalledTimes(2));
});

it("reports native persistence failure without submitting establishment", async () => {
  // Given
  mockAuth0.saveCredentials.mockRejectedValueOnce(
    new Error("Private storage failure"),
  );
  const user = userEvent.setup();
  await renderJourney();

  // When
  await user.press(screen.getByRole("button", { name: "Se connecter" }));

  // Then
  expect(
    await screen.findByRole("alert", { name: TECHNICAL_ERROR }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "POST"),
  ).toBe(false);
});

it.each(["rejected", "lost"] as const)(
  "returns to the ordinary Profile owner after a %s establishment outcome",
  async (outcome) => {
    // Given
    mockFetch.mockImplementation(async (_url, options) => {
      if (options?.method === "POST") {
        if (outcome === "lost") {
          throw new TypeError("Response lost");
        }
        return problem(422, "provider-email-unavailable");
      }
      return json(account);
    });
    const user = userEvent.setup();
    await renderJourney();

    // When
    await user.press(screen.getByRole("button", { name: "Se connecter" }));

    // Then
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/profile"));
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(1);
  },
);

it("retries establishment explicitly for an already authenticated principal without hosted login", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  const user = userEvent.setup();
  await renderJourney();

  // When
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));

  // Then
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/profile"));
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
});

it("reads a restored account without implicitly establishing it", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);

  // When
  await renderJourney(
    <ProfileScreen admitted proEntry={null} privacyEntry={null} />,
  );

  // Then
  expect(await screen.findByText(account.username)).toBeOnTheScreen();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.every(([, options]) => options?.method === "GET"),
  ).toBe(true);
});

it("keeps explicit guest recovery when F14 initialization fails", async () => {
  // Given
  jest
    .mocked(initializeV2Installation)
    .mockRejectedValue(new Error("Private storage failure"));
  const user = userEvent.setup();
  await renderJourney();

  // When
  await user.press(
    screen.getByRole("button", { name: "Continuer en tant qu’invité" }),
  );

  // Then
  expect(mockNavigate).toHaveBeenCalledWith("/");
  expect(mockAuth0.hasValidCredentials).not.toHaveBeenCalled();
  expect(mockFetch).not.toHaveBeenCalled();
});

it("retries credential restoration from the primary action without a state card or hosted login", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockAuth0.getCredentials.mockRejectedValueOnce(
    new Error("Private restoration failure"),
  );
  const user = userEvent.setup();
  await renderJourney();
  const retry = await screen.findByRole("button", { name: "Réessayer" });
  expect(
    screen.queryByRole("alert", { name: TECHNICAL_ERROR_TITLE }),
  ).toBeNull();

  // When
  await user.press(retry);

  // Then: restoring usable credentials never establishes an account or opens hosted login.
  await screen.findByRole("button", { name: "Se connecter", busy: false });
  expect(
    screen.getByRole("link", { name: "Politique de confidentialité" }),
  ).toBeEnabled();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "POST"),
  ).toBe(false);
});

it("retries initialization from the single primary action without a state card", async () => {
  // Given
  jest
    .mocked(initializeV2Installation)
    .mockRejectedValueOnce(new Error("Private initialization failure"));
  const user = userEvent.setup();
  await renderJourney();
  const retry = await screen.findByRole("button", { name: "Réessayer" });
  expect(
    screen.queryByRole("alert", { name: TECHNICAL_ERROR_TITLE }),
  ).toBeNull();

  // When
  await user.press(retry);

  // Then
  expect(
    await screen.findByRole("button", { name: "Se connecter", busy: false }),
  ).toBeEnabled();
  expect(initializeV2Installation).toHaveBeenCalledTimes(2);
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(mockFetch).not.toHaveBeenCalled();
});

it("does not start hosted login or establishment behind F12 admission", async () => {
  // Given: ordinary admission is closed.

  // When
  await renderJourney(<SignInScreen admitted={false} />);

  // Then
  expect(
    screen.queryByRole("button", { name: "Se connecter" }),
  ).not.toBeOnTheScreen();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(mockFetch).not.toHaveBeenCalled();
});

/** Synthetic canonical response; no live provider is involved. */
function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

/** Safe canonical Problem Details without provider diagnostics. */
function problem(status: number, type: string) {
  return new Response(
    JSON.stringify({
      type: `https://blockout.app/problems/${type}`,
      status,
      title: "Request refused",
    }),
    { status, headers: { "Content-Type": "application/problem+json" } },
  );
}
