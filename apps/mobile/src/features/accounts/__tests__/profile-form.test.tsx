import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { Pressable, Text } from "react-native";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../session/account-session-provider";
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
  useRouter: () => ({ replace: jest.fn() }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, request?: RequestInit) =>
    mockFetch(url, request),
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
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const mockFile = Object.assign(new Blob([png], { type: "image/png" }), {
  bytes: async () => png,
});
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
let client = createQueryClient();
const account = {
  accountId: "00000000-0000-4000-8000-000000000173",
  username: "Original",
  email: "one@example.invalid",
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
afterEach(() => {
  client.clear();
  process.env = previousEnvironment;
});

/** Real account/form owners with controlled I/O; the unrelated F09 composition is explicitly omitted. */
async function renderProfile() {
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AccountSessionProvider>
          <ProfileScreen admitted proEntry={null} />
          <SessionActions />
        </AccountSessionProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  await screen.findByDisplayValue("Original");
  return userEvent.setup();
}

/** Exercises actual lifecycle commands around delayed preparation/saves without a production bypass. */
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

it("sends one atomic multipart save with JSON metadata and no omitted photo", async () => {
  // Given
  const user = await renderProfile();
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
  await screen.findByText("Profil enregistré.");
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
  const user = await renderProfile();
  await user.clear(screen.getByLabelText("Pseudo"));
  await user.type(screen.getByLabelText("Pseudo"), "My_draft");
  const key = client
    .getQueryCache()
    .findAll()
    .find(({ queryKey }) => queryKey.includes("/accounts/me"))?.queryKey;
  if (!key) throw new Error("The real current-account query is missing");
  await act(() =>
    client.setQueryData(key, { ...account, username: "Other_device" }),
  );
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
});

it("preserves the draft when native crop is cancelled or permission is refused", async () => {
  // Given
  const user = await renderProfile();
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
  await screen.findByText("Impossible de sélectionner l’image. Réessayez.");
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
  const user = await renderProfile();
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
});

it("does not replay while the original account reread is unavailable", async () => {
  // Given
  const user = await renderProfile();
  mockFetch.mockRejectedValue(new TypeError("Offline"));

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await screen.findByRole("button", { name: "Vérifier mon profil" });
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  await user.press(screen.getByRole("button", { name: "Vérifier mon profil" }));
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([, request]) => request?.method === "PATCH"),
    ).toHaveLength(1),
  );
});

it("submits prepared replacement then explicit removal without a username edit", async () => {
  // Given
  const user = await renderProfile();
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///source.heic", width: 64, height: 64 }],
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
  await screen.findByText("Profil enregistré.");
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
    const user = await renderProfile();
    await user.clear(screen.getByLabelText("Pseudo"));
    await user.type(screen.getByLabelText("Pseudo"), "Temporary");
    await user.clear(screen.getByLabelText("Pseudo"));
    await user.type(screen.getByLabelText("Pseudo"), username);
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///source.heic", width: 64, height: 64 }],
    });
    await user.press(
      screen.getByRole("button", { name: "Choisir une photo de profil" }),
    );
    await screen.findByRole("button", { name: "Aperçu : Photo de profil" });

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));

    // Then
    await screen.findByText("Profil enregistré.");
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
  const user = await renderProfile();
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///source.heic", width: 64, height: 64 }],
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
  await screen.findByText(
    "Impossible de préparer la photo. Votre choix précédent est conservé.",
  );
  expect(
    screen.getByRole("button", { name: "Aperçu : Photo de profil" }),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Original")).toBeOnTheScreen();
});

it.each(["preparation", "save"])(
  "rejects delayed %s results after returning to the same account",
  async (operation) => {
    // Given
    const user = await renderProfile();
    let finish: () => void = () => {
      throw new Error("Deferred native/HTTP boundary not reached");
    };
    if (operation === "preparation") {
      jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file:///source.heic", width: 64, height: 64 }],
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
    const user = await renderProfile();
    await waitFor(() => expect(reads).toHaveLength(1));
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///source.heic", width: 64, height: 64 }],
    });
    await user.press(
      screen.getByRole("button", { name: "Choisir une photo de profil" }),
    );
    await screen.findByRole("button", { name: "Aperçu : Photo de profil" });

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await screen.findByText("Profil enregistré.");

    // Then
    await waitFor(() => expect(reads).toHaveLength(2));
    expect(reads[0].signal?.aborted).toBe(true);
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
    if (previousReader)
      Object.defineProperty(globalThis, "FileReader", previousReader);
    else Reflect.deleteProperty(globalThis, "FileReader");
  }
});
