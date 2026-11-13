import { useLayoutEffect, type PropsWithChildren } from "react";
import { layoutNativeTabs } from "../../../shared/native/test-support/tab-view-native";
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
import { ModerationReportsScreen } from "../screens/moderation-reports-screen";
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

/** Models one moderation write at the HTTP boundary, including the scenario's refusal and reread outcome. */
function moderationWriteResponse(init: RequestInit) {
  writes.push(JSON.parse(String(init.body)));
  if (writeStatus >= 400) {
    return Response.json(
      {
        type: "urn:blockout:problem:conflict",
        title: "Conflict",
        status: writeStatus,
      },
      { status: writeStatus },
    );
  }
  if (failAfterWrite) {
    failRead = true;
  }
  return Response.json({
    revision: "accepted:2",
    contribution: detail.items[0],
  });
}

/** Builds the requested fictional queue page from the current scenario controls. */
function moderationQueueResponse(page: string | null) {
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

/** Builds the exact-version report page without hiding its scenario-specific reason. */
function moderationReportsResponse(page: string | null) {
  return Response.json({
    count: reportsPaged ? 21 : 1,
    items: [
      {
        id:
          page === "1"
            ? "00000000-0000-4000-8000-000000000011"
            : "00000000-0000-4000-8000-000000000010",
        reportedAt: "2026-10-24T12:00:00Z",
        reason:
          reportsPaged && page === "1"
            ? "Historique de la seconde page"
            : reportReason,
      },
    ],
    ...(reportsPaged && page !== "1" ? { nextPage: 1 } : {}),
  });
}

/** Builds the current exact-match versions page, with a separate historical continuation. */
function moderationVersionsResponse(page: string | null) {
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
}

/** Selects the real screen for each shared admission/loading scenario; providers remain owned by mount. */
function moderationView(
  kind: "queue" | "active" | "pending" | "filters" | "reports",
) {
  if (kind === "queue") {
    return <ModerationScreen filters={{}} />;
  }
  if (kind === "filters") {
    return <ModerationFilters initial={{}} />;
  }
  if (kind === "reports") {
    return (
      <ModerationReportsScreen matchId={sporting.id} versionId={versionId} />
    );
  }
  return <ModerationMatchScreen matchId={sporting.id} />;
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
    if (path.endsWith("/application-access")) {
      return Response.json(applicationAccessResponse());
    }
    if (path.endsWith("/me")) {
      return profileFails
        ? Response.json({ title: "Unavailable", status: 503 }, { status: 503 })
        : Response.json(
            accountResponse({
              permissions: { moderateStreamLinks: permission },
            }),
          );
    }
    const page = new URL(String(url)).searchParams.get("page");
    if (page === "1" && continuationFails) {
      return Response.json(
        { title: "Unavailable", status: 503 },
        { status: 503 },
      );
    }
    if (init?.method === "PATCH" || init?.method === "POST") {
      return moderationWriteResponse(init);
    }
    if (failRead) {
      return Response.json(
        {
          type: "urn:blockout:problem:unavailable",
          title: "Unavailable",
          status: 503,
        },
        { status: 503 },
      );
    }
    if (path.endsWith("/stream-moderation")) {
      return moderationQueueResponse(page);
    }
    if (path.endsWith("/reports")) {
      return moderationReportsResponse(page);
    }
    return moderationVersionsResponse(page);
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
function PrivateQueries({ children }: Readonly<PropsWithChildren>) {
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

/** Mounts a real feature screen in its providers and permits rerendering an exact route context. */
async function mount(children: React.ReactElement) {
  const view = await render(children, {
    wrapper: ({ children }) => (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={publicClient}>
            <ThemeProvider>
              <ApplicationAccessProvider>
                <AccountSessionProvider>
                  <PrivateQueries>
                    <AccountFeedbackProvider>
                      {children}
                    </AccountFeedbackProvider>
                  </PrivateQueries>
                </AccountSessionProvider>
              </ApplicationAccessProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    ),
  });
  await layoutNativeTabs();
  return view;
}

it.each(["queue", "active", "pending", "filters", "reports"] as const)(
  "recovers F05 initialization on the %s view without leaving disabled moderation reads in loading",
  async (surface) => {
    // Given
    jest
      .mocked(initializeV2Installation)
      .mockRejectedValueOnce(new Error("Unavailable"));
    const user = userEvent.setup();

    // When
    await mount(moderationView(surface));
    if (surface === "pending") {
      await user.press(screen.getByRole("tab", { name: /^Propositions/ }));
    }

    // Then
    expect(
      await screen.findByRole("alert", { name: "Une erreur est survenue" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.some(([url]) =>
        /stream-moderation|stream-contributions/.test(String(url)),
      ),
    ).toBe(false);
    expect(writes).toHaveLength(0);

    // When
    await user.press(screen.getByRole("button", { name: "Réessayer" }));
    // Initialization recovery remounts the native pager; its new instance needs native layout events again.
    await layoutNativeTabs();
    if (surface === "pending") {
      await user.press(screen.getByRole("tab", { name: /^Propositions/ }));
      await layoutNativeTabs();
    }

    // Then
    if (surface === "filters") {
      expect(
        await screen.findByRole("button", { name: "Saison" }),
      ).toBeOnTheScreen();
    } else if (surface === "active") {
      expect(await screen.findByLabelText("Adresse du lien")).toBeOnTheScreen();
    } else if (surface === "queue") {
      expect(await screen.findByText(sporting.home.name)).toBeOnTheScreen();
    } else if (surface === "reports") {
      expect(await screen.findByText("Motif indisponible")).toBeOnTheScreen();
    } else {
      expect(
        await screen.findByText("https://twitch.tv/review_link"),
      ).toBeOnTheScreen();
    }
    expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
    expect(writes).toHaveLength(0);
  },
);

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
  // Given: the retained private fixture has no public date, division or consultation permission.

  // When
  await mount(<ModerationMatchScreen matchId={sporting.id} />);

  // Then
  await screen.findByText("Match non consultable publiquement");
  expect(
    screen.getByRole("image", {
      name: `Logo absent : ${detail.match.pool.pool.name}`,
    }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) =>
      new URL(String(url)).pathname.endsWith("/logo"),
    ),
  ).toBe(false);
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

it("opens historical reports without replacing the expanded version context", async () => {
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
    await screen.findByRole("link", { name: "Signalements (1)" }),
  );

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/administration/stream-links/reports",
    params: { matchId: sporting.id, versionId },
  });
  expect(screen.getByRole("button", { name: "Réactiver" })).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(String(url)).pathname.endsWith("/reports"),
    ),
  ).toHaveLength(0);
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

it("reads reports from retained moderator authority after a technical account failure", async () => {
  // Given: the original account is established before its current profile reread fails.
  reportReason = "Controlled report reason";
  const view = await mount(<ModerationMatchScreen matchId={sporting.id} />);
  await screen.findByDisplayValue("https://youtu.be/retained");
  profileFails = true;
  await act(() =>
    client.refetchQueries({ queryKey: getGetMyAccountQueryKey(), exact: true }),
  );
  await screen.findByRole("button", { name: "Réessayer le profil" });

  // When
  await view.rerender(
    <ModerationReportsScreen matchId={sporting.id} versionId={versionId} />,
  );

  // Then
  expect(await screen.findByText("Controlled report reason")).toBeOnTheScreen();
  expect(
    screen.queryByRole("progressbar", { name: "Chargement des signalements" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).includes("/reports?")),
  ).toHaveLength(1);
});

it("shows a read error instead of a stale empty queue after a failed explicit refresh", async () => {
  // Given
  queueEmpty = true;
  const user = userEvent.setup();
  await mount(<ModerationScreen filters={{}} />);
  await screen.findByRole("header", { name: "Aucun lien à traiter" });

  // When
  failRead = true;
  await user.press(screen.getByRole("button", { name: "Actualiser" }));

  // Then
  expect(
    await screen.findByRole("button", { name: "Réessayer" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("header", { name: "Aucun lien à traiter" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).not.toBeOnTheScreen();
});

it("continues authorized report paging after a technical account failure", async () => {
  // Given
  reportsPaged = true;
  reportReason = "First authorized page";
  await mount(
    <ModerationReportsScreen matchId={sporting.id} versionId={versionId} />,
  );
  await screen.findByText("First authorized page");
  const requests = mockFetch.mock.calls.filter(([url]) =>
    String(url).includes("/reports?"),
  ).length;
  profileFails = true;
  await act(() =>
    client.refetchQueries({ queryKey: getGetMyAccountQueryKey(), exact: true }),
  );
  await screen.findByRole("button", { name: "Réessayer le profil" });

  // When
  await fireEvent(screen.getByTestId("moderation-reports-list"), "endReached");

  // Then
  expect(screen.getByText("First authorized page")).toBeOnTheScreen();
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([url]) => String(url).includes("/reports?")),
    ).toHaveLength(requests + 1),
  );
  expect(
    await screen.findByText("Historique de la seconde page"),
  ).toBeOnTheScreen();
});

it("reloads an empty queue from its card and restores native refresh only when rows return", async () => {
  // Given
  queueEmpty = true;

  // When
  await mount(<ModerationScreen filters={{}} />);

  // Then
  expect(await screen.findByText("Aucun lien à traiter")).toBeOnTheScreen();
  expect(screen.queryByText("Une erreur est survenue")).toBeNull();
  expect(screen.queryByLabelText("Actualiser les données")).toBeNull();

  // When
  queueEmpty = false;
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Actualiser" }));

  // Then
  expect(
    await screen.findByRole("link", {
      name: `${detail.match.home.name} – ${detail.match.away.name}`,
    }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy();
  expect(screen.queryByRole("button", { name: "Actualiser" })).toBeNull();
  expect(writes).toEqual([]);
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
  await fireEvent(
    screen.getByLabelText("File de modération des liens"),
    "endReached",
  );
  await screen.findByText("Second match");
  // Exercise the selected native refresh callback directly, without locating a ScrollView host.
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

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
    if (path.endsWith("/stream-moderation")) {
      return queue;
    }
    if (path.includes("/stream-contributions")) {
      return heldDetail;
    }
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

it.each(["queue", "versions"] as const)(
  "keeps loaded %s content and retries only its failed continuation",
  async (kind) => {
    // Given
    queuePaged = kind === "queue";
    historyPaged = kind === "versions";
    continuationFails = true;
    if (kind !== "queue") {
      detail.items = [
        version({
          state: "hidden",
          reportCount: 21,
          canApprove: false,
          canReject: false,
        }),
      ];
    }
    const view = await mount(
      kind === "queue" ? (
        <ModerationScreen filters={{}} />
      ) : (
        <ModerationMatchScreen matchId={sporting.id} />
      ),
    );
    const user = userEvent.setup();
    if (kind === "versions") {
      await user.press(await screen.findByRole("tab", { name: "Historique" }));
    }

    // When
    await fireEvent(
      await screen.findByLabelText(
        kind === "queue"
          ? "File de modération des liens"
          : "Historique des liens",
      ),
      "endReached",
    );

    // Then
    await screen.findByRole("button", { name: "Réessayer" });
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: "Réessayer",
      }),
    ).toBeOnTheScreen();
    if (kind === "queue") {
      expect(
        screen.getByRole("link", {
          name: `${detail.match.home.name} – ${detail.match.away.name}`,
        }),
      ).toBeOnTheScreen();
    } else {
      expect(
        screen.getByRole("button", { name: /Twitch, Masqué/ }),
      ).toBeOnTheScreen();
    }

    // When: returning to a retained tab observes its failed Query without rereading page zero.
    const queryKey =
      kind === "queue"
        ? getListStreamModerationQueryKey({ state: "to-review" })
        : getListModeratedStreamContributionsQueryKey(sporting.id, {
            state: "historical",
          });
    const target = String(queryKey[0]);
    const state = kind === "queue" ? "to-review" : "historical";
    const readsBeforeReturn = mockFetch.mock.calls.filter(([url]) => {
      const address = new URL(String(url));
      return (
        address.pathname === target &&
        address.searchParams.get("state") === state
      );
    }).length;
    if (kind === "queue") {
      await view.rerender(<ModerationScreen filters={{ state: "active" }} />);
      await view.rerender(<ModerationScreen filters={{}} />);
    } else {
      await user.press(screen.getByRole("tab", { name: "Actif" }));
      await user.press(screen.getByRole("tab", { name: "Historique" }));
    }

    // Then
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.filter(([url]) => {
        const address = new URL(String(url));
        return (
          address.pathname === target &&
          address.searchParams.get("state") === state
        );
      }),
    ).toHaveLength(readsBeforeReturn);

    // When: repeated native edges leave the failed page for explicit recovery.
    const list = screen.getByLabelText(
      kind === "queue"
        ? "File de modération des liens"
        : "Historique des liens",
    );
    await fireEvent(list, "endReached");
    await fireEvent(list, "endReached");

    // Then
    expect(
      mockFetch.mock.calls.filter(
        ([url]) => new URL(String(url)).searchParams.get("page") === "1",
      ),
    ).toHaveLength(1);

    // When: an unsuccessful explicit retry returns to the same footer.
    await user.press(screen.getByRole("button", { name: "Réessayer" }));
    await screen.findByRole("button", { name: "Réessayer" });

    // Then
    expect(list).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.filter(
        ([url]) => new URL(String(url)).searchParams.get("page") === "1",
      ),
    ).toHaveLength(2);

    // When
    continuationFails = false;
    await user.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    if (kind === "queue") {
      await screen.findByRole("link", { name: /^Second match/ });
    } else {
      await screen.findByRole("button", {
        name: /YouTube, Proposition remplacée/,
      });
    }
    expect(list).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Réessayer" }),
    ).not.toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.filter(
        ([url]) => new URL(String(url)).searchParams.get("page") === "1",
      ),
    ).toHaveLength(3);
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
    if (action === "reactivate") {
      await user.press(
        await screen.findByRole("button", { name: "Twitch, Refusé" }),
      );
    }

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
  await fireEvent(screen.getByLabelText("Historique des liens"), "endReached");

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

it("opens the exact active version's report page without loading reports in the editor", async () => {
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

  // When
  await user.press(
    await screen.findByRole("link", { name: "Signalements (21)" }),
  );

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/administration/stream-links/reports",
    params: { matchId: sporting.id, versionId },
  });
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(String(url)).pathname.endsWith("/reports"),
    ),
  ).toHaveLength(0);
});

