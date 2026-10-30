import { useLayoutEffect, type PropsWithChildren } from "react";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
  fireEvent,
} from "@testing-library/react-native";
import { Alert, AppState } from "react-native";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { matchDetail } from "../../sporting/test-support/consultation-data";
import { ModerationScreen } from "../screens/moderation-screen";
import { ModerationMatchScreen } from "../screens/moderation-match-screen";
import type {
  ModeratedStreamContributionsResponse,
  ModeratedStreamContributionResponse,
} from "../../../../.generated/schemas/index.zod";

jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
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
  usePreventRemove: jest.fn(),
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true }),
  useNavigation: () => ({ isFocused: () => true }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, init?: RequestInit) => mockFetch(url, init),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const mockPush = jest.fn();
const previous = { ...process.env };
const previousAppState = AppState.currentState;
const sporting = matchDetail().match;
const versionId = "00000000-0000-4000-8000-000000000099";
let publicClient = createQueryClient();
let client = publicClient;
let permission = true;
let failRead = false;
let writes: unknown[] = [];
let queuePaged = false;
let queueEmpty = false;
let writeStatus = 200;
let failAfterWrite = false;
let detail: ModeratedStreamContributionsResponse;

/** Canonical fictional version; each scenario supplies its decisive lifecycle/capabilities. */
function version(
  overrides: Partial<ModeratedStreamContributionResponse> = {},
): ModeratedStreamContributionResponse {
  return {
    id: versionId,
    url: "https://twitch.tv/review_link",
    platform: "twitch",
    state: "pending",
    submittedAt: "2026-10-24T12:00:00Z",
    reportCount: 0,
    canApprove: true,
    canReject: true,
    canWithdraw: false,
    canReactivate: false,
    decisions: [],
    ...overrides,
  };
}

beforeEach(() => {
  AppState.currentState = "active";
  publicClient = createQueryClient();
  client = publicClient;
  publicClient.setQueryDefaults([], { retry: false });
  permission = true;
  failRead = false;
  writes = [];
  queuePaged = false;
  queueEmpty = false;
  writeStatus = 200;
  failAfterWrite = false;
  mockPush.mockReset();
  detail = {
    revision: "viewed:1",
    match: {
      id: sporting.id,
      seasonId: sporting.pool.season.id,
      home: sporting.home,
      away: sporting.away,
      pool: sporting.pool,
      publiclyViewable: false,
    },
    counts: { active: 1, pending: 1, hidden: 0, reports: 0, rejected: 24 },
    approvalRequiredAfterReports: false,
    canPublish: false,
    activeContribution: version({
      id: "00000000-0000-4000-8000-000000000098",
      state: "active",
      canApprove: false,
      canReject: false,
      canWithdraw: true,
      url: "https://youtu.be/retained",
    }),
    items: [version({ canApprove: false })],
  };
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|synthetic"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockFetch.mockReset().mockImplementation(async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("/application-access"))
      return Response.json(applicationAccessResponse());
    if (path.endsWith("/me"))
      return Response.json(
        accountResponse({ permissions: { moderateStreamLinks: permission } }),
      );
    if (init?.method === "PATCH" || init?.method === "POST") {
      writes.push(JSON.parse(String(init.body)));
      if (writeStatus >= 400)
        return Response.json(
          {
            type: "urn:blockout:problem:conflict",
            title: "Conflict",
            status: writeStatus,
          },
          { status: writeStatus },
        );
      if (failAfterWrite) failRead = true;
      return Response.json({
        revision: "accepted:2",
        contribution: detail.items[0],
      });
    }
    if (failRead)
      return Response.json(
        {
          type: "urn:blockout:problem:unavailable",
          title: "Unavailable",
          status: 503,
        },
        { status: 503 },
      );
    if (path.endsWith("/stream-moderation")) {
      const page = new URL(String(url)).searchParams.get("page");
      return Response.json({
        items: queueEmpty
          ? []
          : [
              {
                match: {
                  ...detail.match,
                  ...(page === "1"
                    ? {
                        id: "00000000-0000-4000-8000-000000000500",
                        home: { ...detail.match.home, name: "Second match" },
                      }
                    : {}),
                },
                counts: detail.counts,
                approvalRequiredAfterReports: false,
                lastActivityAt: "2026-10-24T12:00:00Z",
              },
            ],
        ...(queuePaged && page !== "1" ? { nextPage: 1 } : {}),
      });
    }
    if (path.endsWith("/reports"))
      return Response.json({
        count: 1,
        items: [
          {
            id: "00000000-0000-4000-8000-000000000010",
            reportedAt: "2026-10-24T12:00:00Z",
            reason: null,
          },
        ],
      });
    return Response.json(detail);
  });
});
afterEach(async () => {
  await act(async () => {
    await client.cancelQueries();
  });
  await cleanup();
  client.clear();
  publicClient.clear();
  process.env = { ...previous };
  AppState.currentState = previousAppState;
  jest.restoreAllMocks();
});

