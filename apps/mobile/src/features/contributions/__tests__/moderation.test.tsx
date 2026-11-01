import { useLayoutEffect, type PropsWithChildren } from "react";
import "../../../shared/native/test-support/tab-view-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  getListModeratedStreamContributionsQueryKey,
  getListStreamModerationQueryKey,
  getGetMyAccountQueryKey,
} from "../../../../.generated/mobile";
import {
  useModerationQueue,
  useModerationMatch,
  useModerationReports,
} from "../api/moderation";
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
import { ModerationFilters } from "../components/moderation-filters";
import { ModerationVersionSheet } from "../components/moderation-version-sheet";
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
  useRouter: () => ({
    push: mockPush,
    dismissTo: mockDismissTo,
    setParams: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  }),
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
const mockDismissTo = jest.fn();
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
let historyPaged = false;
let reportsPaged = false;
let continuationFails = false;
let profileFails = false;
let reportReason: string | null = null;
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
  historyPaged = false;
  reportsPaged = false;
  continuationFails = false;
  profileFails = false;
  reportReason = null;
  mockPush.mockReset();
  mockDismissTo.mockReset();
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
      return profileFails
        ? Response.json({ title: "Unavailable", status: 503 }, { status: 503 })
        : Response.json(
            accountResponse({
              permissions: { moderateStreamLinks: permission },
            }),
          );
    const page = new URL(String(url)).searchParams.get("page");
    if (page === "1" && continuationFails)
      return Response.json(
        { title: "Unavailable", status: 503 },
        { status: 503 },
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
        seasons: [sporting.pool.season],
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
        count: reportsPaged ? 21 : 1,
        items: [
          {
            id: "00000000-0000-4000-8000-000000000010",
            reportedAt: "2026-10-24T12:00:00Z",
            reason:
              reportsPaged && page === "1"
                ? "Historique de la seconde page"
                : reportReason,
          },
        ],
        ...(reportsPaged && page !== "1" ? { nextPage: 1 } : {}),
      });
    return Response.json({
      ...detail,
      ...(historyPaged && page === "1"
        ? {
            items: [
              version({
                id: "00000000-0000-4000-8000-000000000600",
                url: "https://youtu.be/second-history",
                platform: "youtube",
                state: "superseded",
                canApprove: false,
                canReject: false,
                canReactivate: true,
              }),
            ],
          }
        : {}),
      ...(historyPaged && page !== "1" ? { nextPage: 1 } : {}),
    });
  });
});
afterEach(async () => {
  await act(async () => {
    await client.cancelQueries();
    await cleanup();
  });
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>,
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
  expect(
    screen.getByDisplayValue("https://youtu.be/retained"),
  ).toBeOnTheScreen();
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
  await screen.findByDisplayValue("https://youtu.be/retained");
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
  await screen.findByDisplayValue("https://youtu.be/retained");
  const user = userEvent.setup();
  await user.press(screen.getByRole("tab", { name: "Historique" }));
  await user.press(
    await screen.findByRole("button", { name: /Twitch, Masqué/ }),
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
  await screen.findByRole("link", {
    name: `${detail.match.home.name} – ${detail.match.away.name}`,
  });

  // When
  fireEvent(
    screen.getByLabelText("File de modération des liens"),
    "endReached",
  );
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
  await screen.findByLabelText("Adresse du lien");
  await user.clear(screen.getByLabelText("Adresse du lien"));
  await user.type(
    screen.getByLabelText("Adresse du lien"),
    "https://youtu.be/dirty",
  );
  detail = { ...detail, revision: "newer:2" };
  await act(async () => {
    await client.invalidateQueries({
      queryKey: getListModeratedStreamContributionsQueryKey(sporting.id, {
        state: "active",
      }),
      exact: true,
    });
  });
  await waitFor(() => expect(client.isFetching()).toBe(0));
  writeStatus = 409;

  // When
  await user.press(screen.getByRole("button", { name: "Remplacer le lien" }));
  await act(async () => {
    alert.mock.calls
      .at(-1)?.[2]
      ?.find((button) => button.text === "Remplacer le lien")
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
  await screen.findByDisplayValue("https://youtu.be/retained");
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
  await screen.findByDisplayValue("https://youtu.be/retained");
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
  expect(
    screen.getByDisplayValue("https://youtu.be/retained"),
  ).toBeOnTheScreen();
});

it("does not restore private content from a late concurrent response after refusal", async () => {
  // Given: two real moderation observers have independent in-flight HTTP reads.
  const ordinary = mockFetch.getMockImplementation()!;
  let finishQueue!: (response: Response) => void;
  let finishDetail!: (response: Response) => void;
  const queue = new Promise<Response>((resolve) => {
    finishQueue = resolve;
  });
  const heldDetail = new Promise<Response>((resolve) => {
    finishDetail = resolve;
  });
  mockFetch.mockImplementation((url, init) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("/stream-moderation")) return queue;
    if (path.includes("/stream-contributions")) return heldDetail;
    return ordinary(url, init);
  });
  /** Real feature observers share only the existing private QueryClient; both transports are held. */
  function ConcurrentReads() {
    useModerationQueue({});
    useModerationMatch(sporting.id, "active");
    return null;
  }
  await mount(<ConcurrentReads />);
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        String(url).includes("/administration/"),
      ).length,
    ).toBe(2),
  );

  // When: refusal settles before a different read's transport delivers its old success.
  await act(async () => {
    finishQueue(
      Response.json({ title: "Forbidden", status: 403 }, { status: 403 }),
    );
  });
  await waitFor(() =>
    expect(
      client.getQueryState(getListStreamModerationQueryKey({}))?.status,
    ).toBe("error"),
  );
  await act(async () => {
    finishDetail(Response.json(detail));
  });

  // Then
  await waitFor(() => expect(client.isFetching()).toBe(0));
  expect(
    client.getQueryData(
      getListModeratedStreamContributionsQueryKey(sporting.id, {
        state: "active",
      }),
    ),
  ).toBeUndefined();
});

