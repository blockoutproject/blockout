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
import * as ImagePicker from "expo-image-picker";
import { Pressable, Text } from "react-native";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ProfileScreen } from "../screens/profile-screen";
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

jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => ({ replace: jest.fn() }),
}));
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
jest.mock("expo-file-system", () => ({ File: jest.fn(() => mockFile) }));

const mockContext = {
  resize: jest.fn(),
  renderAsync: jest.fn(),
  release: jest.fn(),
};
const mockImage = { saveAsync: jest.fn(), release: jest.fn() };
const mockFile = Object.assign(
  new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }),
  { bytes: async () => new Uint8Array([137, 80, 78, 71]) },
);
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
let client = createQueryClient();
const account = {
  accountId: "00000000-0000-4000-8000-000000000172",
  username: "Original",
  email: "owner@example.invalid",
  principalCreatedAt: null,
  hasPhoto: false,
  permissions: {
    manageMaintenance: true,
    manageApplicationVersions: false,
    bypassMaintenance: false,
    manageSportingPresentation: false,
    manageSportingClassification: false,
    manageDivisionLifecycle: false,
    manageCollection: false,
    moderateStreamLinks: false,
  },
};
const retryLabel = "Réessayer la lecture de l’ancienneté";
const previousEnvironment = { ...process.env };

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
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockReset()
    .mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///source.heic", width: 64, height: 64 }],
    });
  mockContext.renderAsync.mockReset().mockResolvedValue(mockImage);
  mockImage.saveAsync
    .mockReset()
    .mockResolvedValue({ uri: "file:///prepared.png", width: 64, height: 64 });
  mockFetch.mockReset().mockImplementation(async () => json(account));
});
afterEach(() => {
  client.clear();
  process.env = previousEnvironment;
});

/** Real profile/account owners and F12 admission; the unrelated F09 composition is explicitly omitted. */
async function renderProfile(admitted = true) {
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <ProfileScreen admitted={admitted} proEntry={null} />
            <SessionActions />
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  if (admitted) await screen.findByDisplayValue("Original");
  return userEvent.setup();
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

  // When
  const retry = screen.getByRole("button", { name: retryLabel });

  // Then
  expect(retry).toBeEnabled();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  expect(
    screen.getByRole("link", { name: "Administration technique" }),
  ).toBeOnTheScreen();
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

  // Then
  expect(
    screen.queryByRole("button", { name: retryLabel }),
  ).not.toBeOnTheScreen();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.every(([, request]) => request?.method !== "POST"),
  ).toBe(true);
});

it("retries the existing POST with valid credentials while preserving the username and prepared photo draft", async () => {
  // Given
  const user = await renderProfile();
  await user.clear(screen.getByLabelText("Pseudo"));
  await user.type(screen.getByLabelText("Pseudo"), "My_draft");
  await user.press(
    screen.getByRole("button", { name: "Choisir une photo de profil" }),
  );
  await screen.findByRole("button", { name: "Aperçu : Photo de profil" });
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
  await screen.findByDisplayValue("updated@example.invalid");
  expect(
    screen.queryByRole("button", { name: retryLabel }),
  ).not.toBeOnTheScreen();
  expect(screen.getByDisplayValue("My_draft")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Aperçu : Photo de profil" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("link", { name: "Administration technique" }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, request]) => request?.method === "POST"),
  ).toEqual([
    [
      "https://api.example.invalid/accounts",
      expect.objectContaining({
        method: "POST",
      }),
    ],
  ]);
  const write = mockFetch.mock.calls.find(
    ([, request]) => request?.method === "POST",
  )?.[1];
  expect(new Headers(write?.headers).get("Authorization")).toBe(
    "Bearer test-access-token",
  );
  expect(write?.body).toBeUndefined();
  expect(mockAuth0.webAuth).not.toHaveBeenCalled();
});

