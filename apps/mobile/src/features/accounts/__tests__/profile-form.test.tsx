import { accountResponse } from "../test-support/account-response";
import { TECHNICAL_ERROR } from "../../../shared/components/error-copy";
import { AccountFeedbackProvider } from "../test-support/account-feedback-provider";
import { applicationAccessResponse as mockApplicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { Pressable, Text } from "react-native";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../session/account-session-provider";
import { ProfileEditScreen } from "../screens/profile-edit-screen";
import { useCurrentAccount } from "../api/use-current-account";
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

// Navigation is an external boundary here; the discard guard has real-router coverage in its owning suite.
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  usePreventRemove: jest.fn(),
  useNavigation: () => ({ goBack: mockNavigate }),
  useRouter: () => ({
    replace: jest.fn(),
    back: mockNavigate,
    canGoBack: () => true,
  }),
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
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const mockFile = Object.assign(new Blob([png], { type: "image/png" }), {
  bytes: async () => png,
  uri: "file:///prepared.png",
  exists: true,
  delete: jest.fn(),
});
const mockNavigate = jest.fn();
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
let client = createQueryClient();
const account = accountResponse({
  accountId: "00000000-0000-4000-8000-000000000173",
  username: "Original",
  email: "one@example.invalid",
});
const previousEnvironment = { ...process.env };

beforeEach(() => {
  mockFile.exists = true;
  mockFile.delete.mockReset();
  mockPickedFile.delete.mockReset();
  jest
    .mocked(File)
    .mockReset()
    .mockImplementation(
      (...parts) =>
        (String(parts[0]).startsWith("file:///cache/ImagePicker/")
          ? mockPickedFile
          : mockFile) as unknown as File,
    );
  client = createQueryClient();
  mockNavigate.mockReset();
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
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockReset()
    .mockResolvedValue({ canceled: true, assets: null });
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuth.mockReset().mockResolvedValue(credentialsFor("auth0|one"));
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

/** Real account/form owners with controlled I/O; navigation intent is observed without unmounting the editor. */
async function mountProfile() {
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <AccountFeedbackProvider>
              <ProfileEditScreen admitted />
              <SessionActions />
            </AccountFeedbackProvider>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

/** Exercises actual lifecycle commands around delayed preparation/saves without a production bypass. */
function SessionActions() {
  const session = useAccountSession();
  const account = useCurrentAccount();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Relire le compte"
        onPress={() => void account.refetch()}
      >
        <Text>Relire le compte</Text>
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
        accessibilityLabel="Revenir au compte"
        onPress={() => void session.signIn("mobile-test")}
      >
        <Text>Revenir</Text>
      </Pressable>
    </>
  );
}

/** Synthetic JSON response at the actual Fetch boundary. */
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type":
        status >= 400 ? "application/problem+json" : "application/json",
    },
  });
}

it("refreshes the profile without changing a dirty draft or replaying a save", async () => {
  // Given
  const user = userEvent.setup();
  await mountProfile();
  await screen.findByDisplayValue("Original");
  await user.clear(screen.getByLabelText("Pseudo"));
  await user.type(screen.getByLabelText("Pseudo"), "Unsaved");
  mockFetch.mockClear().mockImplementation(async () =>
    json({
      ...account,
      username: "Remote_name",
      email: "updated@example.invalid",
    }),
  );

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByDisplayValue("updated@example.invalid"),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Unsaved")).toBeOnTheScreen();
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch.mock.calls[0][1]?.method).toBe("GET");
});

it("shows freshly read profile values when there is no local edit", async () => {
  // Given
  await mountProfile();
  await screen.findByDisplayValue("Original");
  mockFetch
    .mockClear()
    .mockImplementation(async () =>
      json({ ...account, username: "Remote_name" }),
    );

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(await screen.findByDisplayValue("Remote_name")).toBeOnTheScreen();
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch.mock.calls[0][1]?.method).toBe("GET");
});