it("keeps the mounted dirty publication editor across an uncached tab read", async () => {
  // Given
  detail = {
    ...detail,
    canPublish: true,
    match: { ...detail.match, publiclyViewable: true },
  };
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  const user = userEvent.setup();
  await screen.findByLabelText("Adresse du lien");
  await user.clear(screen.getByLabelText("Adresse du lien"));
  await user.type(
    screen.getByLabelText("Adresse du lien"),
    "https://youtu.be/tab-draft",
  );

  // When
  await user.press(screen.getByRole("tab", { name: "Propositions (1)" }));
  await screen.findByText("https://twitch.tv/review_link");

  await user.press(screen.getByRole("tab", { name: "Actif" }));

  // Then
  expect(
    screen.getByDisplayValue("https://youtu.be/tab-draft"),
  ).toBeOnTheScreen();
});

it.each(["queue", "versions", "reports"] as const)(
  "keeps loaded %s content and presents a failed continuation",
  async (kind) => {
    // Given
    queuePaged = kind === "queue";
    historyPaged = kind === "versions";
    reportsPaged = kind === "reports";
    continuationFails = true;
    if (kind !== "queue")
      detail.items = [
        version({
          state: "hidden",
          reportCount: 21,
          canApprove: false,
          canReject: false,
        }),
      ];
    await mount(
      kind === "queue" ? (
        <ModerationScreen filters={{}} />
      ) : (
        <ModerationMatchScreen matchId={sporting.id} />
      ),
    );
    const user = userEvent.setup();
    if (kind !== "queue") {
      await user.press(await screen.findByRole("tab", { name: "Historique" }));
      if (kind === "reports") {
        await user.press(
          await screen.findByRole("button", { name: /Twitch, Masqué/ }),
        );
        await user.press(
          await screen.findByRole("button", { name: "Signalements (21)" }),
        );
        await screen.findByText("Motif indisponible");
      }
    }
    // When
    if (kind === "reports")
      await user.press(
        screen.getByRole("button", { name: "Signalements suivants" }),
      );
    else
      fireEvent(
        await screen.findByLabelText(
          kind === "queue"
            ? "File de modération des liens"
            : "Historique des liens",
        ),
        "endReached",
      );

    // Then
    expect(await screen.findByRole("alert")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: kind === "reports" ? "Signalements suivants" : "Réessayer",
      }),
    ).toBeOnTheScreen();
    if (kind === "queue")
      expect(
        screen.getByRole("link", {
          name: `${detail.match.home.name} – ${detail.match.away.name}`,
        }),
      ).toBeOnTheScreen();
    else if (kind === "reports")
      expect(screen.getByText("Motif indisponible")).toBeOnTheScreen();
    else
      expect(
        screen.getByRole("button", { name: /Twitch, Masqué/ }),
      ).toBeOnTheScreen();
  },
);

