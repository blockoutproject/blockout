import type { PropsWithChildren } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pressable, Text } from "react-native";
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { onlineManager, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { createQueryClient } from "../../../shared/query/query-client";
import { TECHNICAL_ERROR } from "../../../shared/components/error-copy";
import {
  ApplicationAccessProvider,
  useApplicationAccess,
} from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { SupportJourney } from "../screens/support-journey";
import { SupportScreen } from "../screens/support-screen";
import { useSupportSubmission } from "../api/use-support-submission";
import { supportImage, supportMetadata } from "./fixtures";

// The real SDK, F05 private Query lifetime, RHF, generated client and transport remain mounted.
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
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
  useRouter: () => ({
    canGoBack: () => true,
    back: mockBack,
    replace: jest.fn(),
  }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));
const mockBack = jest.fn();
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const supportHttp = jest.fn<Promise<Response>, [RequestInit?]>();
const environment = { ...process.env };
let client = createQueryClient();
const acceptedId = "00000000-0000-4000-8000-000000000301";

beforeEach(() => {
  jest.useFakeTimers();
  client = createQueryClient();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "support-test",
    EXPO_PUBLIC_AUTH0_AUDIENCE: "support-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  jest.mocked(AsyncStorage.getItem).mockResolvedValue("true");
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|A"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuth.mockReset();
  supportHttp
    .mockReset()
    .mockResolvedValue(
      Response.json({ requestId: acceptedId }, { status: 201 }),
    );
  mockFetch.mockReset().mockImplementation((url, options) => {
    if (String(url).endsWith("/application-access"))
      return Promise.resolve(Response.json(applicationAccessResponse()));
    if (String(url).endsWith("/accounts/me"))
      return Promise.resolve(Response.json(accountResponse()));
    if (String(url).endsWith("/support-requests")) return supportHttp(options);
    throw new Error("Unexpected test destination");
  });
});
afterEach(async () => {
  await cleanup();
  client.clear();
  onlineManager.setOnline(true);
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
  process.env = { ...environment };
});

/** Native session actions deliberately traverse F05's real subject-keyed private lifetime. */
function SessionActions() {
  const session = useAccountSession();
  return (
    <>
      <Text>{session.subject ?? "guest"}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Invité"
        onPress={() => void session.clearCredentials()}
      >
        <Text>Invité</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Connexion"
        onPress={() => void session.signIn("support-test")}
      >
        <Text>Connexion</Text>
      </Pressable>
    </>
  );
}