it("defers clean profile updates until native photo selection has settled", async () => {
  // Given
  const user = userEvent.setup();
  await mountProfile();
  await screen.findByDisplayValue("Original");
  const selection = Promise.withResolvers<ImagePicker.ImagePickerResult>();
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockReturnValue(selection.promise);
  await user.press(
    screen.getByRole("button", { name: "Choisir une photo de profil" }),
  );
  await waitFor(() =>
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(1),
  );
  const key = client
    .getQueryCache()
    .findAll()
    .find(({ queryKey }) => queryKey.includes("/accounts/me"))?.queryKey;
  if (!key) throw new Error("The real current-account query is missing");

  mockFetch.mockResolvedValueOnce(
    json({ ...account, username: "Remote_name" }),
  );

  // When
  await act(() => client.refetchQueries({ queryKey: key, exact: true }));

  // Then: the native interaction retains the original editable snapshot.
  expect(screen.getByDisplayValue("Original")).toBeOnTheScreen();
  expect(screen.queryByDisplayValue("Remote_name")).not.toBeOnTheScreen();

  // When
  await act(() => selection.resolve({ canceled: true, assets: null }));

  // Then: RHF admits the clean value after the picker releases its interaction.
  expect(await screen.findByDisplayValue("Remote_name")).toBeOnTheScreen();
});

it("reports an explicit failed refresh while keeping the profile and dirty input", async () => {
  // Given
  const user = userEvent.setup();
  await mountProfile();
  await screen.findByDisplayValue("Original");
  await user.clear(screen.getByLabelText("Pseudo"));
  await user.type(screen.getByLabelText("Pseudo"), "Unsaved");
  mockFetch.mockClear().mockRejectedValue(new Error("Network unavailable"));

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Unsaved")).toBeOnTheScreen();
  expect(screen.getByDisplayValue(account.email)).toBeOnTheScreen();
  expect(
    screen.queryByText("Votre profil Blockout est indisponible."),
  ).not.toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

it.each([401, 403])(
  "presents an initial account refusal %s with opaque copy and owner-controlled retry",
  async (status) => {
    // Given
    mockFetch.mockResolvedValue(json({ title: "Denied", status }, status));

    // When
    await mountProfile();

    // Then
    expect(
      await screen.findByRole("alert", { name: "Une erreur est survenue" }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled();
    expect(screen.queryByLabelText("Pseudo")).toBeNull();
    expect(screen.getByRole("button", { name: "Retour" })).toBeEnabled();
  },
);

it("keeps a refused profile draft read-only through a failed recheck until a successful account read", async () => {
  // Given
  const user = userEvent.setup();
  await mountProfile();
  await screen.findByDisplayValue("Original");
  await user.clear(screen.getByLabelText("Pseudo"));
  await user.type(screen.getByLabelText("Pseudo"), "Unsaved");
  mockFetch
    .mockClear()
    .mockResolvedValue(json({ title: "Denied", status: 403 }, 403));

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("alert", { name: TECHNICAL_ERROR }),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Unsaved")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Annuler" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();

  // When
  mockFetch.mockResolvedValue(json({ title: "Unavailable", status: 503 }, 503));
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await waitFor(() =>
    expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy(),
  );

  // Then
  expect(
    screen.getByRole("alert", { name: TECHNICAL_ERROR }),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Unsaved")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  expect(screen.queryByText("Une erreur est survenue")).toBeNull();

  // When
  mockFetch.mockResolvedValue(json({ ...account, username: "Remote_name" }));
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
  );
  expect(screen.getByDisplayValue("Unsaved")).toBeEnabled();
  expect(screen.queryByRole("alert", { name: TECHNICAL_ERROR })).toBeNull();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method !== "GET"),
  ).toHaveLength(0);
});

it("refuses an unsent profile save when its account read is denied during credential retrieval", async () => {
  // Given
  const credentials =
    Promise.withResolvers<ReturnType<typeof credentialsFor>>();
  const user = userEvent.setup();
  await mountProfile();
  await screen.findByDisplayValue("Original");
  await user.clear(screen.getByLabelText("Pseudo"));
  await user.type(screen.getByLabelText("Pseudo"), "Unsaved");
  mockAuth0.getCredentials.mockReturnValueOnce(credentials.promise);
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await screen.findByRole("button", { name: "Enregistrer", busy: true });
  mockFetch
    .mockClear()
    .mockResolvedValue(json({ title: "Denied", status: 403 }, 403));

  // When
  await user.press(screen.getByRole("button", { name: "Relire le compte" }));
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await act(async () => credentials.resolve(credentialsFor("auth0|one")));

  // Then
  await screen.findByRole("alert", { name: TECHNICAL_ERROR });
  expect(screen.getByDisplayValue("Unsaved")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
  ).toHaveLength(0);
});

it("announces the initial profile read without exposing profile commands", async () => {
  // Given
  const response = Promise.withResolvers<Response>();
  mockFetch.mockReturnValue(response.promise);

  // When
  await mountProfile();

  // Then
  expect(
    await screen.findByRole("progressbar", { name: "Chargement du profil" }),
  ).toBeOnTheScreen();
  expect(screen.queryByLabelText("Pseudo")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Enregistrer" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Supprimer mon compte" }),
  ).not.toBeOnTheScreen();

  // When
  await act(() => response.resolve(json(account)));

  // Then
  expect(await screen.findByDisplayValue("Original")).toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
});