it("does not announce a failed continuation after leaving its retained scene", async () => {
  // Given: the real history scene owns a pending HTTP continuation.
  historyPaged = true;
  detail.items = [
    version({ state: "hidden", canApprove: false, canReject: false }),
  ];
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  const user = userEvent.setup();
  await user.press(await screen.findByRole("tab", { name: "Historique" }));
  await screen.findByRole("button", { name: /Twitch, Masqué/ });
  const ordinary = mockFetch.getMockImplementation()!;
  let finish!: (response: Response) => void;
  const held = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  mockFetch.mockImplementation((url, init) => {
    const requested = new URL(String(url));
    return requested.pathname.endsWith("/stream-contributions") &&
      requested.searchParams.get("page") === "1"
      ? held
      : ordinary(url, init);
  });
  const key = getListModeratedStreamContributionsQueryKey(sporting.id, {
    state: "historical",
  });

  try {
    // When: the person returns to the editor before the history request fails.
    await fireEvent(
      screen.getByLabelText("Historique des liens"),
      "endReached",
    );
    await waitFor(() =>
      expect(client.getQueryState(key)?.fetchStatus).toBe("fetching"),
    );
    await user.press(screen.getByRole("tab", { name: "Actif" }));
    await screen.findByRole("tab", { name: "Actif", selected: true });
  } finally {
    await act(async () => {
      finish(
        Response.json({ title: "Unavailable", status: 503 }, { status: 503 }),
      );
    });
  }

  // Then: the inactive error remains with its Query and does not become the editor's toast.
  await waitFor(() => expect(client.getQueryState(key)?.status).toBe("error"));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(
    screen.getByRole("tab", { name: "Actif", selected: true }),
  ).toBeOnTheScreen();
});

it("applies the native filter draft only explicitly and retains literal search", async () => {
  // Given
  await mount(
    <ModerationFilters initial={{ query: "Club %_", state: "all" }} />,
  );
  const user = userEvent.setup();
  await user.press(await screen.findByRole("button", { name: "Saison" }));

  // When
  await user.press(
    await screen.findByRole("radio", { name: sporting.pool.season.label }),
  );
  expect(mockDismissTo).not.toHaveBeenCalled();
  await user.press(
    screen.getByRole("button", { name: "Appliquer les filtres" }),
  );

  // Then
  expect(mockDismissTo).toHaveBeenCalledWith({
    pathname: "/administration/stream-links",
    params: {
      query: "Club %_",
      seasonId: sporting.pool.season.id,
      platform: "",
      state: "all",
    },
  });
});

