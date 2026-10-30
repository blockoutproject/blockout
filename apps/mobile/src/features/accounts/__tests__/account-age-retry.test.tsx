import { useLayoutEffect, type PropsWithChildren } from "react";
import { useQueryClient, QueryClientProvider } from "@tanstack/react-query";
import { accountResponse } from "../test-support/account-response";
import { AccountFeedbackProvider } from "../test-support/account-feedback-provider";
import { applicationAccessResponse as mockApplicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { Pressable, Text } from "react-native";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ProfileScreen } from "../screens/profile-screen";
import { ProfileEditScreen } from "../screens/profile-edit-screen";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../session/account-session-provider";
import { credentialsFor, mockAuth0 } from "../test-support/native-auth0";

// Native and HTTP I/O are controlled; SDK React context, Query, transport and form remain real.
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

jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, request?: RequestInit) =>
    String(url).endsWith("/application-access")
      ? Promise.resolve(Response.json(mockApplicationAccessResponse()))
      : mockFetch(url, request),
}));
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: () => mockContext },
  SaveFormat: { PNG: "png" },
}));
jest.mock("expo-file-system", () => ({
  File: jest.fn((uri: string) =>
    uri.startsWith("file:///cache/ImagePicker/") ? mockPickedFile : mockFile,
  ),
  Paths: {
    cache: { uri: "file:///cache/" },
    normalize: jest.requireActual("expo-file-system").Paths.normalize,
  },
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

const mockContext = {
  resize: jest.fn(),
  renderAsync: jest.fn(),
  release: jest.fn(),
};
const mockImage = { saveAsync: jest.fn(), release: jest.fn() };
const mockPickedFile = { exists: true, delete: jest.fn() };
const mockFile = Object.assign(
  new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }),
  {
    bytes: async () => new Uint8Array([137, 80, 78, 71]),
    uri: "file:///prepared.png",
    exists: true,
    delete: jest.fn(),
  },
);
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
let client = createQueryClient();
const account = accountResponse({
  accountId: "00000000-0000-4000-8000-000000000172",
  username: "Original",
  permissions: { manageMaintenance: true },
});
const retryLabel = "Réessayer";
const previousEnvironment = { ...process.env };

beforeEach(() => {
  mockFile.delete.mockReset();
  mockPickedFile.delete.mockReset();
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
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockReset()
    .mockResolvedValue({
      canceled: false,
      assets: [
        { uri: "file:///cache/ImagePicker/source.heic", width: 64, height: 64 },
      ],
    });
  mockContext.renderAsync.mockReset().mockResolvedValue(mockImage);
  mockImage.saveAsync
    .mockReset()
    .mockResolvedValue({ uri: "file:///prepared.png", width: 64, height: 64 });
  mockFetch.mockReset().mockImplementation(async () => json(account));
});
afterEach(async () => {
  await cleanup();
  client.clear();
  process.env = { ...previousEnvironment };
  jest.restoreAllMocks();
});

/** Real route history keeps an in-flight age retry alive while the separate editor owns its draft. */
async function renderProfile(admitted = true) {
  await renderRouter(
    {
      _layout: () => (
        <>
          <Stack screenOptions={{ headerShown: false, animation: "none" }} />
          <SessionActions />
        </>
      ),
      profile: () => (
        <ProfileScreen
          admitted={admitted}
          proEntry={null}
          privacyEntry={null}
        />
      ),
      "profile/edit": () => <ProfileEditScreen admitted={admitted} />,
    },
    {
      initialUrl: "/profile",
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>
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
    },
  );
}

/** Invokes the actual session commands around an uncancellable old HTTP response. */
function SessionActions() {
  const session = useAccountSession();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quitter la session"
        onPress={() => void session.clearCredentials()}
      >
        <Text>Quitter</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Revenir au compte"
        onPress={() => void session.signIn("mobile-test")}
      >
        <Text>Revenir</Text>
      </Pressable>
    </>
  );
}

/** Synthetic JSON at the generated consumer's Fetch boundary, never a real provider payload. */
function json(value: unknown) {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
  });
}

it("keeps profile editing and current administration access usable while age is unknown", async () => {
  // Given
  await renderProfile();
  await screen.findByText("Original");

  // When
  const retry = screen.getByRole("button", { name: retryLabel });

  // Then
  expect(retry).toBeEnabled();
  expect(
    screen.getByRole("button", { name: "Modifier mon profil" }),
  ).toBeEnabled();
  expect(screen.getByRole("link", { name: "Maintenance" })).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.every(([, request]) => request?.method !== "POST"),
  ).toBe(true);
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
});

it("does not offer an age retry when reliable evidence is already available", async () => {
  // Given
  mockFetch.mockImplementation(async () =>
    json({ ...account, principalCreatedAt: "2020-01-02T03:04:05Z" }),
  );

  // When
  await renderProfile();
  await screen.findByText("Original");

  // Then
  expect(
    screen.queryByRole("button", { name: retryLabel }),
  ).not.toBeOnTheScreen();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.every(([, request]) => request?.method !== "POST"),
  ).toBe(true);
});

