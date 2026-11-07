import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import {
  focusManager,
  onlineManager,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Text } from "react-native";
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
import { mockAuth0 } from "../../accounts/test-support/native-auth0";
import { accountResponse } from "../../accounts/test-support/account-response";
import { SupportJourney } from "../screens/support-journey";
import { SupportScreen } from "../screens/support-screen";
import {
  picker,
  pickedImage,
  preparedImage,
  renderedImage,
  resetNativeImages,
} from "../test-support/native-images";

// The file double must inherit Node's Blob before Babel evaluates these static imports.
// Restore immediately; the suite owns the longer FormData/Blob replacement below.
jest.mock("../test-support/native-images", () => {
  const previous = { Blob, FormData };
  const native = jest
    .requireActual("node:vm")
    .runInThisContext("({ Blob, FormData })");
  Object.assign(globalThis, native);
  try {
    return jest.requireActual("../test-support/native-images");
  } finally {
    Object.assign(globalThis, previous);
  }
});
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock(
  "expo-image-picker",
  () => jest.requireMock("../test-support/native-images").picker,
);
jest.mock(
  "expo-image-manipulator",
  () => jest.requireMock("../test-support/native-images").manipulator,
);
jest.mock(
  "expo-file-system",
  () => jest.requireMock("../test-support/native-images").nativeFileSystem,
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

const mockNativeHttp: Pick<
  typeof globalThis,
  "fetch" | "FormData" | "Blob" | "Response" | "AbortSignal"
> = jest
  .requireActual("node:vm")
  .runInThisContext("({ fetch, FormData, Blob, Response, AbortSignal })");
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const supportHttp = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const previousGlobals = { FormData, Blob };
const environment = { ...process.env };
const previousOnline = onlineManager.isOnline();
const provider = process.env.BLOCKOUT_SUPPORT_PROVIDER_URL;
const scenario = process.env.BLOCKOUT_SUPPORT_RECEIPT_SCENARIO;
const suite = provider ? describe : describe.skip;
const retryRequired = [
  "partial",
  "mark-refused",
  "mark-ambiguous-incomplete",
  "lost-response",
].includes(scenario ?? "");
const receipts: { status: number; body: unknown }[] = [];
let client = createQueryClient();
let releaseFirstReceipt: () => void;
let firstReceiptReady: Promise<void>;

/** Shows the actual F05 restoration outcome without substituting the session owner. */
function GuestIdentity() {
  return <Text>{useAccountSession().subject ?? "guest"}</Text>;
}

/** Keeps the real form, Query lifetime and generated multipart consumer below their owners. */
function Journey() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <AccountFeedbackProvider>
              <GuestIdentity />
              <SupportJourney admitted origin={{}}>
                <SupportScreen />
              </SupportJourney>
            </AccountFeedbackProvider>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

/** Uses the same synthetic compressed originals that the Java receipt peer verifies. */
function imageBytes(format: "png" | "jpg"): Uint8Array<ArrayBuffer> {
  return new Uint8Array(
    readFileSync(
      resolve("../backend/src/test/resources/support", `synthetic.${format}`),
    ),
  );
}

suite(`support receipt through real adapters: ${scenario}`, () => {
  beforeAll(() => {
    expect([
      "complete",
      "partial",
      "mark-refused",
      "mark-ambiguous-complete",
      "mark-ambiguous-incomplete",
      "signal-failed",
      "lost-response",
    ]).toContain(scenario);
    Object.assign(globalThis, {
      FormData: mockNativeHttp.FormData,
      Blob: mockNativeHttp.Blob,
    });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    resetNativeImages();
    client = createQueryClient();
    receipts.length = 0;
    Object.assign(process.env, {
      EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
      EXPO_PUBLIC_AUTH0_CLIENT_ID: "receipt-test",
      EXPO_PUBLIC_AUTH0_AUDIENCE: "receipt-test",
      EXPO_PUBLIC_API_URL: provider,
    });
    jest.mocked(AsyncStorage.getItem).mockResolvedValue("true");
    mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
    mockAuth0.getCredentials.mockReset();
    mockAuth0.webAuth.mockReset();
    mockAuth0.saveCredentials.mockReset().mockResolvedValue();
    mockAuth0.clearCredentials.mockReset().mockResolvedValue();
    const firstReceipt = new Promise<void>((resolve) => {
      releaseFirstReceipt = resolve;
    });
    let responseRead!: () => void;
    firstReceiptReady = new Promise<void>((resolve) => {
      responseRead = resolve;
    });
    supportHttp.mockReset().mockImplementation(async (url, options) => {
      const firstAttempt = supportHttp.mock.calls.length === 1;
      try {
        const response = await mockNativeHttp.fetch(url, {
          ...options,
          signal: options?.signal ?? mockNativeHttp.AbortSignal.timeout(15_000),
        });
        const body: unknown = await response.clone().json();
        receipts.push({ status: response.status, body });
        if (firstAttempt) {
          responseRead();
          await firstReceipt;
          if (scenario === "lost-response") {
            throw new TypeError(
              "Synthetic response loss after complete receipt",
            );
          }
        }
        return response;
      } finally {
        // A real transport failure must release the test's network wait as well.
        if (firstAttempt) {
          responseRead();
        }
      }
    });
    mockFetch.mockReset().mockImplementation((url, options) => {
      if (String(url).endsWith("/application-access")) {
        return Promise.resolve(
          mockNativeHttp.Response.json(applicationAccessResponse()),
        );
      }
      if (String(url).endsWith("/accounts/me")) {
        return Promise.resolve(mockNativeHttp.Response.json(accountResponse()));
      }
      if (String(url).endsWith("/support-requests")) {
        return supportHttp(url, options);
      }
      throw new Error("Unexpected controlled destination");
    });
  });

  afterEach(async () => {
    releaseFirstReceipt();
    await cleanup();
    client.clear();
    onlineManager.setOnline(previousOnline);
    focusManager.setFocused(undefined);
    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    process.env = { ...environment };
  });

  afterAll(() => {
    Object.assign(globalThis, previousGlobals);
  });

  it("reflects actual complete receipt and retains the draft for an explicit corrected retry after failure", async () => {
    // Given: native preparation is controlled; the selected original bytes reach the real backend.
    const originals = [
      preparedImage("file:///cache/receipt.png", imageBytes("png")),
      preparedImage("file:///cache/receipt.jpg", imageBytes("jpg")),
    ];
    renderedImage.saveAsync
      .mockResolvedValueOnce({ uri: originals[0].uri })
      .mockResolvedValueOnce({ uri: originals[1].uri });
    picker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [pickedImage(1), pickedImage(2)],
    });
    await render(<Journey />);
    await screen.findByText("guest");
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Titre"), "Synthetic receipt");
    await user.type(
      screen.getByLabelText("Description"),
      "Description retained",
    );
    await user.type(
      screen.getByLabelText("E-mail de réponse"),
      "reply@example.invalid",
    );
    await user.press(
      screen.getByRole("button", { name: "Ajouter des images" }),
    );
    await screen.findByRole("button", { name: "Aperçu : Image 2" });

    // When
    await user.press(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    );
    // Node's actual HTTP runs on native timers; awaiting its promise keeps Jest time controlled.
    await act(async () => {
      await firstReceiptReady;
    });

    // Then: even a completed backend response cannot confirm before transport delivers it.
    expect(receipts[0].status).toBe(
      retryRequired && scenario !== "lost-response" ? 503 : 201,
    );
    expect(screen.queryByRole("header", { name: "Demande reçue" })).toBeNull();
    await act(async () => releaseFirstReceipt());

    if (retryRequired) {
      // Then
      expect(await screen.findByText(TECHNICAL_ERROR)).toBeOnTheScreen();
      expect(screen.getByDisplayValue("Synthetic receipt")).toHaveProp(
        "editable",
        true,
      );
      expect(screen.getByDisplayValue("Description retained")).toHaveProp(
        "editable",
        true,
      );
      expect(screen.getByDisplayValue("reply@example.invalid")).toHaveProp(
        "editable",
        true,
      );
      expect(
        screen.getByRole("button", { name: "Aperçu : Image 1" }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Aperçu : Image 2" }),
      ).toBeOnTheScreen();
      expect(originals.every((file) => file.exists)).toBe(true);
      expect(
        screen.queryByRole("header", { name: "Demande reçue" }),
      ).toBeNull();

      // When: reconnect and foreground events cannot replay the failed or uncertain write.
      await act(() => {
        onlineManager.setOnline(false);
        focusManager.setFocused(false);
      });
      await act(() => {
        onlineManager.setOnline(true);
        focusManager.setFocused(true);
      });
      await user.clear(screen.getByLabelText("Titre"));
      await user.type(
        screen.getByLabelText("Titre"),
        "Synthetic corrected receipt",
      );

      // Then
      expect(supportHttp).toHaveBeenCalledTimes(1);

      // When
      await user.press(
        screen.getByRole("button", { name: "Envoyer la demande" }),
      );
      await act(async () => {
        await supportHttp.mock.results[1].value;
      });
    }

    // Then
    await screen.findByRole(
      "header",
      { name: "Demande reçue" },
      { timeout: 15_000 },
    );
    expect(
      screen.getByText("Nous vous répondrons par e-mail."),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText("Titre")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Envoyer la demande" }),
    ).toBeNull();
    expect(supportHttp).toHaveBeenCalledTimes(retryRequired ? 2 : 1);
    expect(receipts.at(-1)).toMatchObject({
      status: 201,
      body: { requestId: expect.any(String) },
    });
  }, 30_000);
});
