import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Pressable, Text } from "react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { createQueryClient } from "../../../shared/query/query-client";
import { TECHNICAL_ERROR } from "../../../shared/components/error-copy";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { accountResponse } from "../../accounts/test-support/account-response";
import { SupportJourney } from "../screens/support-journey";
import { SupportScreen } from "../screens/support-screen";
import {
  files,
  picker,
  pickedImage,
  preparedImage,
  renderedImage,
  resetNativeImages,
} from "../test-support/native-images";

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock(
  "expo-image-picker",
  () => jest.requireActual("../test-support/native-images").picker,
);
jest.mock(
  "expo-image-manipulator",
  () => jest.requireActual("../test-support/native-images").manipulator,
);
jest.mock(
  "expo-file-system",
  () => jest.requireActual("../test-support/native-images").nativeFileSystem,
);
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  usePreventRemove: jest.fn(),
  useRouter: () => ({ canGoBack: () => true, back: jest.fn() }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const supportHttp = jest.fn<Promise<Response>, [RequestInit?]>();
const environment = { ...process.env };
let client = createQueryClient();

beforeEach(() => {
  jest.useFakeTimers();
  resetNativeImages();
  client = createQueryClient();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "images",
    EXPO_PUBLIC_AUTH0_AUDIENCE: "images",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  jest.mocked(AsyncStorage.getItem).mockResolvedValue("true");
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|A"));
  mockAuth0.webAuth.mockReset();
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  supportHttp
    .mockReset()
    .mockResolvedValue(
      Response.json(
        { requestId: "00000000-0000-4000-8000-000000000307" },
        { status: 201 },
      ),
    );
  mockFetch.mockReset().mockImplementation((url, options) => {
    if (String(url).endsWith("/application-access"))
      return Promise.resolve(Response.json(applicationAccessResponse()));
    if (String(url).endsWith("/accounts/me"))
      return Promise.resolve(Response.json(accountResponse()));
    if (String(url).endsWith("/support-requests")) return supportHttp(options);
    throw new Error("Unexpected controlled destination");
  });
});
afterEach(async () => {
  await cleanup();
  client.clear();
  jest.clearAllTimers();
  jest.useRealTimers();
  process.env = { ...environment };
});

/** Real F05 commands replace the complete private React/Query lifetime; no session store is simulated. */
function IdentityActions() {
  const session = useAccountSession();
  return (
    <>
      <Text>{session.subject ?? "guest"}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Connexion"
        onPress={() => void session.signIn("images")}
      >
        <Text>Connexion</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Invité"
        onPress={() => void session.clearCredentials()}
      >
        <Text>Invité</Text>
      </Pressable>
    </>
  );
}

/** Real controls, RHF, F05/Query, generated FormData and F13 transport; only native I/O and HTTP are controlled. */
async function openSupport() {
  const view = await render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <AccountFeedbackProvider>
              <IdentityActions />
              <SupportJourney admitted origin={{}}>
                <SupportScreen />
              </SupportJourney>
            </AccountFeedbackProvider>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
  await screen.findByText("guest");
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Titre"), "Images fictives");
  await user.type(
    screen.getByLabelText("Description"),
    "Description conservée",
  );
  await user.type(
    screen.getByLabelText("E-mail de réponse"),
    "reply@example.invalid",
  );
  return { user, view };
}

it("sends all five exact-5-MiB native files through ordinary FormData and confirms only complete receipt", async () => {
  // Given
  const { user } = await openSupport();
  const prepared = Array.from({ length: 5 }, (_, i) =>
    preparedImage(`file:///cache/exact-${i}.${i % 2 ? "jpg" : "png"}`, 5242880),
  );
  prepared.forEach((file) =>
    renderedImage.saveAsync.mockResolvedValueOnce({ uri: file.uri }),
  );
  picker.launchImageLibraryAsync.mockResolvedValueOnce({
    canceled: false,
    assets: prepared.map((_, i) => pickedImage(i)),
  });
  let accept!: (response: Response) => void;
  supportHttp.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        accept = resolve;
      }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Ajouter des images" }));
  await user.press(screen.getByRole("button", { name: "Envoyer la demande" }));
  await waitFor(() => expect(supportHttp).toHaveBeenCalledTimes(1));

  // Then
  const body = supportHttp.mock.calls[0][0]?.body as FormData;
  expect(
    body.getAll("images").map((file) => ({
      size: (file as Blob).size,
      type: (file as Blob).type,
    })),
  ).toEqual(prepared.map((file) => ({ size: file.size, type: file.type })));
  const metadata = JSON.parse(await (body.get("metadata") as Blob).text());
  expect(metadata).toMatchObject({
    title: "Images fictives",
    description: "Description conservée",
  });
  expect(metadata).not.toHaveProperty("images");
  expect(screen.queryByText("Demande reçue")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Ajouter des images" }),
  ).toBeDisabled();

  // When
  await act(() =>
    accept(
      Response.json(
        { requestId: "00000000-0000-4000-8000-000000000307" },
        { status: 201 },
      ),
    ),
  );

  // Then
  expect(
    await screen.findByRole("header", { name: "Demande reçue" }),
  ).toBeOnTheScreen();
  await waitFor(() =>
    expect(prepared.every((file) => !file.exists)).toBe(true),
  );
});