it("keeps the first photo read separate from native refresh progress", async () => {
  // Given
  const photoRead = Promise.withResolvers<Response>();
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/photo")
      ? photoRead.promise
      : json({ ...account, hasPhoto: true }),
  );

  // When
  await mountProfile();
  await screen.findByDisplayValue("Original");

  // Then
  expect(
    screen.getByRole("progressbar", { name: "Chargement en cours" }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy();

  // When
  await act(() => photoRead.resolve(new Response(null, { status: 503 })));

  // Then
  expect(await screen.findByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
});

it("preserves the active save and suspends refresh and cancellation", async () => {
  // Given
  const user = userEvent.setup();
  await mountProfile();
  await screen.findByDisplayValue("Original");
  await user.clear(screen.getByLabelText("Pseudo"));
  await user.type(screen.getByLabelText("Pseudo"), "Chosen");
  const save = Promise.withResolvers<Response>();
  mockFetch.mockClear().mockReturnValue(save.promise);
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

  // When
  await user.press(screen.getByRole("button", { name: "Annuler" }));

  // Then
  expect(
    screen.getByRole("button", { name: "Enregistrer", busy: true }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled();
  expect(screen.getByDisplayValue("Chosen")).toBeOnTheScreen();
  expect(screen.getByLabelText("Actualiser les données")).toBeDisabled();
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();

  // When
  await act(() => save.resolve(json({ ...account, username: "Chosen" })));

  // Then
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
  expect(screen.getByDisplayValue("Chosen")).toBeOnTheScreen();
  expect(screen.getByLabelText("Actualiser les données")).toBeEnabled();
});

it("uses the accepted profile result before returning from the editor", async () => {
  // Given
  const user = userEvent.setup();
  await mountProfile();
  await screen.findByDisplayValue("Original");
  await user.clear(screen.getByLabelText("Pseudo"));
  await user.type(screen.getByLabelText("Pseudo"), "Entered");
  mockFetch.mockResolvedValue(json({ ...account, username: "Accepted" }));

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  expect(await screen.findByDisplayValue("Accepted")).toBeOnTheScreen();
  expect(screen.queryByDisplayValue("Entered")).not.toBeOnTheScreen();
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(mockAuth0.clearCredentials).not.toHaveBeenCalled();
});

it.each(["keep", "replace"] as const)(
  "refreshes the displayed remote photo while preserving a %s draft",
  async (intent) => {
    // Given
    mockFetch.mockImplementation(async (url) =>
      String(url).endsWith("/photo")
        ? new Response(png, { headers: { "Content-Type": "image/png" } })
        : json({ ...account, hasPhoto: true }),
    );
    const previousReader = Object.getOwnPropertyDescriptor(
      globalThis,
      "FileReader",
    );
    const nativeRead = jest.fn();
    /** Controls only the native binary decoder, so each successful photo read is observable in the preview. */
    class PhotoReader {
      result = "";
      onload?: () => void;
      /** Publishes the native decoder result while keeping real Fetch and Query ownership. */
      readAsDataURL() {
        nativeRead();
        this.result = `data:image/png;base64,photo${nativeRead.mock.calls.length}`;
        this.onload?.();
      }
    }
    Object.defineProperty(globalThis, "FileReader", {
      configurable: true,
      value: PhotoReader,
    });
    try {
      const user = userEvent.setup();
      await mountProfile();
      await screen.findByDisplayValue("Original");
      await screen.findByRole("button", { name: "Aperçu : Photo de profil" });
      if (intent === "replace") {
        jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
          canceled: false,
          assets: [
            {
              uri: "file:///cache/ImagePicker/source.heic",
              width: 64,
              height: 64,
            },
          ],
        });
        await user.press(
          screen.getByRole("button", {
            name: "Changer l’image : Photo de profil",
          }),
        );
        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: "Enregistrer" }),
          ).toBeEnabled(),
        );
      }
      mockFetch.mockClear();

      // When
      await fireEvent(
        screen.getByLabelText("Actualiser les données"),
        "refresh",
      );
      await waitFor(() =>
        expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy(),
      );
      await user.press(
        screen.getByRole("button", { name: "Aperçu : Photo de profil" }),
      );

      // Then
      expect(screen.getByRole("image", { name: "Photo de profil" })).toHaveProp(
        "source",
        [
          {
            uri:
              intent === "keep"
                ? "data:image/png;base64,photo2"
                : "file:///prepared.png",
          },
        ],
      );
      expect(mockFetch).toHaveBeenCalledTimes(intent === "keep" ? 2 : 1);
      expect(
        mockFetch.mock.calls.every(([, request]) => request?.method === "GET"),
      ).toBe(true);
      expect(mockFile.delete).not.toHaveBeenCalled();
    } finally {
      await cleanup();
      if (previousReader)
        Object.defineProperty(globalThis, "FileReader", previousReader);
      else delete (globalThis as { FileReader?: unknown }).FileReader;
    }
  },
);