/** Supplies actual application owners; only native storage/authentication and HTTP are controlled. */
function Providers({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <AccountFeedbackProvider>{children}</AccountFeedbackProvider>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

/** The production journey and screen share one ordinary form, mutation and confirmation composition. */
function Journey() {
  return (
    <Providers>
      <SessionActions />
      <SupportJourney admitted origin={{ screen: "profile" }}>
        <SupportScreen />
      </SupportJourney>
    </Providers>
  );
}

/** Populates the actual RHF fields with fictional input; sending remains explicit in each scenario. */
async function fillForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Titre"), "Demande fictive");
  await user.type(
    screen.getByLabelText("Description"),
    "Le bouton ne répond pas.",
  );
  await user.clear(screen.getByLabelText("E-mail de réponse"));
  await user.type(
    screen.getByLabelText("E-mail de réponse"),
    "reply@example.invalid",
  );
  return user;
}

/** Reads the generated multipart JSON part without replacing its encoder. */
async function metadataAt(index: number) {
  const body = supportHttp.mock.calls[index][0]?.body as FormData;
  const metadata = body.get("metadata") as Blob;
  return JSON.parse(await metadata.text());
}

it("freezes nested metadata and every prepared file before asynchronous credentials", async () => {
  // Given: explicit F12 bypass is the only credential-bearing send.
  const access = applicationAccessResponse();
  access.maintenance.active = true;
  mockFetch.mockImplementation((url, options) => {
    if (String(url).endsWith("/application-access"))
      return Promise.resolve(Response.json(access));
    if (String(url).endsWith("/accounts/me"))
      return Promise.resolve(Response.json(accountResponse()));
    return supportHttp(options);
  });
  const { result } = await renderHook(
    () => ({
      submission: useSupportSubmission(),
      access: useApplicationAccess(),
      session: useAccountSession(),
    }),
    { wrapper: Providers },
  );
  await waitFor(() => expect(result.current.session.accountId).toBeTruthy());
  await act(() => {
    result.current.access.requestBypass(result.current.session, true);
  });
  let release!: (value: ReturnType<typeof credentialsFor>) => void;
  mockAuth0.getCredentials.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const metadata = {
    ...supportMetadata,
    context: { target: { type: "match" as const, id: acceptedId } },
  };
  const images = Array.from({ length: 5 }, (_, index) =>
    supportImage(index % 2 ? "jpeg" : "png"),
  );
  let attempt!: Promise<void>;

  // When
  await act(() => {
    attempt = result.current.submission.send(metadata, images);
  });
  await waitFor(() => expect(release).toBeDefined());
  metadata.title = "Changed after dispatch";
  metadata.context.target.id = "00000000-0000-4000-8000-000000000999";
  images.pop();
  await act(async () => {
    release(credentialsFor("auth0|A"));
    await attempt;
  });

  // Then
  expect(await metadataAt(0)).toMatchObject({
    title: supportMetadata.title,
    context: { target: { id: acceptedId } },
  });
  expect(
    (supportHttp.mock.calls[0][0]?.body as FormData).getAll("images"),
  ).toHaveLength(5);
  expect(
    new Headers(supportHttp.mock.calls[0][0]?.headers).get(
      "Blockout-Maintenance-Bypass",
    ),
  ).toBe("true");
});

it.each([undefined, null])(
  "refuses an unready selected file (%s) without silently sending the others",
  async (unready) => {
    // Given
    const { result } = await renderHook(
      () => ({
        submission: useSupportSubmission(),
        session: useAccountSession(),
      }),
      {
        wrapper: Providers,
      },
    );
    await waitFor(() => expect(result.current.session.accountId).toBeTruthy());
    const images = [supportImage("png"), unready];

    // When / Then
    await act(async () => {
      await expect(
        result.current.submission.send(supportMetadata, images),
      ).rejects.toBeDefined();
    });
    expect(supportHttp).not.toHaveBeenCalled();
  },
);

it.each(["guest", "failed-restoration"])(
  "sends ordinary support as %s without acquiring or renewing credentials",
  async (identity) => {
    // Given
    if (identity === "guest")
      mockAuth0.hasValidCredentials.mockResolvedValue(false);
    else
      mockAuth0.getCredentials.mockRejectedValue(
        new Error("Synthetic SDK failure"),
      );
    await render(<Journey />);
    await screen.findByText("guest");
    const user = await fillForm();
    const calls = mockAuth0.getCredentials.mock.calls.length;

    // When
    await user.press(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    );

    // Then
    await screen.findByRole("header", { name: "Demande reçue" });
    expect(mockAuth0.getCredentials).toHaveBeenCalledTimes(calls);
    expect(
      new Headers(supportHttp.mock.calls[0][0]?.headers).has("Authorization"),
    ).toBe(false);
    expect((await metadataAt(0)).context).not.toHaveProperty("accountId");
  },
);

it("does not start transport after the original visit leaves during bypass credential preparation", async () => {
  // Given
  const access = applicationAccessResponse();
  access.maintenance.active = true;
  mockFetch.mockImplementation((url, options) => {
    if (String(url).endsWith("/application-access"))
      return Promise.resolve(Response.json(access));
    if (String(url).endsWith("/accounts/me"))
      return Promise.resolve(Response.json(accountResponse()));
    return supportHttp(options);
  });
  const { result, unmount } = await renderHook(
    () => ({
      submission: useSupportSubmission(),
      access: useApplicationAccess(),
      session: useAccountSession(),
    }),
    { wrapper: Providers },
  );
  await waitFor(() => expect(result.current.session.accountId).toBeTruthy());
  await act(() => {
    result.current.access.requestBypass(result.current.session, true);
  });
  let release!: (value: ReturnType<typeof credentialsFor>) => void;
  mockAuth0.getCredentials.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  let attempt!: Promise<void>;
  await act(() => {
    attempt = result.current.submission.send(supportMetadata);
  });
  await waitFor(() => expect(release).toBeDefined());

  // When
  await unmount();
  await act(async () => {
    release(credentialsFor("auth0|A"));
    await expect(attempt).rejects.toMatchObject({ kind: "cancelled" });
  });

  // Then
  expect(supportHttp).not.toHaveBeenCalled();
});

it("allows one concurrent tap, locks all fields and confirms only after complete receipt", async () => {
  // Given
  let release!: (response: Response) => void;
  supportHttp.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  await render(<Journey />);
  await screen.findByText("auth0|A");
  await screen.findByDisplayValue("owner@example.invalid");
  const user = await fillForm();
  const credentials = mockAuth0.getCredentials.mock.calls.length;
  const button = screen.getByRole("button", { name: "Envoyer la demande" });

  // When: simultaneous native taps, before a render can disable the button.
  // RNTL 14 fireEvent awaits a render per call; deliver both native callbacks in one event turn.
  await act(() => {
    button.props.onClick({ nativeEvent: {} });
    button.props.onClick({ nativeEvent: {} });
  });
  await waitFor(() => expect(supportHttp).toHaveBeenCalledTimes(1));

  // Then
  expect(screen.getByLabelText("Titre")).toHaveProp("editable", false);
  expect(screen.getByLabelText("Description")).toHaveProp("editable", false);
  expect(screen.getByLabelText("E-mail de réponse")).toHaveProp(
    "editable",
    false,
  );
  expect(
    screen.getByRole("button", { name: "Nature de la demande" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Sujet (facultatif)" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Envoyer la demande" }),
  ).toBeDisabled();
  expect(screen.queryByText("Demande reçue")).toBeNull();
  const headers = new Headers(supportHttp.mock.calls[0][0]?.headers);
  expect(headers.has("Authorization")).toBe(false);
  expect(headers.has("Blockout-Maintenance-Bypass")).toBe(false);
  expect(mockAuth0.getCredentials).toHaveBeenCalledTimes(credentials);

  // When
  await act(async () =>
    release(Response.json({ requestId: acceptedId }, { status: 201 })),
  );

  // Then
  expect(
    await screen.findByRole("header", { name: "Demande reçue" }),
  ).toBeOnTheScreen();
  expect(screen.getByText(/répondrons par e-mail/i)).toBeOnTheScreen();
  expect(screen.queryByLabelText("Titre")).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Envoyer la demande" }),
  ).toBeNull();
  await user.press(screen.getByRole("button", { name: "Terminer" }));
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(supportHttp).toHaveBeenCalledTimes(1);
});