it.each([
  {
    label: "Approuver",
    action: "approve",
    state: "pending",
    tab: "Propositions (1)",
  },
  { label: "Retirer", action: "withdraw", state: "active", tab: "Actif" },
  {
    label: "Réactiver",
    action: "reactivate",
    state: "rejected",
    tab: "Historique",
  },
] as const)(
  "dispatches one exact explicitly confirmed $action command",
  async ({ label, action, state, tab }) => {
    // Given
    const target = version({
      state,
      canApprove: action === "approve",
      canReject: action === "approve",
      canWithdraw: action === "withdraw",
      canReactivate: action === "reactivate",
    });
    detail = {
      ...detail,
      canPublish: true,
      items: [target],
      ...(state === "active" ? { activeContribution: target } : {}),
    };
    const alert = jest.spyOn(Alert, "alert");
    await mount(<ModerationMatchScreen matchId={sporting.id} />);
    const user = userEvent.setup();
    await user.press(await screen.findByRole("tab", { name: tab }));
    if (action === "reactivate")
      await user.press(
        await screen.findByRole("button", { name: "Twitch, Refusé" }),
      );

    // When
    await user.press(await screen.findByRole("button", { name: label }));
    expect(writes).toHaveLength(0);
    await act(async () => {
      alert.mock.calls
        .at(-1)?.[2]
        ?.find((button) => button.text === label)
        ?.onPress?.();
    });

    // Then
    await screen.findByText("Décision confirmée");
    expect(writes).toEqual([
      {
        actorAccountId: accountResponse().accountId,
        revision: "viewed:1",
        ...(action === "reactivate" ? {} : { action }),
      },
    ]);
    expect(
      mockFetch.mock.calls.some(
        ([url, init]) =>
          String(url).endsWith(
            `/stream-contributions/${versionId}${action === "reactivate" ? "/reactivations" : ""}`,
          ) && init?.method === (action === "reactivate" ? "POST" : "PATCH"),
      ),
    ).toBe(true);
  },
);

it("continues historical versions without losing the loaded source page", async () => {
  // Given
  historyPaged = true;
  detail.items = [
    version({
      state: "rejected",
      canApprove: false,
      canReject: false,
      canReactivate: true,
    }),
  ];
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  const user = userEvent.setup();
  await user.press(await screen.findByRole("tab", { name: "Historique" }));

  // When
  fireEvent(screen.getByLabelText("Historique des liens"), "endReached");

  // Then
  expect(
    await screen.findByRole("button", {
      name: "YouTube, Proposition remplacée",
    }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Twitch, Refusé" }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) => {
      const request = new URL(String(url));
      return (
        request.searchParams.get("state") === "historical" &&
        request.searchParams.get("page") === "1"
      );
    }),
  ).toBe(true);
});

it("pages exact-version reports while rendering only the selected page", async () => {
  // Given
  reportsPaged = true;
  detail.activeContribution = version({
    state: "active",
    reportCount: 21,
    canApprove: false,
    canReject: false,
    canWithdraw: true,
  });
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("button", { name: "Signalements (21)" }),
  );
  await screen.findByText("Motif indisponible");

  // When
  await user.press(
    screen.getByRole("button", { name: "Signalements suivants" }),
  );

  // Then
  expect(
    await screen.findByText("Historique de la seconde page"),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Motif indisponible")).toBeNull();
  await user.press(
    screen.getByRole("button", { name: "Signalements précédents" }),
  );
  expect(await screen.findByText("Motif indisponible")).toBeOnTheScreen();
});

it("does not poll the mounted private queue", async () => {
  jest.useFakeTimers();
  try {
    // Given
    await mount(<ModerationScreen filters={{}} />);
    await screen.findByRole("link", {
      name: `${detail.match.home.name} – ${detail.match.away.name}`,
    });
    const initialReads = mockFetch.mock.calls.filter(([url]) =>
      String(url).includes("/stream-moderation"),
    ).length;

    // When
    await act(async () => {
      await jest.advanceTimersByTimeAsync(300_000);
    });

    // Then
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        String(url).includes("/stream-moderation"),
      ),
    ).toHaveLength(initialReads);
  } finally {
    await cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  }
});

