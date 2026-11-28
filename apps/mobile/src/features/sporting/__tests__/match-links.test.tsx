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
import { mockAuth0 } from "@/features/accounts/test-support/native-auth0";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import {
  ConsultationProviders,
  consultationPublicClient,
} from "../test-support/consultation-providers";
import {
  consultationResponse,
  matchDetail,
  sportingId,
} from "../test-support/consultation-data";
import { MatchScreen } from "../screens/match-screen";

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("@/features/pro/test-support/native-purchases")
    .mockPurchases,
}));
jest.mock("@/features/onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "@/features/accounts/test-support/native-auth0",
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

beforeEach(() => {
  jest.useFakeTimers();
  publicClient = consultationPublicClient();
  detail = matchDetail();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "test-client";
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  jest.mocked(initializeV2Installation).mockResolvedValue(undefined);
  mockFetch
    .mockReset()
    .mockImplementation((url: string) => consultationResponse(url, detail));
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

it.each([
  {
    name: "before the match",
    category: "upcoming",
    result: undefined,
    viewingAction: "Regarder le live",
  },
  {
    name: "with a provisional score",
    viewingAction: "Regarder le live",
    category: "upcoming",
    result: {
      state: "provisional",
      homeSets: 1,
      awaySets: 0,
      observedAt: "2026-10-25T16:00:00Z",
    },
  },
  {
    name: "past the cutoff without a score",
    viewingAction: "Regarder la rediffusion",
    category: "completed",
    result: undefined,
  },
  {
    name: "with a final score",
    viewingAction: "Regarder la rediffusion",
    category: "completed",
    result: {
      state: "final",
      homeSets: 3,
      awaySets: 1,
      observedAt: "2026-10-25T18:00:00Z",
    },
  },
] as const)(
  "offers the match category’s viewing action $name",
  async ({ category, result, viewingAction }) => {
    // Given
    detail = {
      ...detail,
      streamUrl: "https://www.youtube.com/watch?v=fixture-259&t=15",
      streamContributionId: "00000000-0000-4000-8000-000000000259",
      match: { ...detail.match, category, result },
    };
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const user = userEvent.setup();
    await renderPage(<MatchScreen matchId={sportingId} />);

    // When
    const link = await screen.findByRole("link", { name: viewingAction });
    await user.press(link);

    // Then
    expect(
      screen.getByRole("header", { name: "Lien de diffusion" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByHintText("Ouvrir le lien de diffusion en dehors de Blockout"),
    ).toBe(link);
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
  await user.press(
    await screen.findByRole("link", { name: "Regarder le live" }),
  );

  // Then
  expect(open).toHaveBeenCalledTimes(1);
  expect(screen.getByText("Home")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Signaler un problème" }),
  ).toBeOnTheScreen();
  await user.press(screen.getByRole("link", { name: "Regarder le live" }));
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
    screen.queryByRole("link", { name: /^Regarder / }),
  ).not.toBeOnTheScreen();
});