it("retains reports through failed continuation and retries only the exact next page before exhaustion", async () => {
  // Given
  reportsPaged = true;
  reportReason = "First retained reason";
  const user = userEvent.setup();
  const ordinary = mockFetch.getMockImplementation()!;
  const append = Promise.withResolvers<Response>();
  let appendAvailable = false;
  const reportPath = `/administration/matches/${sporting.id}/stream-contributions/${versionId}/reports`;
  mockFetch.mockImplementation((url, init) => {
    const address = new URL(String(url));
    if (
      address.pathname !== reportPath ||
      address.searchParams.get("page") !== "1"
    ) {
      return ordinary(url, init);
    }
    return appendAvailable
      ? Promise.resolve(
          Response.json({
            count: 21,
            items: [
              {
                id: "00000000-0000-4000-8000-000000000010",
                reportedAt: "2026-10-24T12:00:00Z",
                reason: "Updated first retained reason",
              },
              {
                id: "00000000-0000-4000-8000-000000000011",
                reportedAt: "2026-10-24T11:00:00Z",
                reason: "Historique de la seconde page",
              },
            ],
          }),
        )
      : append.promise;
  });
  await mount(
    <ModerationReportsScreen matchId={sporting.id} versionId={versionId} />,
  );
  await screen.findByText("First retained reason");
  expect(
    screen.getByRole("header", { name: "Signalements (21)" }),
  ).toBeOnTheScreen();

  // When
  await fireEvent(screen.getByTestId("moderation-reports-list"), "endReached");
  await fireEvent(screen.getByTestId("moderation-reports-list"), "endReached");

  // Then
  expect(
    await screen.findByRole("progressbar", { name: "Chargement de la suite…" }),
  ).toBeBusy();
  expect(screen.getByText("First retained reason")).toBeOnTheScreen();
  expect(
    screen.queryByRole("progressbar", { name: "Chargement des signalements" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      String(url).endsWith(`${versionId}/reports?page=1`),
    ),
  ).toHaveLength(1);

  // When
  await act(() =>
    append.resolve(
      Response.json({ title: "Unavailable", status: 503 }, { status: 503 }),
    ),
  );
  await screen.findByRole("button", { name: "Réessayer" });
  await fireEvent(screen.getByTestId("moderation-reports-list"), "endReached");

  // Then
  expect(screen.getByText("First retained reason")).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      String(url).endsWith(`${versionId}/reports?page=1`),
    ),
  ).toHaveLength(1);

  // When
  appendAvailable = true;
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await screen.findByText("Historique de la seconde page");
  await fireEvent(screen.getByTestId("moderation-reports-list"), "endReached");

  // Then
  expect(screen.getByText("Updated first retained reason")).toBeOnTheScreen();
  expect(screen.queryByText("First retained reason")).not.toBeOnTheScreen();
  expect(screen.getAllByText("Historique de la seconde page")).toHaveLength(1);
  const reasons = screen.getAllByText(
    /Updated first retained reason|Historique de la seconde page/,
  );
  expect(reasons[0]).toHaveTextContent("Updated first retained reason");
  expect(reasons[1]).toHaveTextContent("Historique de la seconde page");
  expect(
    screen.getByRole("header", { name: "Signalements (21)" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls
      .filter(([url]) => new URL(String(url)).pathname === reportPath)
      .map(([url]) => new URL(String(url)).searchParams.get("page")),
  ).toEqual(["0", "1", "1"]);
});

it("retries a failed retained report refresh from page zero without appending the available next page", async () => {
  // Given
  reportsPaged = true;
  reportReason = "Retained reason before refresh";
  const user = userEvent.setup();
  const ordinary = mockFetch.getMockImplementation()!;
  const reportPath = `/administration/matches/${sporting.id}/stream-contributions/${versionId}/reports`;
  let refreshFails = false;
  mockFetch.mockImplementation((url, init) => {
    const address = new URL(String(url));
    return refreshFails &&
      address.pathname === reportPath &&
      address.searchParams.get("page") === "0"
      ? Promise.resolve(
          Response.json({ title: "Unavailable", status: 503 }, { status: 503 }),
        )
      : ordinary(url, init);
  });
  await mount(
    <ModerationReportsScreen matchId={sporting.id} versionId={versionId} />,
  );
  await screen.findByText("Retained reason before refresh");

  // When
  refreshFails = true;
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByRole("button", { name: "Réessayer" });
  await fireEvent(screen.getByTestId("moderation-reports-list"), "endReached");

  // Then
  expect(screen.getByText("Retained reason before refresh")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls
      .filter(([url]) => new URL(String(url)).pathname === reportPath)
      .map(([url]) => new URL(String(url)).searchParams.get("page")),
  ).toEqual(["0", "0"]);

  // When
  refreshFails = false;
  reportReason = "Refreshed retained reason";
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByText("Refreshed retained reason"),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText("Retained reason before refresh"),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls
      .filter(([url]) => new URL(String(url)).pathname === reportPath)
      .map(([url]) => new URL(String(url)).searchParams.get("page")),
  ).toEqual(["0", "0", "0"]);
});