it("retains an editable draft and authorized context through an ordinary F05 outage", async () => {
  // Given
  detail = { ...detail, canPublish: true };
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  const user = userEvent.setup();
  await user.clear(await screen.findByLabelText("Adresse du lien"));
  await user.type(
    screen.getByLabelText("Adresse du lien"),
    "https://youtu.be/profile-outage",
  );

  // When
  profileFails = true;
  await act(async () => {
    await client.invalidateQueries({ queryKey: getGetMyAccountQueryKey() });
  });
  await screen.findByRole("button", { name: "Réessayer le profil" });

  // Then
  expect(
    screen.getByDisplayValue("https://youtu.be/profile-outage"),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Remplacer le lien" }),
  ).toBeDisabled();
  profileFails = false;
  await user.press(screen.getByRole("button", { name: "Réessayer le profil" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Réessayer le profil" }),
    ).toBeNull(),
  );
  expect(
    screen.getByDisplayValue("https://youtu.be/profile-outage"),
  ).toBeOnTheScreen();
});

it("presents an explicit refusal on another already loaded moderation screen", async () => {
  // Given: the report reader and visible queue share only the existing native private cache.
  const ordinary = mockFetch.getMockImplementation()!;
  let finish!: (response: Response) => void;
  const held = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  mockFetch.mockImplementation((url, init) =>
    String(url).endsWith("/reports?page=0") ? held : ordinary(url, init),
  );
  /** Keeps the refusing HTTP resource observed without inventing a second presentation store. */
  function ReportReader() {
    useModerationReports(sporting.id, versionId, true);
    return null;
  }
  await mount(
    <>
      <ModerationScreen filters={{}} />
      <ReportReader />
    </>,
  );
  await screen.findByRole("link", {
    name: `${detail.match.home.name} – ${detail.match.away.name}`,
  });

  // When
  await act(async () => {
    finish(Response.json({ title: "Forbidden", status: 403 }, { status: 403 }));
  });

  // Then
  expect(await screen.findByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();
  expect(screen.queryByText("Aucun lien à traiter")).toBeNull();
});

it("rereads open report reasons during the ordinary match refresh even when their total is unchanged", async () => {
  // Given: the fictional HTTP erasure changes only the nullable reason, not its counted fact.
  reportReason = "Avant effacement";
  detail.activeContribution = version({
    state: "active",
    reportCount: 1,
    canApprove: false,
    canReject: false,
    canWithdraw: true,
  });
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("button", { name: "Signalements (1)" }),
  );
  await screen.findByText("Avant effacement");

  // When
  reportReason = null;
  fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(await screen.findByText("Motif indisponible")).toBeOnTheScreen();
  expect(screen.queryByText("Avant effacement")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Signalements (1)" }),
  ).toBeOnTheScreen();
});

it("accepts the same native pager settlement used by a swipe and retains the inactive editor", async () => {
  // Given
  detail = { ...detail, canPublish: true };
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  const user = userEvent.setup();
  await user.clear(await screen.findByLabelText("Adresse du lien"));
  await user.type(
    screen.getByLabelText("Adresse du lien"),
    "https://youtu.be/swipe-draft",
  );

  // When: iOS confirms the page's terminal zero offset and idle state after its selected event.
  await fireEvent(screen.getByTestId("native-tabs-pager"), "pageSelected", {
    nativeEvent: { position: 2 },
  });
  await fireEvent(screen.getByTestId("native-tabs-pager"), "pageScroll", {
    nativeEvent: { position: 2, offset: 0 },
  });
  await fireEvent(
    screen.getByTestId("native-tabs-pager"),
    "pageScrollStateChanged",
    {
      nativeEvent: { pageScrollState: "idle" },
    },
  );
  await screen.findByRole("tab", { name: "Historique", selected: true });
  await user.press(screen.getByRole("tab", { name: "Actif" }));

  // Then
  expect(
    await screen.findByDisplayValue("https://youtu.be/swipe-draft"),
  ).toBeOnTheScreen();
});

it("starts a replacement member's report disclosure on its own first page", async () => {
  // Given: the outgoing active member has an open second report page.
  reportsPaged = true;
  detail.activeContribution = version({
    state: "active",
    reportCount: 21,
    canApprove: false,
    canReject: false,
    canWithdraw: true,
  });
  const ordinary = mockFetch.getMockImplementation()!;
  const replacementId = "00000000-0000-4000-8000-000000000601";
  mockFetch.mockImplementation((url, init) =>
    String(url).includes(`/${replacementId}/reports`)
      ? Promise.resolve(Response.json({ count: 0, items: [] }))
      : ordinary(url, init),
  );
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("button", { name: "Signalements (21)" }),
  );
  await user.press(
    await screen.findByRole("button", { name: "Signalements suivants" }),
  );
  await screen.findByText("Historique de la seconde page");

  // When: a subsequent authorized read selects a different exact active member.
  detail = {
    ...detail,
    revision: "new:2",
    activeContribution: version({
      id: replacementId,
      state: "active",
      reportCount: 0,
      canApprove: false,
      canReject: false,
      canWithdraw: true,
    }),
  };
  fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await user.press(
    await screen.findByRole("button", { name: "Signalements (0)" }),
  );

  // Then
  expect(await screen.findByText("Aucun signalement")).toBeOnTheScreen();
  expect(screen.queryByText("Historique de la seconde page")).toBeNull();
});

