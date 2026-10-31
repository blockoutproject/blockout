import type { ReactElement } from "react";
import type { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";
import Pdf from "react-native-pdf";
import {
  mockAuth0,
  credentialsFor,
} from "../../accounts/test-support/native-auth0";
import { accountResponse } from "../../accounts/test-support/account-response";
import { useAccountSession } from "../../accounts/current-account";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  ConsultationProviders,
  consultationPublicClient,
} from "../test-support/consultation-providers";
import {
  consultationResponse,
  matchDetail,
  sportingId,
} from "../test-support/consultation-data";
import {
  documentFiles,
  documentWrite,
} from "../test-support/native-document-files";
import { MatchScreen } from "../screens/match-screen";

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../../pro/test-support/native-purchases")
    .mockPurchases,
}));
jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => ({ back: jest.fn(), push: mockPush, canGoBack: () => true }),
  useNavigation: () => ({ isFocused: () => true }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
jest.mock(
  "expo-file-system",
  () =>
    jest.requireActual("../test-support/native-document-files")
      .nativeDocumentFiles,
);
const mockFetch = jest.fn();
const mockPush = jest.fn();
const environment = { ...process.env };
let client: QueryClient;
let publicClient: QueryClient;
let detail = matchDetail();

/** Captures the actual session-owned private Query client for current-authority rereads. */
function captureClient(current: QueryClient) {
  client = current;
}
/** Renders actual generated transport, access, session, advertising and shared UI owners. */
function renderPage(content: ReactElement) {
  return render(content, {
    wrapper: ({ children }) => (
      <ConsultationProviders
        publicClient={publicClient}
        onClient={captureClient}
      >
        {children}
      </ConsultationProviders>
    ),
  });
}
/** Uses only synthetic generated HTTP results; no application hook or lifecycle is replaced. */
function reads(url: string) {
  if (url.includes("/documents/"))
    return Promise.resolve(
      new Response("%PDF-1.7\nsynthetic\n%%EOF", {
        headers: { "Content-Type": "application/pdf" },
      }),
    );
  if (url.endsWith("/accounts/me"))
    return Promise.resolve(Response.json(accountResponse()));
  return consultationResponse(url, detail);
}

beforeEach(() => {
  jest.useFakeTimers();
  publicClient = consultationPublicClient();
  detail = {
    ...matchDetail(),
    venueName: "Gymnase fictif",
    documents: [
      {
        kind: "information",
        url: `/matches/${sportingId}/documents/information`,
      },
    ],
  };
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "test-client";
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  jest.mocked(initializeV2Installation).mockResolvedValue(undefined);
  mockFetch.mockReset().mockImplementation(reads);
  documentFiles.length = 0;
  documentWrite.mockReset();
  jest
    .mocked(Pdf)
    .mockImplementation((props) => (
      <View
        testID="native-pdf"
        onTouchEnd={() =>
          props.onError?.(new Error("Synthetic decoder failure"))
        }
      />
    ));
});
afterEach(async () => {
  await cleanup();
  client?.clear();
  publicClient.clear();
  await act(async () => jest.runOnlyPendingTimersAsync());
  jest.useRealTimers();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

it("opens the generated binary as a local-only full-screen PDF and releases it when returning to the same match", async () => {
  // Given
  const user = userEvent.setup();
  await renderPage(<MatchScreen matchId={sportingId} />);

  // When
  await user.press(
    await screen.findByRole("link", { name: /Lieu.*Fiche d’information/ }),
  );
  await screen.findByTestId("native-pdf");

  // Then
  expect(jest.mocked(Pdf).mock.lastCall?.[0].source).toEqual({
    uri: documentFiles[0].uri,
  });
  expect(documentFiles[0].uri).toMatch(/^file:\/\/\//);
  expect(mockAuth0.getCredentials).not.toHaveBeenCalled();
  await user.press(screen.getByRole("button", { name: "Fermer le document" }));
  expect(screen.queryByTestId("native-pdf")).not.toBeOnTheScreen();
  expect(documentFiles[0].exists).toBe(false);
  expect(screen.getByText("Home")).toBeOnTheScreen();
});

it("keeps ordinary failure retry explicit and preserves the match reporting context", async () => {
  // Given
  const user = userEvent.setup();
  let pdfReads = 0;
  mockFetch.mockImplementation((url: string) =>
    url.includes("/documents/") && ++pdfReads === 1
      ? Promise.resolve(new Response(null, { status: 503 }))
      : reads(url),
  );
  await renderPage(<MatchScreen matchId={sportingId} />);

  // When
  await user.press(
    await screen.findByRole("link", { name: /Lieu.*Fiche d’information/ }),
  );
  await screen.findByRole("button", { name: "Réessayer" });

  // Then
  expect(pdfReads).toBe(1);
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await screen.findByTestId("native-pdf");
  expect(pdfReads).toBe(2);
  await user.press(
    screen.getByRole("button", {
      name: "Signaler un problème avec le document",
    }),
  );
  expect(mockPush).toHaveBeenCalledWith(
    expect.objectContaining({
      params: expect.objectContaining({
        targetId: sportingId,
        targetType: "match",
      }),
    }),
  );
  expect(documentFiles.every((file) => !file.exists)).toBe(true);
});

it("cancels a closed opening and rejects its obsolete successful completion", async () => {
  // Given
  const user = userEvent.setup();
  const pending = Promise.withResolvers<Response>();
  let signal: AbortSignal | undefined;
  mockFetch.mockImplementation((url: string, request: RequestInit) => {
    if (!url.includes("/documents/")) return reads(url);
    signal = request.signal ?? undefined;
    return pending.promise;
  });
  await renderPage(<MatchScreen matchId={sportingId} />);
  await user.press(
    await screen.findByRole("link", { name: /Lieu.*Fiche d’information/ }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Fermer le document" }));
  await act(async () => pending.resolve(await reads("/documents/information")));

  // Then
  expect(signal?.aborted).toBe(true);
  expect(documentFiles).toHaveLength(0);
  expect(screen.queryByTestId("native-pdf")).not.toBeOnTheScreen();
  expect(screen.getByText("Home")).toBeOnTheScreen();
});

it("releases a decoder failure before explicit retry", async () => {
  // Given
  const user = userEvent.setup();
  await renderPage(<MatchScreen matchId={sportingId} />);
  await user.press(
    await screen.findByRole("link", { name: /Lieu.*Fiche d’information/ }),
  );
  const native = await screen.findByTestId("native-pdf");

  // When: the native renderer owns decode failure; no real PDF compatibility is claimed.
  await fireEvent(native, "touchEnd");

  // Then
  expect(
    await screen.findByRole("button", { name: "Réessayer" }),
  ).toBeOnTheScreen();
  expect(documentFiles[0].exists).toBe(false);
});

it("withdraws an active document on a current match refusal and never reopens it after recovery", async () => {
  // Given
  const user = userEvent.setup();
  await renderPage(<MatchScreen matchId={sportingId} />);
  await user.press(
    await screen.findByRole("link", { name: /Lieu.*Fiche d’information/ }),
  );
  await screen.findByTestId("native-pdf");
  mockFetch.mockImplementation((url: string) =>
    url.endsWith(`/matches/${sportingId}`)
      ? Promise.resolve(new Response(null, { status: 404 }))
      : reads(url),
  );

  // When
  await act(() =>
    client.invalidateQueries({ queryKey: [`/matches/${sportingId}`] }),
  );

  // Then
  await waitFor(() => expect(documentFiles[0].exists).toBe(false));
  expect(screen.queryByTestId("native-pdf")).not.toBeOnTheScreen();
  mockFetch.mockImplementation(reads);
  await act(() =>
    client.invalidateQueries({ queryKey: [`/matches/${sportingId}`] }),
  );
  await screen.findByText("Home");
  expect(screen.queryByTestId("native-pdf")).not.toBeOnTheScreen();
});

/** An explicit SDK account switch exercises the real private-tree replacement. */
function SwitchAccount() {
  const session = useAccountSession();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Switch account"
      onPress={() => void session.signIn("document-test")}
    >
      <Text>Switch account</Text>
    </Pressable>
  );
}

it("cancels a pending PDF when the SDK principal replaces the private tree", async () => {
  // Given
  const pending = Promise.withResolvers<Response>();
  let signal: AbortSignal | undefined;
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|first"));
  mockAuth0.webAuth.mockResolvedValue(credentialsFor("auth0|second"));
  mockAuth0.saveCredentials.mockResolvedValue(undefined);
  mockFetch.mockImplementation((url: string, request: RequestInit) => {
    if (!url.includes("/documents/")) return reads(url);
    signal = request.signal ?? undefined;
    return pending.promise;
  });
  const user = userEvent.setup();
  await renderPage(
    <>
      <SwitchAccount />
      <MatchScreen matchId={sportingId} />
    </>,
  );
  await user.press(
    await screen.findByRole("link", { name: /Lieu.*Fiche d’information/ }),
  );

  // When
  mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|second"));
  await user.press(
    screen.getByRole("button", {
      name: "Switch account",
      includeHiddenElements: true,
    }),
  );
  await act(async () => pending.resolve(await reads("/documents/information")));

  // Then
  await waitFor(() => expect(signal?.aborted).toBe(true));
  expect(documentFiles).toHaveLength(0);
  expect(screen.queryByTestId("native-pdf")).not.toBeOnTheScreen();
});

it("releases the original file when navigation selects another match without automatically opening its document", async () => {
  // Given
  const user = userEvent.setup();
  const page = await renderPage(<MatchScreen matchId={sportingId} />);
  await user.press(
    await screen.findByRole("link", { name: /Lieu.*Fiche d’information/ }),
  );
  await screen.findByTestId("native-pdf");
  const otherId = "00000000-0000-4000-8000-000000000260";
  detail = {
    ...detail,
    venueName: "Autre gymnase",
    match: { ...detail.match, id: otherId },
    documents: [
      { kind: "information", url: `/matches/${otherId}/documents/information` },
    ],
  };

  // When
  await page.rerender(<MatchScreen matchId={otherId} />);

  // Then
  await screen.findByRole("link", { name: /Lieu.*Autre gymnase/ });
  expect(documentFiles[0].exists).toBe(false);
  expect(screen.queryByTestId("native-pdf")).not.toBeOnTheScreen();
});