it("removes a refused remote photo until a successful photo read without treating failure as an empty profile", async () => {
  // Given
  const previousReader = Object.getOwnPropertyDescriptor(
    globalThis,
    "FileReader",
  );
  /** Supplies only the native binary decoder result; HTTP, Query and the profile remain real. */
  class PhotoReader {
    result = "data:image/png;base64,remote";
    onload?: () => void;
    /** Completes a successful binary preview without invoking native I/O in Jest. */
    readAsDataURL() {
      this.onload?.();
    }
  }
  Object.defineProperty(globalThis, "FileReader", {
    configurable: true,
    value: PhotoReader,
  });
  let photoStatus = 200;
  mockFetch.mockImplementation(async (url) => {
    if (!String(url).endsWith("/photo"))
      return json({ ...account, hasPhoto: true });
    return photoStatus === 200
      ? new Response(png, { headers: { "Content-Type": "image/png" } })
      : json({ title: "Unavailable", status: photoStatus }, photoStatus);
  });
  try {
    await mountProfile();
    await screen.findByDisplayValue("Original");
    await screen.findByRole("button", { name: "Aperçu : Photo de profil" });

    // When
    photoStatus = 403;
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then
    expect(
      await screen.findByRole("alert", { name: TECHNICAL_ERROR }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Aperçu : Photo de profil" }),
    ).toBeNull();
    expect(screen.getByLabelText("Pseudo")).toBeEnabled();
    expect(screen.queryByText("Une erreur est survenue")).toBeNull();

    // When
    photoStatus = 503;
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
    await waitFor(() => expect(client.isFetching()).toBe(0));

    // Then
    expect(
      screen.getByRole("alert", { name: TECHNICAL_ERROR }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Aperçu : Photo de profil" }),
    ).toBeNull();

    // When
    photoStatus = 200;
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then
    expect(
      await screen.findByRole("button", { name: "Aperçu : Photo de profil" }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Une erreur est survenue")).toBeNull();
  } finally {
    await cleanup();
    if (previousReader)
      Object.defineProperty(globalThis, "FileReader", previousReader);
    else delete (globalThis as { FileReader?: unknown }).FileReader;
  }
});

it("sends one atomic multipart save with JSON metadata and no omitted photo", async () => {
  // Given
  const user = userEvent.setup();
  await mountProfile();
  await screen.findByDisplayValue("Original");
  mockFetch.mockImplementation(async (_url, request) =>
    json(
      request?.method === "PATCH"
        ? { ...account, username: "Chosen" }
        : account,
    ),
  );
  await user.clear(screen.getByLabelText("Pseudo"));
  await user.type(screen.getByLabelText("Pseudo"), "  Chosen  ");

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Enregistrer", busy: false }),
    ).toBeEnabled(),
  );
  const writes = mockFetch.mock.calls.filter(
    ([, request]) => request?.method === "PATCH",
  );
  expect(writes).toHaveLength(1);
  const body = writes[0][1]?.body;
  expect(body).toBeInstanceOf(FormData);
  const entries = [...(body as FormData).entries()];
  expect(entries).toHaveLength(1);
  expect(entries[0][0]).toBe("metadata");
  expect(entries[0][1]).toBeInstanceOf(Blob);
  expect((entries[0][1] as Blob).type).toBe("application/json");
  expect(await (entries[0][1] as Blob).text()).toBe('{"username":"Chosen"}');
});

it("retains a dirty draft on background refetch and whole-save username refusal", async () => {
  // Given
  const user = userEvent.setup();
  await mountProfile();
  await screen.findByDisplayValue("Original");
  await user.clear(screen.getByLabelText("Pseudo"));
  await user.type(screen.getByLabelText("Pseudo"), "My_draft");
  const key = client
    .getQueryCache()
    .findAll()
    .find(({ queryKey }) => queryKey.includes("/accounts/me"))?.queryKey;
  if (!key) throw new Error("The real current-account query is missing");
  mockFetch.mockResolvedValueOnce(
    json({ ...account, username: "Other_device" }),
  );
  await act(() => client.refetchQueries({ queryKey: key, exact: true }));
  mockFetch.mockImplementation(async () =>
    json(
      {
        type: "urn:blockout:problem:username-unavailable",
        title: "Conflict",
        status: 409,
      },
      409,
    ),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await screen.findByText("Ce pseudo est déjà utilisé.");
  expect(screen.getByDisplayValue("My_draft")).toBeOnTheScreen();
  expect(client.getQueryData(key)).toMatchObject({ username: "Other_device" });

  // When
  mockFetch.mockResolvedValueOnce(json({ ...account, username: "Newer_name" }));
  await act(() => client.refetchQueries({ queryKey: key, exact: true }));

  // Then: a new accepted read does not erase the field refusal or dirty input.
  expect(screen.getByText("Ce pseudo est déjà utilisé.")).toBeOnTheScreen();
  expect(screen.getByDisplayValue("My_draft")).toBeOnTheScreen();
});

it("preserves the draft when native crop is cancelled or permission is refused", async () => {
  // Given
  const user = userEvent.setup();
  await mountProfile();
  await screen.findByDisplayValue("Original");
  await user.clear(screen.getByLabelText("Pseudo"));
  await user.type(screen.getByLabelText("Pseudo"), "My_draft");

  // When
  await user.press(
    screen.getByRole("button", { name: "Choisir une photo de profil" }),
  );
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockRejectedValue(new Error("Permission denied"));
  await user.press(
    screen.getByRole("button", { name: "Choisir une photo de profil" }),
  );

  // Then
  await screen.findByText(TECHNICAL_ERROR);
  expect(screen.getByDisplayValue("My_draft")).toBeOnTheScreen();
  expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
    expect.objectContaining({ allowsEditing: true, aspect: [1, 1] }),
  );
  expect(
    mockFetch.mock.calls.some(([, request]) => request?.method === "PATCH"),
  ).toBe(false);
});

it("rereads only the original account after an uncertain save and requires explicit resubmission", async () => {
  // Given
  const user = userEvent.setup();
  await mountProfile();
  await screen.findByDisplayValue("Original");
  await user.clear(screen.getByLabelText("Pseudo"));
  await user.type(screen.getByLabelText("Pseudo"), "My_draft");
  mockFetch.mockImplementation(async (url, request) => {
    if (request?.method === "PATCH") throw new TypeError("Lost response");
    expect(String(url)).toBe(
      `https://api.example.invalid/accounts/${account.accountId}`,
    );
    return json({ ...account, username: "Saved_remotely" });
  });

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await screen.findByText(
    "Le profil a été relu. Vérifiez votre brouillon avant de l’enregistrer à nouveau.",
  );
  expect(screen.getByDisplayValue("My_draft")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, request]) => request?.method === "PATCH"),
  ).toHaveLength(1);
  expect(screen.queryByText("Profil enregistré.")).not.toBeOnTheScreen();
  expect(mockNavigate).not.toHaveBeenCalled();
});