it.each(["queue", "active", "pending"] as const)(
  "does not animate a pull-to-refresh for a background %s read",
  async (kind) => {
    // Given: a loaded native scene stays visible while its ordinary Query data is reread.
    if (kind === "active")
      detail = {
        ...detail,
        canPublish: true,
        match: { ...detail.match, publiclyViewable: true },
      };
    await mount(
      kind === "queue" ? (
        <ModerationScreen filters={{}} />
      ) : (
        <ModerationMatchScreen matchId={sporting.id} />
      ),
    );
    const user = userEvent.setup();
    if (kind === "pending")
      await user.press(
        await screen.findByRole("tab", { name: "Propositions (1)" }),
      );
    await screen.findByLabelText("Actualiser les données");
    if (kind === "active")
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Remplacer le lien" }),
        ).toBeEnabled(),
      );
    const key =
      kind === "queue"
        ? getListStreamModerationQueryKey({ state: "to-review" })
        : getListModeratedStreamContributionsQueryKey(sporting.id, {
            state: kind,
          });
    const ordinary = mockFetch.getMockImplementation()!;
    const response = await ordinary(
      `https://api.example.invalid${key[0]}`,
      undefined,
    );
    let finish!: (response: Response) => void;
    const held = new Promise<Response>((resolve) => {
      finish = resolve;
    });
    mockFetch.mockImplementation((url, init) =>
      new URL(String(url)).pathname === key[0] ? held : ordinary(url, init),
    );
    let reading: Promise<void> | undefined;
    try {
      // When: this is a read lifecycle event, not the user's native refresh gesture.
      await act(async () => {
        reading = client.invalidateQueries({ queryKey: key, exact: true });
      });
      await waitFor(() =>
        expect(client.getQueryState(key)?.fetchStatus).toBe("fetching"),
      );
      if (kind === "active")
        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: "Remplacer le lien" }),
          ).toBeDisabled(),
        );

      // Then
      expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy();
    } finally {
      await act(async () => {
        finish(response);
        await reading;
      });
    }
  },
);

it("animates native pull-to-refresh only for the explicit gesture and releases it after the read", async () => {
  // Given
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  await screen.findByLabelText("Actualiser les données");
  const ordinary = mockFetch.getMockImplementation()!;
  let finish!: (response: Response) => void;
  const held = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  mockFetch.mockImplementation((url, init) =>
    String(url).includes("/stream-contributions") ? held : ordinary(url, init),
  );

  // When
  fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await waitFor(() =>
    expect(screen.getByLabelText("Actualiser les données")).toBeBusy(),
  );
  await act(async () => {
    finish(Response.json(detail));
  });
  await waitFor(() =>
    expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy(),
  );
});