it("keeps a new exact-version report context separate from a late older continuation", async () => {
  // Given
  reportsPaged = true;
  reportReason = "Old exact-version reason";
  const replacementId = "00000000-0000-4000-8000-000000000602";
  const ordinary = mockFetch.getMockImplementation()!;
  const append = Promise.withResolvers<Response>();
  let appendSignal: AbortSignal | undefined;
  mockFetch.mockImplementation((url, init) => {
    const address = new URL(String(url));
    if (address.pathname.endsWith(`${replacementId}/reports`)) {
      return Promise.resolve(
        Response.json({
          count: 1,
          items: [
            {
              id: "00000000-0000-4000-8000-000000000012",
              reportedAt: "2026-10-24T13:00:00Z",
              reason: "New exact-version reason",
            },
          ],
        }),
      );
    }
    if (
      address.pathname.endsWith(`${versionId}/reports`) &&
      address.searchParams.get("page") === "1"
    ) {
      appendSignal = init?.signal ?? undefined;
      return append.promise;
    }
    return ordinary(url, init);
  });
  const view = await mount(
    <ModerationReportsScreen matchId={sporting.id} versionId={versionId} />,
  );
  await screen.findByText("Old exact-version reason");
  await fireEvent(screen.getByTestId("moderation-reports-list"), "endReached");
  await screen.findByRole("progressbar", { name: "Chargement de la suite…" });

  // When
  await view.rerender(
    <ModerationReportsScreen matchId={sporting.id} versionId={replacementId} />,
  );
  await screen.findByText("New exact-version reason");
  expect(appendSignal?.aborted).toBe(true);
  await act(() =>
    append.resolve(
      Response.json({
        count: 21,
        items: [
          {
            id: "00000000-0000-4000-8000-000000000011",
            reportedAt: "2026-10-24T12:00:00Z",
            reason: "Late old-version reason",
          },
        ],
      }),
    ),
  );

  // Then
  expect(screen.getByText("New exact-version reason")).toBeOnTheScreen();
  expect(screen.queryByText("Old exact-version reason")).not.toBeOnTheScreen();
  expect(screen.queryByText("Late old-version reason")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("progressbar", { name: "Chargement de la suite…" }),
  ).not.toBeOnTheScreen();
});