/** Uses the real private QueryClient/session/admission/theme owners; only HTTP and native I/O are controlled. */
function PrivateQueries({ children }: PropsWithChildren) {
  const current = useQueryClient();
  useLayoutEffect(() => {
    client = current;
    current.setQueryDefaults([], { retry: false });
    current.setDefaultOptions({
      mutations: { retry: false, networkMode: "always", gcTime: Infinity },
    });
  }, [current]);
  return children;
}
/** Mounts the chosen real feature screen inside its required providers. */
async function mount(children: React.ReactNode) {
  await render(
    <QueryClientProvider client={publicClient}>
      <ThemeProvider>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <PrivateQueries>
              <AccountFeedbackProvider>{children}</AccountFeedbackProvider>
            </PrivateQueries>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

it("requires the literal current moderation capability before private reads", async () => {
  // Given
  permission = false;

  // When
  await mount(<ModerationScreen filters={{}} />);

  // Then
  await screen.findByText("La modération des liens vidéo n’est pas autorisée.");
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      String(url).includes("/administration/stream"),
    ),
  ).toHaveLength(0);
});

it("shows private dateless context and the active member independently of pending history", async () => {
  // Given: the retained private fixture has no public date or consultation permission.

  // When
  await mount(<ModerationMatchScreen matchId={sporting.id} />);

  // Then
  await screen.findByText("Match non consultable publiquement");
  expect(screen.getByText("Date indisponible")).toBeOnTheScreen();
  expect(screen.getByText("https://youtu.be/retained")).toBeOnTheScreen();
  await userEvent.press(screen.getByRole("tab", { name: "Propositions (1)" }));
  expect(
    await screen.findByText("https://twitch.tv/review_link"),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Approuver" })).toBeNull();
});

it("confirms the exact actor revision and version before rejecting", async () => {
  // Given
  const alert = jest.spyOn(Alert, "alert");
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  await screen.findByText("https://youtu.be/retained");
  const user = userEvent.setup();
  await user.press(screen.getByRole("tab", { name: "Propositions (1)" }));

  // When
  await user.press(await screen.findByRole("button", { name: "Refuser" }));
  expect(writes).toHaveLength(0);
  await act(async () => {
    alert.mock.calls
      .at(-1)?.[2]
      ?.find((button) => button.text === "Refuser")
      ?.onPress?.();
  });

  // Then
  await waitFor(() =>
    expect(writes).toEqual([
      {
        actorAccountId: accountResponse().accountId,
        revision: "viewed:1",
        action: "reject",
      },
    ]),
  );
  expect(
    mockFetch.mock.calls.some(
      ([url, init]) =>
        String(url).endsWith(`/stream-contributions/${versionId}`) &&
        init?.method === "PATCH",
    ),
  ).toBe(true);
});

it("retains historical reports and distinguishes erased reasons", async () => {
  // Given
  detail.items = [
    version({
      state: "hidden",
      canApprove: false,
      canReject: false,
      canReactivate: true,
      reportCount: 1,
    }),
  ];

  // When
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  await screen.findByText("https://youtu.be/retained");
  const user = userEvent.setup();
  await user.press(screen.getByRole("tab", { name: "Historique" }));
  await user.press(
    await screen.findByRole("button", { name: /Twitch · Masqué/ }),
  );
  await user.press(
    await screen.findByRole("button", { name: "Signalements (1)" }),
  );

  // Then
  expect(await screen.findByText("Motif indisponible")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réactiver" })).toBeOnTheScreen();
});

it("keeps an unsuccessful queue read distinct from an empty successful selection", async () => {
  // Given
  failRead = true;

  // When
  await mount(<ModerationScreen filters={{}} />);

  // Then
  expect(await screen.findByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(screen.queryByText("Aucun lien à traiter")).toBeNull();
});

it("presents a successful empty selection without a failed-read message", async () => {
  // Given
  queueEmpty = true;

  // When
  await mount(<ModerationScreen filters={{}} />);

  // Then
  expect(await screen.findByText("Aucun lien à traiter")).toBeOnTheScreen();
  expect(screen.queryByText("Une erreur est survenue")).toBeNull();
});

it("retains literal filters on continuation and restarts native refresh at page zero", async () => {
  // Given
  queuePaged = true;
  const filters = {
    query: "Club %_",
    seasonId: sporting.pool.season.id,
    platform: "twitch",
    state: "all",
  } as const;
  await mount(<ModerationScreen filters={filters} />);
  const user = userEvent.setup();
  await screen.findByRole("link", {
    name: `${detail.match.home.name} – ${detail.match.away.name}`,
  });

  // When
  await user.press(screen.getByRole("button", { name: "Matchs suivants" }));
  await screen.findByText("Second match");
  // userEvent does not synthesize the native pull-to-refresh gesture.
  fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await waitFor(() => expect(screen.queryByText("Second match")).toBeNull());
  const calls = mockFetch.mock.calls
    .filter(([url]) => String(url).includes("/stream-moderation"))
    .map(([url]) => new URL(String(url)));
  expect(calls.map((url) => url.searchParams.get("page"))).toEqual([
    "0",
    "1",
    "0",
  ]);
  for (const url of calls) {
    expect(url.searchParams.get("query")).toBe(filters.query);
    expect(url.searchParams.get("seasonId")).toBe(filters.seasonId);
    expect(url.searchParams.get("platform")).toBe("twitch");
    expect(url.searchParams.get("state")).toBe("all");
  }
});

it("preserves a dirty moderator draft and its original revision across refetch and refused publication", async () => {
  // Given
  detail = {
    ...detail,
    canPublish: true,
    match: { ...detail.match, publiclyViewable: true },
  };
  const alert = jest.spyOn(Alert, "alert");
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  const user = userEvent.setup();
  await user.press(await screen.findByRole("button", { name: "Remplacer" }));
  await user.clear(screen.getByLabelText("Adresse du lien vidéo"));
  await user.type(
    screen.getByLabelText("Adresse du lien vidéo"),
    "https://youtu.be/dirty",
  );
  detail = { ...detail, revision: "newer:2" };
  fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await waitFor(() => expect(client.isFetching()).toBe(0));
  writeStatus = 409;

  // When
  await user.press(screen.getByRole("button", { name: "Publier" }));
  await act(async () => {
    alert.mock.calls
      .at(-1)?.[2]
      ?.find((button) => button.text === "Publier")
      ?.onPress?.();
  });

  // Then
  await waitFor(() =>
    expect(writes).toEqual([
      {
        actorAccountId: accountResponse().accountId,
        revision: "viewed:1",
        url: "https://youtu.be/dirty",
      },
    ]),
  );
  expect(screen.getByDisplayValue("https://youtu.be/dirty")).toBeOnTheScreen();
  await waitFor(() => expect(client.isMutating()).toBe(0));
  expect(writes).toHaveLength(1);
});

it("keeps acknowledged success when the dependent history read fails", async () => {
  // Given
  failAfterWrite = true;
  const alert = jest.spyOn(Alert, "alert");
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  await screen.findByText("https://youtu.be/retained");
  const user = userEvent.setup();

  // When
  await user.press(screen.getByRole("button", { name: "Retirer" }));
  await act(async () => {
    alert.mock.calls
      .at(-1)?.[2]
      ?.find((button) => button.text === "Retirer")
      ?.onPress?.();
  });

  // Then
  expect(await screen.findByText("Décision confirmée")).toBeOnTheScreen();
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(screen.getByText("Décision confirmée")).toBeOnTheScreen();
  expect(writes).toHaveLength(1);
});

it("does not dispatch a cancelled exact-version confirmation", async () => {
  // Given
  const alert = jest.spyOn(Alert, "alert");
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  await screen.findByText("https://youtu.be/retained");
  const user = userEvent.setup();

  // When
  await user.press(screen.getByRole("button", { name: "Retirer" }));
  await act(async () => {
    alert.mock.calls
      .at(-1)?.[2]
      ?.find((button) => button.style === "cancel")
      ?.onPress?.();
  });

  // Then
  expect(writes).toHaveLength(0);
  expect(screen.getByText("https://youtu.be/retained")).toBeOnTheScreen();
});
