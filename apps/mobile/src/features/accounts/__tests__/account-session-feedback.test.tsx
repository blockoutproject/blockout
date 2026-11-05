import { QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { PersonalScreen } from "../../following/screens/personal-screen";
import { NotificationsScreen } from "../../notifications/screens/notifications-screen";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { AccountSessionProvider } from "../session/account-session-provider";
import { mockAuth0 } from "../test-support/native-auth0";

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
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL) => mockFetch(url),
}));

const mockPush = jest.fn();
const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL]>();
const env = { ...process.env };
let publicClient = createQueryClient();

beforeEach(() => {
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "synthetic-client",
  });
  publicClient = createQueryClient();
  publicClient.setDefaultOptions({ queries: { retry: false } });
  jest
    .mocked(initializeV2Installation)
    .mockReset()
    .mockRejectedValue(new Error("Synthetic initialization failure"));
  mockFetch.mockReset().mockImplementation(async (url) => {
    if (String(url).endsWith("/application-access")) {
      return Response.json(applicationAccessResponse());
    }
    throw new Error("A failed session must not read private resources");
  });
  mockPush.mockReset();
});

afterEach(async () => {
  await cleanup();
  publicClient.clear();
  process.env = { ...env };
  jest.restoreAllMocks();
});

it.each([
  ["Home", PersonalScreen],
  ["Inbox", NotificationsScreen],
] as const)(
  "%s exposes session recovery instead of an idle private-read skeleton",
  async (_name, Consumer) => {
    // Given: real session and resource owners; initialization fails before any private read is enabled.
    await render(
      <QueryClientProvider client={publicClient}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <Consumer />
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    const retry = await screen.findByRole("button", { name: "Réessayer" });

    // When
    await userEvent.press(retry);

    // Then: another failure stays local and never starts a disabled business read.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Une erreur est survenue",
    );
    expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
    expect(initializeV2Installation).toHaveBeenCalledTimes(2);
    expect(
      mockFetch.mock.calls.every(([url]) =>
        String(url).endsWith("/application-access"),
      ),
    ).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  },
);

it.each([
  ["Home", PersonalScreen],
  ["Inbox", NotificationsScreen],
] as const)(
  "%s offers sign-in navigation after confirmed native credential expiry",
  async (_name, Consumer) => {
    // Given: the real session rejects the unusable native credentials before any private read.
    jest.mocked(initializeV2Installation).mockResolvedValue();
    mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
    mockAuth0.getCredentials.mockReset().mockRejectedValue({
      code: "invalid_grant",
      message: "Credentials expired",
    });
    mockAuth0.webAuth.mockReset();
    await render(
      <QueryClientProvider client={publicClient}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <Consumer />
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );
    const signIn = await screen.findByRole("button", { name: "Se connecter" });

    // When
    await userEvent.press(signIn);

    // Then
    expect(mockPush).toHaveBeenCalledWith("/sign-in");
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
    expect(mockAuth0.webAuth).not.toHaveBeenCalled();
    expect(
      mockFetch.mock.calls.every(([url]) =>
        String(url).endsWith("/application-access"),
      ),
    ).toBe(true);
  },
);
