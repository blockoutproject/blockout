import type { ReactElement } from "react";
import type { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { Linking } from "react-native";
import { mockAuth0 } from "../../accounts/test-support/native-auth0";
import { accountResponse } from "../../accounts/test-support/account-response";
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

it.each(["upcoming", "completed"] as const)(
  "keeps the neutral Stream link label for %s without inferring live or replay",
  async (category) => {
    // Given
    detail = {
      ...detail,
      streamUrl: "https://stream.example.invalid/exact?version=259",
      streamContributionId: "00000000-0000-4000-8000-000000000259",
      match: { ...detail.match, category },
    };
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const user = userEvent.setup();
    await renderPage(<MatchScreen matchId={sportingId} />);

    // When
    await user.press(
      await screen.findByRole("link", { name: "Ouvrir le lien" }),
    );

    // Then
    expect(screen.getByText("Stream link")).toBeOnTheScreen();
    expect(screen.queryByText(/Live|Replay/)).not.toBeOnTheScreen();
    expect(open).toHaveBeenCalledWith(detail.streamUrl);
  },
);

it("keeps a failed stream opening explicitly retryable beside the match context", async () => {
  // Given
  detail = { ...detail, streamUrl: "https://stream.example.invalid/current" };
  const open = jest
    .spyOn(Linking, "openURL")
    .mockRejectedValue(new Error("Synthetic native failure"));
  const user = userEvent.setup();
  await renderPage(<MatchScreen matchId={sportingId} />);

  // When
  await user.press(await screen.findByRole("link", { name: "Ouvrir le lien" }));

  // Then
  expect(open).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Home")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Signaler un problème" }),
  ).toBeOnTheScreen();
  await user.press(screen.getByRole("link", { name: "Ouvrir le lien" }));
  expect(open).toHaveBeenCalledTimes(2);
});

it("offers only the published official calendar and no invented stream destination", async () => {
  // Given
  detail = {
    ...detail,
    officialCalendarUrl:
      "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?fixture=259",
  };
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  const user = userEvent.setup();
  await renderPage(<MatchScreen matchId={sportingId} />);

  // When
  await user.press(
    await screen.findByRole("link", { name: /Source.*Calendrier officiel/ }),
  );

  // Then
  expect(open).toHaveBeenCalledWith(detail.officialCalendarUrl);
  expect(
    screen.queryByRole("link", { name: "Ouvrir le lien" }),
  ).not.toBeOnTheScreen();
});