it("does not replay while the original account reread is unavailable", async () => {
  // Given
  const user = userEvent.setup();
  await mountProfile();
  await screen.findByDisplayValue("Original");
  mockFetch.mockRejectedValue(new TypeError("Offline"));

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await screen.findByRole("button", { name: "Vérifier mon profil" });
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();

  // When
  await user.press(screen.getByRole("button", { name: "Vérifier mon profil" }));

  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([, request]) => request?.method === "PATCH"),
    ).toHaveLength(1),
  );
});

it("submits prepared replacement then explicit removal without a username edit", async () => {
  // Given
  const user = userEvent.setup();
  await mountProfile();
  await screen.findByDisplayValue("Original");
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      { uri: "file:///cache/ImagePicker/source.heic", width: 64, height: 64 },
    ],
  });
  await user.press(
    screen.getByRole("button", { name: "Choisir une photo de profil" }),
  );
  await screen.findByRole("button", { name: "Aperçu : Photo de profil" });
  const bodies: FormData[] = [];
  mockFetch.mockImplementation(async (_url, request) => {
    if (request?.method === "PATCH") bodies.push(request.body as FormData);
    return json(account);
  });

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Enregistrer", busy: false }),
    ).toBeEnabled(),
  );
  await waitFor(() => expect(mockFile.delete).toHaveBeenCalledTimes(1));
  await user.press(
    screen.getByRole("button", { name: "Choisir une photo de profil" }),
  );
  await user.press(
    await screen.findByRole("button", {
      name: "Supprimer l’image : Photo de profil",
    }),
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await waitFor(() => expect(bodies).toHaveLength(2));
  const replace = [...bodies[0].entries()];
  expect(await (replace[0][1] as Blob).text()).toBe(
    '{"photoAction":"replace"}',
  );
  expect(replace[1][0]).toBe("image");
  expect(replace[1][1]).toBeInstanceOf(Blob);
  expect((replace[1][1] as Blob).type).toBe("image/png");
  expect((replace[1][1] as Blob).size).toBe(mockFile.size);
  const remove = [...bodies[1].entries()];
  expect(remove).toHaveLength(1);
  expect(await (remove[0][1] as Blob).text()).toBe('{"photoAction":"remove"}');
  expect(mockFile.delete).toHaveBeenCalledTimes(2);
});

