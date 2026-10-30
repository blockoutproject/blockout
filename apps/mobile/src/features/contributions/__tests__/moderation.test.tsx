import { useLayoutEffect, type PropsWithChildren } from "react";
import {
  getListModeratedStreamContributionsQueryKey,
  getListStreamModerationQueryKey,
} from "../../../../.generated/mobile";
import { useModerationQueue, useModerationMatch } from "../api/moderation";
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
      return Response.json(
        accountResponse({ permissions: { moderateStreamLinks: permission } }),
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
                : null,
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
  await user.press(await screen.findByRole("button", { name: "Remplacer" }));
  await user.clear(screen.getByLabelText("Adresse du lien vidéo"));
  await user.type(
    screen.getByLabelText("Adresse du lien vidéo"),
    "https://youtu.be/tab-draft",
  );

  // When
  await user.press(screen.getByRole("tab", { name: "Propositions (1)" }));
  await screen.findByText("https://twitch.tv/review_link");

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
          await screen.findByRole("button", { name: /Twitch · Masqué/ }),
        );
        await user.press(
          await screen.findByRole("button", { name: "Signalements (21)" }),
        );
        await screen.findByText("Motif indisponible");
      }
    }
    const label = {
      queue: "Matchs suivants",
      versions: "Versions suivantes",
      reports: "Signalements suivants",
    }[kind];

    // When
    await user.press(await screen.findByRole("button", { name: label }));

    // Then
    expect(await screen.findByRole("alert")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: label })).toBeOnTheScreen();
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
        screen.getByRole("button", { name: /Twitch · Masqué/ }),
      ).toBeOnTheScreen();
  },
);

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
        await screen.findByRole("button", { name: "Twitch · Refusé" }),
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
  await user.press(
    await screen.findByRole("button", { name: "Versions suivantes" }),
  );

  // Then
  expect(
    await screen.findByRole("button", {
      name: "YouTube · Proposition remplacée",
    }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Twitch · Refusé" }),
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