it("keeps a conflicted draft but adopts the current viewed address/revision after explicit refresh", async () => {
  // Given: background reads must not silently rebase a dirty command.
  detail = { ...detail, canPublish: true };
  const alert = jest.spyOn(Alert, "alert");
  const draft = "https://youtu.be/intentional-new-decision";
  const ordinary = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation(async (url, init) => {
    const response = await ordinary(url, init);
    return init?.method === "POST" && response.ok
      ? Response.json({
          revision: "accepted:3",
          contribution: version({
            url: draft,
            state: "active",
            canApprove: false,
            canReject: false,
            canWithdraw: true,
          }),
        })
      : response;
  });
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  const user = userEvent.setup();
  await user.clear(await screen.findByLabelText("Adresse du lien"));
  await user.type(screen.getByLabelText("Adresse du lien"), draft);
  detail = {
    ...detail,
    revision: "current:2",
    activeContribution: version({
      id: "00000000-0000-4000-8000-000000000777",
      url: "https://twitch.tv/newly-viewed",
      state: "active",
      canApprove: false,
      canReject: false,
      canWithdraw: true,
    }),
  };
  writeStatus = 409;
  await user.press(screen.getByRole("button", { name: "Remplacer le lien" }));
  await act(async () => {
    alert.mock.calls
      .at(-1)?.[2]
      ?.find((button) => button.text === "Remplacer le lien")
      ?.onPress?.();
  });
  await waitFor(() => expect(writes).toHaveLength(1));
  await waitFor(() =>
    expect(client.isFetching() + client.isMutating()).toBe(0),
  );

  // When: the user explicitly reads the current context before a new intentional confirmation.
  fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Remplacer le lien" }),
    ).toBeEnabled(),
  );
  expect(screen.getByDisplayValue(draft)).toBeOnTheScreen();
  writeStatus = 200;
  await user.press(screen.getByRole("button", { name: "Remplacer le lien" }));
  expect(alert.mock.calls.at(-1)?.[1]).toBe(
    `https://twitch.tv/newly-viewed\n\nNouveau lien : ${draft}`,
  );
  await act(async () => {
    alert.mock.calls
      .at(-1)?.[2]
      ?.find((button) => button.text === "Remplacer le lien")
      ?.onPress?.();
  });

  // Then: the old attempt stays old, while the deliberate new action uses its newly viewed baseline.
  expect(await screen.findByText("Décision confirmée")).toBeOnTheScreen();
  expect(writes).toEqual([
    {
      actorAccountId: accountResponse().accountId,
      revision: "viewed:1",
      url: draft,
    },
    {
      actorAccountId: accountResponse().accountId,
      revision: "current:2",
      url: draft,
    },
  ]);
});