it.each([
  {
    username: "Chosen",
    metadata: { username: "Chosen", photoAction: "replace" },
  },
  { username: "Original", metadata: { photoAction: "replace" } },
])(
  "sends only the current dirty username with photo replacement: $username",
  async ({ username, metadata }) => {
    // Given
    const user = userEvent.setup();
    await mountProfile();
    await screen.findByDisplayValue("Original");
    await user.clear(screen.getByLabelText("Pseudo"));
    await user.type(screen.getByLabelText("Pseudo"), "Temporary");
    await user.clear(screen.getByLabelText("Pseudo"));
    await user.type(screen.getByLabelText("Pseudo"), username);
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [
        { uri: "file:///cache/ImagePicker/source.heic", width: 64, height: 64 },
      ],
    });
    await user.press(
      screen.getByRole("button", { name: "Choisir une photo de profil" }),
    );
    await screen.findByRole("button", { name: "Aperçu : Photo de profil" });

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));

    // Then
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Enregistrer", busy: false }),
      ).toBeEnabled(),
    );
    const writes = mockFetch.mock.calls.filter(
      ([, request]) => request?.method === "PATCH",
    );
    expect(writes).toHaveLength(1);
    const body = writes[0][1]?.body as FormData;
    const encodedMetadata = body.get("metadata") as Blob;
    expect(JSON.parse(await encodedMetadata.text())).toEqual(metadata);
  },
);

it("retains the previous prepared choice and username when another preparation fails", async () => {
  // Given
  const user = userEvent.setup();
  await mountProfile();
  await screen.findByDisplayValue("Original");
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      { uri: "file:///cache/ImagePicker/source.heic", width: 64, height: 64 },
    ],
  });
  await user.press(
    screen.getByRole("button", { name: "Choisir une photo de profil" }),
  );
  await screen.findByRole("button", { name: "Aperçu : Photo de profil" });
  mockContext.renderAsync.mockRejectedValue(new Error("Native failure"));

  // When
  await user.press(
    screen.getByRole("button", { name: "Changer l’image : Photo de profil" }),
  );

  // Then
  await screen.findByText(TECHNICAL_ERROR);
  expect(
    screen.getByRole("button", { name: "Aperçu : Photo de profil" }),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Original")).toBeOnTheScreen();
  expect(mockFile.delete).not.toHaveBeenCalled();
});