it("requires explicit removal of an oversized image, retains other files after transport error and retries all remaining files", async () => {
  // Given
  const { user } = await openSupport();
  const good = preparedImage("file:///cache/good.png", 5242880);
  const rejected = preparedImage("file:///cache/oversized.png", 5242881);
  renderedImage.saveAsync
    .mockResolvedValueOnce({ uri: good.uri })
    .mockResolvedValueOnce({ uri: rejected.uri });
  picker.launchImageLibraryAsync.mockResolvedValueOnce({
    canceled: false,
    assets: [pickedImage(1), pickedImage(2)],
  });
  supportHttp.mockRejectedValueOnce(new TypeError("Synthetic lost response"));

  // When
  await user.press(screen.getByRole("button", { name: "Ajouter des images" }));
  await user.press(screen.getByRole("button", { name: "Envoyer la demande" }));

  // Then
  expect(supportHttp).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue("Images fictives")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: /Supprimer l’image : Image 2/ }),
  ).toBeOnTheScreen();

  // When
  await user.press(
    screen.getByRole("button", { name: /Supprimer l’image : Image 2/ }),
  );
  await user.press(screen.getByRole("button", { name: "Envoyer la demande" }));

  // Then
  expect(await screen.findByText(TECHNICAL_ERROR)).toBeOnTheScreen();
  expect(good.exists).toBe(true);
  expect(
    screen.getByRole("button", { name: "Aperçu : Image 1" }),
  ).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Envoyer la demande" }));

  // Then
  await screen.findByRole("header", { name: "Demande reçue" });
  expect(supportHttp).toHaveBeenCalledTimes(2);
  supportHttp.mock.calls.forEach(([options]) =>
    expect((options?.body as FormData).getAll("images")).toHaveLength(1),
  );
});

it("retains the sent bytes until settlement after unmount, without restoring a receipt", async () => {
  // Given
  const { user, view } = await openSupport();
  picker.launchImageLibraryAsync.mockResolvedValueOnce({
    canceled: false,
    assets: [pickedImage()],
  });
  await user.press(screen.getByRole("button", { name: "Ajouter des images" }));
  const prepared = [...files.values()][0];
  let accept!: (response: Response) => void;
  supportHttp.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        accept = resolve;
      }),
  );
  await user.press(screen.getByRole("button", { name: "Envoyer la demande" }));
  await waitFor(() => expect(supportHttp).toHaveBeenCalledTimes(1));

  // When
  await view.unmount();

  // Then
  expect(prepared.exists).toBe(true);
  await act(() =>
    accept(
      Response.json(
        { requestId: "00000000-0000-4000-8000-000000000307" },
        { status: 201 },
      ),
    ),
  );
  expect(prepared.exists).toBe(false);
  await openSupport();
  expect(screen.queryByRole("button", { name: /Aperçu : Image/ })).toBeNull();
  expect(screen.queryByText("Demande reçue")).toBeNull();
});

it("reserves sent files before a queued remove event can delete the native bytes", async () => {
  // Given
  const { user } = await openSupport();
  picker.launchImageLibraryAsync.mockResolvedValueOnce({
    canceled: false,
    assets: [pickedImage()],
  });
  await user.press(screen.getByRole("button", { name: "Ajouter des images" }));
  const prepared = [...files.values()][0];
  const send = screen.getByRole("button", { name: "Envoyer la demande" });
  const remove = screen.getByRole("button", {
    name: /Supprimer l’image : Image 1/,
  });
  let accept!: (response: Response) => void;
  supportHttp.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        accept = resolve;
      }),
  );

  // When: two native events already queued before React can publish RHF's submitting state.
  await act(() => {
    send.props.onClick({ nativeEvent: {} });
    remove.props.onClick({ nativeEvent: {} });
  });
  await waitFor(() => expect(supportHttp).toHaveBeenCalledTimes(1));

  // Then
  expect(prepared.exists).toBe(true);
  expect(
    (supportHttp.mock.calls[0][0]?.body as FormData).getAll("images"),
  ).toHaveLength(1);
  await act(() =>
    accept(
      Response.json(
        { requestId: "00000000-0000-4000-8000-000000000307" },
        { status: 201 },
      ),
    ),
  );
});

it("discards selected images and late preparation across guest → A → guest using the original F05 lifetime", async () => {
  // Given
  const { user } = await openSupport();
  picker.launchImageLibraryAsync.mockResolvedValueOnce({
    canceled: false,
    assets: [pickedImage()],
  });
  let finish!: (value: { uri: string }) => void;
  renderedImage.saveAsync.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await user.press(screen.getByRole("button", { name: "Ajouter des images" }));
  mockAuth0.webAuth.mockResolvedValue(credentialsFor("auth0|A"));

  // When
  await user.press(screen.getByRole("button", { name: "Connexion" }));
  await screen.findByText("auth0|A");
  await user.press(screen.getByRole("button", { name: "Invité" }));
  await screen.findByText("guest");
  const old = preparedImage("file:///cache/old.png");
  await act(() => finish({ uri: old.uri }));

  // Then
  expect(old.delete).toHaveBeenCalled();
  expect(screen.getByLabelText("Titre")).toHaveDisplayValue("");
  expect(screen.queryByRole("button", { name: /Aperçu : Image/ })).toBeNull();
  expect(supportHttp).not.toHaveBeenCalled();
});