it("retries establishment with current credentials and refreshes provider evidence without replacing profile values", async () => {
  // Given
  const user = userEvent.setup();
  await renderProfile();
  await screen.findByText("Original");
  mockFetch.mockImplementation(async () =>
    json({
      ...account,
      username: "Other_device",
      email: "updated@example.invalid",
      principalCreatedAt: "2020-01-02T03:04:05Z",
    }),
  );

  // When
  await user.press(screen.getByRole("button", { name: retryLabel }));

  // Then
  expect(await screen.findByText("updated@example.invalid")).toBeOnTheScreen();
  expect(screen.getByText("Other_device")).toBeOnTheScreen();
  expect(screen.queryByText("Original")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: retryLabel }),
  ).not.toBeOnTheScreen();
  expect(screen.getByRole("link", { name: "Maintenance" })).toBeOnTheScreen();
  const writes = mockFetch.mock.calls.filter(
    ([, request]) => request?.method === "POST",
  );
  expect(writes).toEqual([
    [
      "https://api.example.invalid/accounts",
      expect.objectContaining({ method: "POST" }),
    ],
  ]);
  expect(new Headers(writes[0][1]?.headers).get("Authorization")).toBe(
    "Bearer test-access-token",
  );
  expect(writes[0][1]?.body).toBeUndefined();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
});

it.each(["network", "missing", "invalid"])(
  "retains explicit recovery and independent profile actions after %s evidence",
  async (outcome) => {
    // Given
    const user = userEvent.setup();
    await renderProfile();
    await screen.findByText("Original");
    mockFetch.mockImplementation(async () => {
      if (outcome === "network") throw new TypeError("Provider unavailable");
      return json({
        ...account,
        principalCreatedAt: outcome === "invalid" ? "not-a-date" : null,
      });
    });

    // When
    await user.press(screen.getByRole("button", { name: retryLabel }));

    // Then
    await waitFor(() =>
      expect(screen.getByRole("button", { name: retryLabel })).toBeEnabled(),
    );
    expect(screen.getByText("Original")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Modifier mon profil" }),
    ).toBeEnabled();
    expect(screen.getByRole("link", { name: "Maintenance" })).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.filter(([, request]) => request?.method === "POST"),
    ).toHaveLength(1);
    expect(mockAuth0.webAuth).not.toHaveBeenCalled();

    // When: another attempt requires another user action.
    mockFetch.mockImplementation(async () =>
      json({ ...account, principalCreatedAt: "2020-01-02T03:04:05Z" }),
    );
    await user.press(screen.getByRole("button", { name: retryLabel }));

    // Then
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: retryLabel }),
      ).not.toBeOnTheScreen(),
    );
    expect(
      mockFetch.mock.calls.filter(([, request]) => request?.method === "POST"),
    ).toHaveLength(2);
  },
);

it.each(["success", "failure"])(
  "discards late %s from an removed native principal after A returns to the same account",
  async (outcome) => {
    // Given
    const user = userEvent.setup();
    await renderProfile();
    await screen.findByText("Original");
    const response = Promise.withResolvers<Response>();
    mockFetch.mockImplementation(async (_url, request) =>
      request?.method === "POST" ? response.promise : json(account),
    );
    try {
      await user.press(screen.getByRole("button", { name: retryLabel }));
      expect(screen.getByRole("button", { name: retryLabel })).toBeDisabled();
      await user.press(
        screen.getByRole("button", { name: "Quitter la session" }),
      );
      await user.press(
        screen.getByRole("button", { name: "Revenir au compte" }),
      );
      await screen.findByText("Original");

      // When
      await act(async () => {
        if (outcome === "success")
          response.resolve(
            json({
              ...account,
              username: "Stale_name",
              principalCreatedAt: "2020-01-02T03:04:05Z",
            }),
          );
        else response.reject(new TypeError("Late failure"));
      });

      // Then
      expect(screen.getByRole("button", { name: retryLabel })).toBeEnabled();
      expect(screen.getByText("Original")).toBeOnTheScreen();
      expect(screen.queryByText("Stale_name")).not.toBeOnTheScreen();
      expect(
        screen.queryByText("La lecture de l’ancienneté a échoué. Réessayez."),
      ).not.toBeOnTheScreen();
    } finally {
      await act(async () => response.resolve(json(account)));
    }
  },
);

it("does not expose targeted retry through refused profile admission", async () => {
  // Given
  await renderProfile(false);

  // When
  await screen.findByText("Une erreur est survenue");

  // Then
  expect(
    screen.queryByRole("button", { name: retryLabel }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.every(([, request]) => request?.method !== "POST"),
  ).toBe(true);
});

/** Uses the real native private client with deterministic failure presentation in this route suite. */
function PrivateQueries({ children }: PropsWithChildren) {
  const privateClient = useQueryClient();
  privateClient.setQueryDefaults([], { retry: false, gcTime: Infinity });
  privateClient.setMutationDefaults([], { gcTime: Infinity });
  useLayoutEffect(() => {
    client = privateClient;
  }, [privateClient]);
  return children;
}