it("requires current moderation permission before reading the exact report collection", async () => {
  // Given
  permission = false;

  // When
  await mount(
    <ModerationReportsScreen matchId={sporting.id} versionId={versionId} />,
  );

  // Then
  expect(await screen.findByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(String(url)).pathname.endsWith("/reports"),
    ),
  ).toHaveLength(0);
});

it("withdraws retained report reasons when the current continuation is forbidden", async () => {
  // Given
  reportsPaged = true;
  reportReason = "Private retained reason";
  const ordinary = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation((url, init) => {
    const address = new URL(String(url));
    return address.pathname.endsWith(`${versionId}/reports`) &&
      address.searchParams.get("page") === "1"
      ? Promise.resolve(
          Response.json({ title: "Forbidden", status: 403 }, { status: 403 }),
        )
      : ordinary(url, init);
  });
  await mount(
    <ModerationReportsScreen matchId={sporting.id} versionId={versionId} />,
  );
  await screen.findByText("Private retained reason");

  // When
  await fireEvent(screen.getByTestId("moderation-reports-list"), "endReached");

  // Then
  expect(await screen.findByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(screen.queryByText("Private retained reason")).not.toBeOnTheScreen();
  expect(screen.queryByText("Aucun signalement")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).not.toBeOnTheScreen();
});

it("refreshes empty reports only from their card and restores Empty after a failed read's Retry", async () => {
  // Given
  const user = userEvent.setup();
  let unavailable = false;
  const ordinary = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation((url, init) => {
    if (new URL(String(url)).pathname.endsWith(`${versionId}/reports`)) {
      return Promise.resolve(
        unavailable
          ? Response.json(
              { title: "Unavailable", status: 503 },
              { status: 503 },
            )
          : Response.json({ count: 0, items: [] }),
      );
    }
    return ordinary(url, init);
  });
  await mount(
    <ModerationReportsScreen matchId={sporting.id} versionId={versionId} />,
  );
  await screen.findByText("Aucun signalement");
  expect(
    screen.queryByLabelText("Actualiser les données"),
  ).not.toBeOnTheScreen();

  // When
  unavailable = true;
  await user.press(screen.getByRole("button", { name: "Actualiser" }));

  // Then
  expect(
    await screen.findByRole("button", { name: "Réessayer" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Aucun signalement")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).not.toBeOnTheScreen();

  // When
  unavailable = false;
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByText("Aucun signalement")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
});

it("prioritizes profile recovery over a retained empty report collection", async () => {
  // Given
  const user = userEvent.setup();
  const ordinary = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation((url, init) =>
    new URL(String(url)).pathname.endsWith(`${versionId}/reports`)
      ? Promise.resolve(Response.json({ count: 0, items: [] }))
      : ordinary(url, init),
  );
  await mount(
    <ModerationReportsScreen matchId={sporting.id} versionId={versionId} />,
  );
  await screen.findByText("Aucun signalement");
  const reportReads = mockFetch.mock.calls.filter(([url]) =>
    new URL(String(url)).pathname.endsWith("/reports"),
  ).length;

  // When
  profileFails = true;
  await act(() =>
    client.refetchQueries({ queryKey: getGetMyAccountQueryKey(), exact: true }),
  );

  // Then
  expect(
    await screen.findByRole("button", { name: "Réessayer", busy: false }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Aucun signalement")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Actualiser" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Actualiser les données"),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(String(url)).pathname.endsWith("/reports"),
    ),
  ).toHaveLength(reportReads);

  // When
  profileFails = false;
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByText("Aucun signalement")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Actualiser" })).toBeOnTheScreen();
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

it("allows an explicit replacement from the retained draft after a technical account read failure", async () => {
  // Given: the actual account, Query, form and mutation owners retain an authorized moderator.
  detail = { ...detail, canPublish: true };
  const alert = jest.spyOn(Alert, "alert");
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
  ).toBeEnabled();
  expect(writes).toHaveLength(0);

  // When: only a new explicit confirmation sends the retained address and viewed revision.
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
        url: "https://youtu.be/profile-outage",
      },
    ]),
  );
  await waitFor(() => expect(client.isFetching()).toBe(0));
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

it("refreshes retained report reasons on their page even when the total is unchanged", async () => {
  // Given: the fictional HTTP erasure changes only the nullable reason, not its counted fact.
  reportReason = "Avant effacement";
  await mount(
    <ModerationReportsScreen matchId={sporting.id} versionId={versionId} />,
  );
  await screen.findByText("Avant effacement");

  // When
  reportReason = null;
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(await screen.findByText("Motif indisponible")).toBeOnTheScreen();
  expect(screen.queryByText("Avant effacement")).toBeNull();
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
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

it("opens a newly accepted active member's own report destination", async () => {
  // Given
  reportsPaged = true;
  detail.activeContribution = version({
    state: "active",
    reportCount: 21,
    canApprove: false,
    canReject: false,
    canWithdraw: true,
  });
  const replacementId = "00000000-0000-4000-8000-000000000601";
  await mount(<ModerationMatchScreen matchId={sporting.id} />);
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("link", { name: "Signalements (21)" }),
  );
  expect(mockPush).toHaveBeenLastCalledWith({
    pathname: "/administration/stream-links/reports",
    params: { matchId: sporting.id, versionId },
  });

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
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await user.press(
    await screen.findByRole("link", { name: "Signalements (0)" }),
  );

  // Then
  expect(mockPush).toHaveBeenLastCalledWith({
    pathname: "/administration/stream-links/reports",
    params: { matchId: sporting.id, versionId: replacementId },
  });
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      new URL(String(url)).pathname.endsWith("/reports"),
    ),
  ).toHaveLength(0);
});

it.each(["queue", "active", "pending"] as const)(
  "does not animate a pull-to-refresh for a background %s read",
  async (kind) => {
    // Given: a loaded native scene stays visible while its ordinary Query data is reread.
    if (kind === "active") {
      detail = {
        ...detail,
        canPublish: true,
        match: { ...detail.match, publiclyViewable: true },
      };
    }
    await mount(
      kind === "queue" ? (
        <ModerationScreen filters={{}} />
      ) : (
        <ModerationMatchScreen matchId={sporting.id} />
      ),
    );
    const user = userEvent.setup();
    if (kind === "pending") {
      await user.press(
        await screen.findByRole("tab", { name: "Propositions (1)" }),
      );
    }
    await screen.findByLabelText("Actualiser les données");
    if (kind === "active") {
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Remplacer le lien" }),
        ).toBeEnabled(),
      );
    }
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
      if (kind === "active") {
        await waitFor(() =>
          expect(
            screen.getByRole("button", { name: "Remplacer le lien" }),
          ).toBeEnabled(),
        );
      }

      // Then
      expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy();
    } finally {
      await act(async () => {
        finish(response);
        await reading;
      });
      // The public admission read settles independently of this retained private traversal.
      await waitFor(() => {
        expect(client.isFetching()).toBe(0);
        expect(publicClient.isFetching()).toBe(0);
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
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

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
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
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

it.each(["active", "historical"] as const)(
  "opens exact %s reports without source or replacement shortcuts",
  async (selection) => {
    // Given: retained lineage metadata does not introduce another version-reading journey.
    const retained = version({
      state: selection === "active" ? "active" : "replaced",
      sourceVersionId: "00000000-0000-4000-8000-000000000771",
      replacedByVersionId: "00000000-0000-4000-8000-000000000772",
      reportCount: 1,
      canApprove: false,
      canReject: false,
      canWithdraw: selection === "active",
    });
    if (selection === "active") {
      detail.activeContribution = retained;
    } else {
      detail.items = [retained];
    }
    await mount(<ModerationMatchScreen matchId={sporting.id} />);
    const user = userEvent.setup();

    // When
    if (selection === "historical") {
      await user.press(await screen.findByRole("tab", { name: "Historique" }));
      await user.press(
        await screen.findByRole("button", { name: "Twitch, Lien remplacé" }),
      );
    }
    await user.press(
      await screen.findByRole("link", { name: "Signalements (1)" }),
    );

    // Then
    expect(screen.queryByText("Version d’origine")).not.toBeOnTheScreen();
    expect(screen.queryByText("Version de remplacement")).not.toBeOnTheScreen();
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/administration/stream-links/reports",
      params: { matchId: sporting.id, versionId },
    });
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        new URL(String(url)).pathname.endsWith("/reports"),
      ),
    ).toHaveLength(0);
  },
);

it.each(["queue", "active", "pending", "filters", "reports"] as const)(
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
      let target: boolean;
      if (kind === "queue" || kind === "filters") {
        target = address.pathname.endsWith("/stream-moderation");
      } else if (kind === "reports") {
        target = address.pathname.endsWith("/reports");
      } else {
        target =
          address.pathname.endsWith("/stream-contributions") &&
          address.searchParams.get("state") === kind;
      }
      if (!target) {
        return ordinary(url, init);
      }
      requested = true;
      response = await ordinary(url, init);
      return held;
    });
    const label = {
      queue: "Chargement de la file de modération",
      filters: "Chargement des filtres des liens",
      reports: "Chargement des signalements",
      active: "Chargement des liens du match",
      pending: "Chargement des liens du match",
    }[kind];
    try {
      // When
      await mount(moderationView(kind));
      const user = userEvent.setup();
      if (kind === "pending") {
        await user.press(
          await screen.findByRole("tab", { name: "Propositions (1)" }),
        );
      }
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