it.each([
  "offline",
  "refusal",
  "unavailable",
  "lost-response",
  "malformed-success",
])(
  "retains editable input after %s and sends corrected input only on an explicit retry",
  async (failure) => {
    // Given
    if (failure === "offline" || failure === "lost-response")
      supportHttp.mockRejectedValueOnce(
        new TypeError("Synthetic lost connection"),
      );
    else if (failure === "malformed-success")
      supportHttp.mockResolvedValueOnce(Response.json({}, { status: 201 }));
    else
      supportHttp.mockResolvedValueOnce(
        Response.json({}, { status: failure === "refusal" ? 422 : 503 }),
      );
    await render(<Journey />);
    await screen.findByText("auth0|A");
    await screen.findByDisplayValue("owner@example.invalid");
    const user = await fillForm();
    if (failure === "offline") onlineManager.setOnline(false);

    // When
    await user.press(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    );

    // Then
    expect(await screen.findByText(TECHNICAL_ERROR)).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Demande fictive")).toHaveProp(
      "editable",
      true,
    );
    expect(
      screen.getByDisplayValue("Le bouton ne répond pas."),
    ).toBeOnTheScreen();
    expect(screen.getByDisplayValue("reply@example.invalid")).toBeOnTheScreen();
    expect(screen.queryByText("Demande reçue")).toBeNull();
    await act(() => onlineManager.setOnline(true));
    await user.clear(screen.getByLabelText("Titre"));
    await user.type(screen.getByLabelText("Titre"), "Demande corrigée");
    expect(supportHttp).toHaveBeenCalledTimes(1);

    // When
    await user.press(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    );

    // Then
    await screen.findByRole("header", { name: "Demande reçue" });
    expect(await metadataAt(0)).toMatchObject({ title: "Demande fictive" });
    expect(await metadataAt(1)).toMatchObject({ title: "Demande corrigée" });
    expect(supportHttp).toHaveBeenCalledTimes(2);
    expect(
      mockFetch.mock.calls.every(([url]) =>
        ["/support-requests", "/application-access", "/accounts/me"].some(
          (path) => String(url).endsWith(path),
        ),
      ),
    ).toBe(true);
  },
);