it.each(["network", "missing", "invalid"])(
  "keeps an explicit retry and editable draft after %s evidence",
  async (outcome) => {
    // Given
    const user = await renderProfile();
    await user.clear(screen.getByLabelText("Pseudo"));
    await user.type(screen.getByLabelText("Pseudo"), "My_draft");
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
    expect(screen.getByDisplayValue("My_draft")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
    expect(
      screen.getByRole("link", { name: "Administration technique" }),
    ).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.filter(([, request]) => request?.method === "POST"),
    ).toHaveLength(1);
    expect(mockAuth0.webAuth).not.toHaveBeenCalled();

    // When: another attempt requires a new user action.
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
  "discards late %s from an old generation after A returns to the same account",
  async (outcome) => {
    // Given
    const user = await renderProfile();
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
      await screen.findByDisplayValue("Original");

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
      expect(screen.getByDisplayValue("Original")).toBeOnTheScreen();
      expect(screen.queryByDisplayValue("Stale_name")).not.toBeOnTheScreen();
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
  await screen.findByText(
    "L’accès à l’application doit être vérifié avant de continuer.",
  );

  // Then
  expect(
    screen.queryByRole("button", { name: retryLabel }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.every(([, request]) => request?.method !== "POST"),
  ).toBe(true);
});

it.each(["age", "profile"])(
  "preserves confirmed photo and provider evidence when the %s response arrives last",
  async (lateReply) => {
    // Given
    const previousReader = Object.getOwnPropertyDescriptor(
      globalThis,
      "FileReader",
    );
    /** Native preview decoding is controlled; both account mutations and Query admissions remain real. */
    class PhotoReader {
      result = "data:image/png;base64,accepted";
      onload?: () => void;
      /** Completes the accepted-photo preview using deterministic native I/O. */
      readAsDataURL() {
        this.onload?.();
      }
    }
    Object.defineProperty(globalThis, "FileReader", {
      configurable: true,
      value: PhotoReader,
    });
    const age = Promise.withResolvers<Response>();
    const profile = Promise.withResolvers<Response>();
    try {
      const user = await renderProfile();
      await user.clear(screen.getByLabelText("Pseudo"));
      await user.type(screen.getByLabelText("Pseudo"), "My_draft");
      await user.press(
        screen.getByRole("button", { name: "Choisir une photo de profil" }),
      );
      await screen.findByRole("button", { name: "Aperçu : Photo de profil" });
      mockFetch.mockImplementation(async (url, request) => {
        if (request?.method === "POST") return age.promise;
        if (request?.method === "PATCH") return profile.promise;
        if (String(url).endsWith("/photo"))
          return new Response(new Uint8Array([137, 80, 78, 71]), {
            headers: { "Content-Type": "image/png" },
          });
        return json(account);
      });
      if (lateReply === "age") {
        await user.press(screen.getByRole("button", { name: retryLabel }));
        await user.press(screen.getByRole("button", { name: "Enregistrer" }));
      } else {
        await user.press(screen.getByRole("button", { name: "Enregistrer" }));
        await user.press(screen.getByRole("button", { name: retryLabel }));
      }
      const ageResponse = {
        ...account,
        username: lateReply === "profile" ? "My_draft" : "Original",
        hasPhoto: lateReply === "profile",
        email: "updated@example.invalid",
        principalCreatedAt: "2020-01-02T03:04:05Z",
      };
      const profileResponse = {
        ...account,
        username: "My_draft",
        hasPhoto: true,
        principalCreatedAt: lateReply === "age" ? "2020-01-02T03:04:05Z" : null,
      };

      // When: the server's earlier snapshot is delivered after the later committed mutation.
      if (lateReply === "age") {
        await act(async () => profile.resolve(json(profileResponse)));
        await screen.findByText("Profil enregistré.");
        await act(async () => age.resolve(json(ageResponse)));
      } else {
        await act(async () => age.resolve(json(ageResponse)));
        await waitFor(() =>
          expect(
            screen.queryByRole("button", { name: retryLabel }),
          ).not.toBeOnTheScreen(),
        );
        await act(async () => profile.resolve(json(profileResponse)));
      }

      // Then
      await screen.findByText("Profil enregistré.");
      await screen.findByRole("button", { name: "Aperçu : Photo de profil" });
      expect(
        screen.queryByRole("button", { name: retryLabel }),
      ).not.toBeOnTheScreen();
      expect(screen.getByDisplayValue("My_draft")).toBeOnTheScreen();
      expect(
        await screen.findByDisplayValue("updated@example.invalid"),
      ).toBeOnTheScreen();
      expect(
        mockFetch.mock.calls.filter(
          ([, request]) => request?.method === "POST",
        ),
      ).toHaveLength(1);
      expect(
        mockFetch.mock.calls.filter(
          ([, request]) => request?.method === "PATCH",
        ),
      ).toHaveLength(1);
    } finally {
      try {
        await act(async () => {
          age.resolve(json(account));
          profile.resolve(json(account));
        });
      } finally {
        if (previousReader)
          Object.defineProperty(globalThis, "FileReader", previousReader);
        else Reflect.deleteProperty(globalThis, "FileReader");
      }
    }
  },
);