it("opens each exact lineage member when retained versions share the same address", async () => {
  // Given
  const sourceId = "00000000-0000-4000-8000-000000000771";
  const replacementId = "00000000-0000-4000-8000-000000000772";
  detail.items = [
    version({
      state: "replaced",
      sourceVersionId: sourceId,
      replacedByVersionId: replacementId,
      canApprove: false,
      canReject: false,
    }),
  ];
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  const user = userEvent.setup();
  await user.press(await screen.findByRole("tab", { name: "Historique" }));
  await user.press(
    await screen.findByRole("button", { name: "Twitch, Lien remplacé" }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Version d’origine" }));
  await user.press(
    screen.getByRole("button", { name: "Version de remplacement" }),
  );

  // Then
  expect(mockPush.mock.calls.map(([destination]) => destination)).toEqual([
    {
      pathname: "/administration/stream-links/version",
      params: { matchId: sporting.id, versionId: sourceId, relation: "source" },
    },
    {
      pathname: "/administration/stream-links/version",
      params: {
        matchId: sporting.id,
        versionId: replacementId,
        relation: "replacement",
      },
    },
  ]);
});

it("reads the exact off-page source and its reports in the read-only related-version sheet", async () => {
  // Given: equal addresses do not identify a retained version.
  const sourceId = "00000000-0000-4000-8000-000000000771";
  const ordinary = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation((url, init) =>
    new URL(String(url)).pathname.endsWith(`/stream-contributions/${sourceId}`)
      ? Promise.resolve(
          Response.json({
            revision: "current:2",
            contribution: version({
              id: sourceId,
              state: "hidden",
              authorName: "Source historique exacte",
              reportCount: 1,
              canApprove: false,
              canReject: false,
              canReactivate: true,
            }),
          }),
        )
      : ordinary(url, init),
  );

  // When
  await mount(
    <ModerationVersionSheet
      matchId={sporting.id}
      versionId={sourceId}
      relation="source"
    />,
  );
  await userEvent.press(
    await screen.findByRole("button", { name: "Signalements (1)" }),
  );

  // Then
  expect(await screen.findByText("Motif indisponible")).toBeOnTheScreen();
  expect(screen.getByText("Source historique exacte")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Réactiver" })).toBeNull();
  expect(
    mockFetch.mock.calls.some(([url]) =>
      String(url).endsWith(`/${sourceId}/reports?page=0`),
    ),
  ).toBe(true);
});

it.each([
  "queue",
  "active",
  "pending",
  "filters",
  "version",
  "reports",
] as const)(
  "shows a content skeleton rather than loading text for the initial %s read",
  async (kind) => {
    // Given: only HTTP completion is held; the real providers, Query and screen rendering stay in place.
    const ordinary = mockFetch.getMockImplementation()!;
    let finish!: (response: Response) => void;
    let response: Response | undefined;
    const held = new Promise<Response>((resolve) => {
      finish = resolve;
    });
    let requested = false;
    mockFetch.mockImplementation(async (url, init) => {
      const address = new URL(String(url));
      const target =
        kind === "queue" || kind === "filters"
          ? address.pathname.endsWith("/stream-moderation")
          : kind === "reports"
            ? address.pathname.endsWith("/reports")
            : kind === "version"
              ? address.pathname.endsWith(`/stream-contributions/${versionId}`)
              : address.pathname.endsWith("/stream-contributions") &&
                address.searchParams.get("state") === kind;
      if (!target) return ordinary(url, init);
      requested = true;
      response =
        kind === "version"
          ? Response.json({ revision: "viewed:1", contribution: version() })
          : await ordinary(url, init);
      return held;
    });
    const label =
      kind === "queue"
        ? "Chargement de la file de modération"
        : kind === "filters"
          ? "Chargement des filtres des liens"
          : kind === "version"
            ? "Chargement de la version du lien"
            : kind === "reports"
              ? "Chargement des signalements"
              : "Chargement des liens du match";
    try {
      // When
      await mount(
        kind === "queue" ? (
          <ModerationScreen filters={{}} />
        ) : kind === "filters" ? (
          <ModerationFilters initial={{}} />
        ) : kind === "version" ? (
          <ModerationVersionSheet matchId={sporting.id} versionId={versionId} />
        ) : (
          <ModerationMatchScreen matchId={sporting.id} />
        ),
      );
      const user = userEvent.setup();
      if (kind === "pending")
        await user.press(
          await screen.findByRole("tab", { name: "Propositions (1)" }),
        );
      if (kind === "reports")
        await user.press(
          await screen.findByRole("button", { name: "Signalements (0)" }),
        );
      await waitFor(() => expect(requested).toBe(true));

      // Then: the single accessible pending announcement surrounds decorative, noninteractive shapes.
      expect(
        await screen.findByRole("progressbar", { name: label }),
      ).toBeBusy();
      expect(screen.queryByText("Chargement en cours")).toBeNull();
      expect(writes).toHaveLength(0);
    } finally {
      await act(async () => {
        finish(response!);
      });
    }
    await waitFor(() =>
      expect(screen.queryByRole("progressbar", { name: label })).toBeNull(),
    );
  },
);