it.each([201, 503])(
  "ignores a late %i callback after unmount even when transport cancellation fails",
  async (status) => {
    // Given
    let release!: (response: Response) => void;
    supportHttp.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    jest
      .spyOn(AbortController.prototype, "abort")
      .mockImplementation(() => undefined);
    const view = await render(<Journey />);
    await screen.findByText("auth0|A");
    await screen.findByDisplayValue("owner@example.invalid");
    const user = await fillForm();
    await user.press(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    );
    await waitFor(() => expect(supportHttp).toHaveBeenCalledTimes(1));

    // When
    await view.unmount();
    await render(<Journey />);
    await screen.findByText("auth0|A");
    await screen.findByDisplayValue("owner@example.invalid");
    await act(async () =>
      release(Response.json({ requestId: acceptedId }, { status })),
    );

    // Then
    expect(screen.getByLabelText("Titre")).toHaveDisplayValue("");
    expect(screen.queryByText("Demande reçue")).toBeNull();
    expect(screen.queryByText(TECHNICAL_ERROR)).toBeNull();
    expect(mockBack).not.toHaveBeenCalled();
  },
);

it.each(["guest", "B"])(
  "isolates A → %s → A from a late old result without relying on cancellation",
  async (intermediate) => {
    // Given
    let release!: (response: Response) => void;
    supportHttp.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    jest
      .spyOn(AbortController.prototype, "abort")
      .mockImplementation(() => undefined);
    await render(<Journey />);
    await screen.findByText("auth0|A");
    await screen.findByDisplayValue("owner@example.invalid");
    const user = await fillForm();
    await user.press(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    );
    await waitFor(() => expect(supportHttp).toHaveBeenCalledTimes(1));

    // When
    await user.press(screen.getByRole("button", { name: "Invité" }));
    await screen.findByText("guest");
    if (intermediate === "B") {
      mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|B"));
      mockAuth0.webAuth.mockResolvedValueOnce(credentialsFor("auth0|B"));
      await user.press(screen.getByRole("button", { name: "Connexion" }));
      await screen.findByText("auth0|B");
      await screen.findByDisplayValue("owner@example.invalid");
      expect(screen.getByLabelText("Titre")).toHaveDisplayValue("");
      await user.press(screen.getByRole("button", { name: "Invité" }));
      await screen.findByText("guest");
    }
    mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|A"));
    mockAuth0.webAuth.mockResolvedValueOnce(credentialsFor("auth0|A"));
    await user.press(screen.getByRole("button", { name: "Connexion" }));
    await screen.findByText("auth0|A");
    await screen.findByDisplayValue("owner@example.invalid");
    await act(async () =>
      release(Response.json({ requestId: acceptedId }, { status: 201 })),
    );

    // Then
    expect(screen.getByLabelText("Titre")).toHaveDisplayValue("");
    expect(screen.queryByDisplayValue("reply@example.invalid")).toBeNull();
    expect(screen.queryByText("Demande reçue")).toBeNull();
    expect(screen.queryByText(TECHNICAL_ERROR)).toBeNull();
    expect(supportHttp).toHaveBeenCalledTimes(1);
  },
);