it.each(["preparation", "save"])(
  "rejects delayed %s results after returning to the same account",
  async (operation) => {
    // Given
    const user = userEvent.setup();
    await mountProfile();
    await screen.findByDisplayValue("Original");
    let finish: () => void = () => {
      throw new Error("Deferred native/HTTP boundary not reached");
    };
    if (operation === "preparation") {
      jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
        canceled: false,
        assets: [
          {
            uri: "file:///cache/ImagePicker/source.heic",
            width: 64,
            height: 64,
          },
        ],
      });
      mockContext.renderAsync.mockImplementation(
        () =>
          new Promise((resolve) => {
            finish = () => resolve(mockImage);
          }),
      );
      await user.press(
        screen.getByRole("button", { name: "Choisir une photo de profil" }),
      );
    } else {
      mockFetch.mockImplementation(async (_url, request) =>
        request?.method === "PATCH"
          ? new Promise((resolve) => {
              finish = () =>
                resolve(json({ ...account, username: "Stale_name" }));
            })
          : json(account),
      );
      await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    }
    await user.press(
      screen.getByRole("button", { name: "Quitter la session" }),
    );
    await user.press(screen.getByRole("button", { name: "Revenir au compte" }));
    await screen.findByDisplayValue("Original");

    // When
    await act(async () => finish());

    // Then
    expect(screen.getByDisplayValue("Original")).toBeOnTheScreen();
    expect(screen.queryByDisplayValue("Stale_name")).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Aperçu : Photo de profil" }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText("Profil enregistré.")).not.toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
    if (operation === "preparation")
      expect(mockFile.delete).toHaveBeenCalledTimes(1);
  },
);

it("cancels an initial photo read before refreshing the accepted replacement", async () => {
  // Given
  const reads: {
    signal?: AbortSignal | null;
    resolve: (response: Response) => void;
  }[] = [];
  mockFetch.mockImplementation(async (url, request) => {
    if (String(url).endsWith("/photo"))
      return new Promise((resolve) =>
        reads.push({ signal: request?.signal, resolve }),
      );
    return json({ ...account, hasPhoto: true });
  });
  // FileReader is native I/O; the real generated binary call and Query lifecycle remain under test.
  const previousReader = Object.getOwnPropertyDescriptor(
    globalThis,
    "FileReader",
  );
  const nativeRead = jest.fn<void, [Blob]>();
  /** Controlled native reader: one successful decode completes the preview boundary. */
  class PhotoReader {
    result = "data:image/png;base64,accepted";
    onload?: () => void;
    onerror?: () => void;
    /** Completes this test's native preview conversion without changing query behavior. */
    readAsDataURL(blob: Blob) {
      nativeRead(blob);
      this.onload?.();
    }
  }
  Object.defineProperty(globalThis, "FileReader", {
    configurable: true,
    value: PhotoReader,
  });
  try {
    const user = userEvent.setup();
    await mountProfile();
    await screen.findByDisplayValue("Original");
    await waitFor(() => expect(reads).toHaveLength(1));
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [
        { uri: "file:///cache/ImagePicker/source.heic", width: 64, height: 64 },
      ],
    });
    await user.press(
      screen.getByRole("button", { name: "Choisir une photo de profil" }),
    );
    await screen.findByRole("button", { name: "Aperçu : Photo de profil" });

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Enregistrer", busy: false }),
      ).toBeEnabled(),
    );

    // Then
    await waitFor(() => expect(reads).toHaveLength(2));
    expect(reads[0].signal?.aborted).toBe(true);

    // When
    await act(async () =>
      reads[1].resolve(
        new Response(png, { headers: { "Content-Type": "image/png" } }),
      ),
    );
    await screen.findByRole("button", { name: "Aperçu : Photo de profil" });
    await act(async () =>
      reads[0].resolve(
        new Response(png, { headers: { "Content-Type": "image/png" } }),
      ),
    );

    // Then
    expect(
      screen.getByRole("button", { name: "Aperçu : Photo de profil" }),
    ).toBeOnTheScreen();
    expect(nativeRead).toHaveBeenCalledTimes(1);
  } finally {
    // Settle this test's controlled transport even if its regression assertion fails.
    await act(async () =>
      reads.forEach(({ resolve }) =>
        resolve(
          new Response(png, { headers: { "Content-Type": "image/png" } }),
        ),
      ),
    );
    await cleanup();
    if (previousReader)
      Object.defineProperty(globalThis, "FileReader", previousReader);
    else Reflect.deleteProperty(globalThis, "FileReader");
  }
});

it.each(["unmount", "session"])(
  "deletes a prepared profile draft on %s",
  async (exit) => {
    // Given
    // Native File.exists changes after deletion; repeated cleanup must not delete an absent file.
    mockFile.delete.mockImplementation(() => {
      mockFile.exists = false;
    });
    const user = userEvent.setup();
    await mountProfile();
    await screen.findByDisplayValue("Original");
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [
        { uri: "file:///cache/ImagePicker/source.heic", width: 64, height: 64 },
      ],
    });
    await user.press(
      screen.getByRole("button", { name: "Choisir une photo de profil" }),
    );
    await screen.findByRole("button", { name: "Aperçu : Photo de profil" });

    // When
    if (exit === "unmount") await screen.unmount();
    else
      await user.press(
        screen.getByRole("button", { name: "Quitter la session" }),
      );

    // Then
    expect(mockFile.delete.mock.calls).toEqual([[]]);
  },
);

it("deletes the replaced profile copy while preserving the new draft", async () => {
  // Given
  const user = userEvent.setup();
  await mountProfile();
  await screen.findByDisplayValue("Original");
  const replacement = Object.assign(new Blob([png], { type: "image/png" }), {
    uri: "file:///replacement.png",
    exists: true,
    delete: jest.fn(),
  });
  jest
    .mocked(File)
    .mockImplementation(
      (...parts) =>
        (String(parts[0]).startsWith("file:///cache/ImagePicker/")
          ? mockPickedFile
          : parts[0] === replacement.uri
            ? replacement
            : mockFile) as unknown as File,
    );
  mockImage.saveAsync
    .mockResolvedValueOnce({ uri: mockFile.uri, width: 64, height: 64 })
    .mockResolvedValueOnce({ uri: replacement.uri, width: 64, height: 64 });
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      { uri: "file:///cache/ImagePicker/source.heic", width: 64, height: 64 },
    ],
  });
  await user.press(
    screen.getByRole("button", { name: "Choisir une photo de profil" }),
  );
  await screen.findByRole("button", { name: "Aperçu : Photo de profil" });

  // When
  await user.press(
    screen.getByRole("button", { name: "Changer l’image : Photo de profil" }),
  );

  // Then
  await waitFor(() => expect(mockFile.delete).toHaveBeenCalledTimes(1));
  expect(replacement.delete).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Aperçu : Photo de profil" }),
  ).toBeOnTheScreen();
});

it("keeps a sent profile file until its upload settles after sign-out", async () => {
  // Given
  const user = userEvent.setup();
  await mountProfile();
  await screen.findByDisplayValue("Original");
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      { uri: "file:///cache/ImagePicker/source.heic", width: 64, height: 64 },
    ],
  });
  await user.press(
    screen.getByRole("button", { name: "Choisir une photo de profil" }),
  );
  await screen.findByRole("button", { name: "Aperçu : Photo de profil" });
  const response = Promise.withResolvers<Response>();
  mockFetch.mockImplementation(async (_url, request) =>
    request?.method === "PATCH" ? response.promise : json(account),
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.some(([, request]) => request?.method === "PATCH"),
    ).toBe(true),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Quitter la session" }));

  // Then
  expect(mockFile.delete).not.toHaveBeenCalled();

  // When
  await act(async () => response.resolve(json(account)));

  // Then
  await waitFor(() => expect(mockFile.delete).toHaveBeenCalledTimes(1));
  expect(screen.queryByText("Profil enregistré.")).not.toBeOnTheScreen();
  expect(mockNavigate).not.toHaveBeenCalled();
});
