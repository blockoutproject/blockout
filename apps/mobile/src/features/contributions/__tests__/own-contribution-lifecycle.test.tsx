import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import {
  Alert,
  AppState,
  Pressable,
  Text,
  type AppStateStatus,
} from "react-native";
import {
  type OwnStreamContributionResponse,
  UpdateOwnStreamContributionRequest,
} from "../../../../.generated/schemas/index.zod";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { useCurrentAccount } from "../../accounts/current-account";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { OwnContributionsScreen } from "../screens/own-contributions-screen";
import { ownContributions } from "../test-support/contribution-data";
import { matchDetail } from "../../sporting/test-support/consultation-data";

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
  useNavigation: () => ({ isFocused: () => mockFocused }),
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, init?: RequestInit) => mockFetch(url, init),
}));
const appStateDescriptor = Object.getOwnPropertyDescriptor(
  AppState,
  "currentState",
);
let mockAppState: AppStateStatus = "active";
beforeAll(() =>
  Object.defineProperty(AppState, "currentState", {
    configurable: true,
    get: () => mockAppState,
  }),
);
afterAll(() => {
  if (appStateDescriptor)
    Object.defineProperty(AppState, "currentState", appStateDescriptor);
});
let mockFocused = true;
const mockPush = jest.fn();
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const previous = { ...process.env };
const match = matchDetail();
let client = createQueryClient();
let context = ownContributions();
let rows: OwnStreamContributionResponse[] = [];
let pages: number[] = [];
let patches: { id: string; body: UpdateOwnStreamContributionRequest }[] = [];
let failRead = false;
let alert: jest.SpyInstance;

/** Historical versions come from moderator creation, not more than three ordinary submissions. */
function version(
  index: number,
  state: OwnStreamContributionResponse["state"],
): OwnStreamContributionResponse {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    url: `https://youtu.be/history-${index}`,
    platform: "youtube",
    state,
    submittedAt: "2026-10-28T10:00:00Z",
    canCancel: state === "pending",
    canWithdraw: state === "active",
  };
}

beforeEach(() => {
  client = createQueryClient();
  mockFocused = true;
  mockAppState = "active";
  rows = [version(1, "pending"), version(2, "active")];
  context = ownContributions({
    quota: {
      versionsUsed: 2,
      dailyMatchesUsed: 1,
      matchCountedToday: true,
      dayEndsAt: "2026-10-30T00:00:00+01:00",
    },
  });
  pages = [];
  patches = [];
  failRead = false;
  alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  mockPush.mockReset();
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
    const parsed = new URL(String(url));
    if (parsed.pathname.endsWith("/application-access"))
      return Response.json(applicationAccessResponse());
    if (parsed.pathname.endsWith("/me"))
      return Response.json(accountResponse());
    if (parsed.pathname.includes("/stream-contributions")) {
      if (init?.method === "PATCH") {
        const id = parsed.pathname.split("/").at(-1);
        if (!id) throw new Error("Missing synthetic member");
        const body = UpdateOwnStreamContributionRequest.parse(
          JSON.parse(String(init.body)),
        );
        patches.push({ id, body });
        const item = rows.find((row) => row.id === id);
        if (!item) throw new Error("Unknown synthetic version");
        const changed = {
          ...item,
          state:
            body.action === "cancel"
              ? ("cancelled" as const)
              : ("withdrawn" as const),
          canCancel: false,
          canWithdraw: false,
        };
        rows = rows.map((row) => (row.id === id ? changed : row));
        context = { ...context, revision: "accepted" };
        return Response.json({
          revision: context.revision,
          contribution: changed,
        });
      }
      if (failRead) throw new TypeError("Controlled read failure");
      const page = Number(parsed.searchParams.get("page") ?? 0);
      pages.push(page);
      return Response.json({
        ...context,
        items: rows.slice(page * 20, (page + 1) * 20),
        ...(rows.length > (page + 1) * 20 ? { nextPage: page + 1 } : {}),
      });
    }
    return Response.json(match);
  });
});
afterEach(async () => {
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await act(async () => {
    await client.cancelQueries();
  });
  await cleanup();
  client.clear();
  jest.restoreAllMocks();
  process.env = { ...previous };
});

/** Real session, Query, generated transport and native controls with only HTTP, credentials and alert presentation controlled. */
async function mount() {
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <AccountFeedbackProvider>
              <OwnContributionsScreen matchId={match.match.id} />
              <SessionExit />
            </AccountFeedbackProvider>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}
/** Uses real session and profile commands for current-owner lifecycle scenarios. */
function SessionExit() {
  const session = useAccountSession();
  const profile = useCurrentAccount();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Actualiser le profil"
        onPress={() => void profile.refetch()}
      >
        <Text>Profil</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quitter la session"
        onPress={() => void session.clearCredentials()}
      >
        <Text>Quitter</Text>
      </Pressable>
    </>
  );
}
it("explains active and pending coexistence and confirms exact cancellation with its quota consequence", async () => {
  // Given
  const user = userEvent.setup();
  await mount();

  // When
  await user.press(
    await screen.findByRole("button", { name: "Annuler la proposition" }),
  );

  await act(async () => {
    alert.mock.calls
      .at(-1)?.[2]
      ?.find((button: { style?: string }) => button.style === "destructive")
      ?.onPress?.();
  });

  // Then
  expect(alert).toHaveBeenCalledWith(
    "Annuler cette proposition ?",
    expect.stringContaining("aucun quota"),
    expect.any(Array),
    expect.any(Object),
  );
  expect(await screen.findByText("Proposition annulée")).toBeOnTheScreen();
  expect(screen.getByText("Votre lien public")).toBeOnTheScreen();
  expect(patches).toEqual([
    {
      id: version(1, "pending").id,
      body: { action: "cancel", revision: "initial" },
    },
  ]);
});

it("withdraws only the active version when publication is unavailable and leaves the proposal pending", async () => {
  // Given
  context = {
    ...context,
    eligibility: {
      canSubmit: false,
      requiresApproval: false,
      reason: "Le quota de versions est atteint.",
    },
  };
  const user = userEvent.setup();
  await mount();

  // When
  await user.press(await screen.findByRole("button", { name: "Retirer" }));
  await act(async () => {
    alert.mock.calls
      .at(-1)?.[2]
      ?.find((button: { style?: string }) => button.style === "destructive")
      ?.onPress?.();
  });

  // Then
  expect(await screen.findByText("Lien retiré")).toBeOnTheScreen();
  expect(screen.getByText("En attente de validation")).toBeOnTheScreen();
  expect(patches).toEqual([
    {
      id: version(2, "active").id,
      body: { action: "withdraw", revision: "initial" },
    },
  ]);
  expect(
    screen.queryByRole("button", { name: "Remplacer" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.getByText("Le quota de versions est atteint."),
  ).toBeOnTheScreen();
});

it("keeps terminal French explanations private and traverses more than twenty moderator-created historical versions", async () => {
  // Given: ordinary quota stays at two; additional historical versions were created through moderation.
  rows = Array.from({ length: 21 }, (_, index) =>
    version(index + 1, "replaced"),
  );
  rows[0] = version(1, "rejected");
  rows[1] = version(2, "cancelled");
  rows[2] = version(3, "superseded");
  rows[20] = version(21, "hidden");
  const user = userEvent.setup();
  await mount();

  // When
  await screen.findByText("https://youtu.be/history-1");
  await fireEvent(
    screen.getByLabelText("Historique de mes contributions"),
    "endReached",
  );

  await waitFor(() => expect(pages).toEqual([0, 1]));
  await user.scrollTo(
    screen.getByLabelText("Historique de mes contributions"),
    {
      y: 9000,
      contentSize: { width: 400, height: 10000 },
      layoutMeasurement: { width: 400, height: 800 },
    },
  );
  // Then
  expect(screen.getByText("Proposition refusée")).toBeOnTheScreen();
  expect(screen.getByText("Proposition annulée")).toBeOnTheScreen();
  expect(screen.getByText("Proposition remplacée")).toBeOnTheScreen();
  expect(
    screen.getByText(
      /Une autre proposition a été retenue ou une nouvelle version a été soumise/,
    ),
  ).toBeOnTheScreen();
  expect(await screen.findByText("Lien masqué")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).includes("/moderation")),
  ).toBe(false);
});

it("restarts the history at page zero on explicit refresh", async () => {
  // Given
  rows = Array.from({ length: 21 }, (_, index) =>
    version(index + 1, "replaced"),
  );
  const user = userEvent.setup();
  await mount();
  await screen.findByText("https://youtu.be/history-1");
  await fireEvent(
    screen.getByLabelText("Historique de mes contributions"),
    "endReached",
  );
  await waitFor(() => expect(pages).toEqual([0, 1]));

  // When
  await user.pullToRefresh(
    screen.getByLabelText("Historique de mes contributions"),
  );

  // Then
  await waitFor(() => expect(pages).toEqual([0, 1, 0]));
});

it("does not acquire an ownerless public contribution or offer actions for an empty own history", async () => {
  // Given: public link presence supplies no private owner row or permission.
  rows = [];
  context = {
    ...context,
    eligibility: {
      canSubmit: false,
      requiresApproval: false,
      reason: "Ce lien ne vous appartient pas.",
    },
  };
  await mount();

  // When
  await screen.findByText("Aucune contribution personnelle");

  // Then
  expect(
    screen.queryByRole("button", { name: "Retirer" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Annuler la proposition" }),
  ).not.toBeOnTheScreen();
  expect(screen.getByText("Ce lien ne vous appartient pas.")).toBeOnTheScreen();
  expect(patches).toHaveLength(0);
});

it("opens the existing new-version form without sending or editing the old address", async () => {
  // Given
  const user = userEvent.setup();
  await mount();

  // When
  await user.press(await screen.findByRole("button", { name: "Remplacer" }));

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/matches/[matchId]/contribution",
    params: { matchId: match.match.id },
  });
  expect(patches).toHaveLength(0);
});

it("keeps acknowledged cancellation visible when the following read fails", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await user.press(
    await screen.findByRole("button", { name: "Annuler la proposition" }),
  );
  failRead = true;

  // When
  await act(async () => {
    alert.mock.calls
      .at(-1)?.[2]
      ?.find((button: { style?: string }) => button.style === "destructive")
      ?.onPress?.();
  });

  // Then
  expect(await screen.findByText("Proposition annulée")).toBeOnTheScreen();
  expect(screen.getByText("L’annulation est confirmée.")).toBeOnTheScreen();
  expect(patches).toHaveLength(1);
});

it("does not dispatch an old confirmation after the original session changes", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await user.press(
    await screen.findByRole("button", { name: "Annuler la proposition" }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Quitter la session" }));
  await act(async () => {
    alert.mock.calls
      .at(-1)?.[2]
      ?.find((button: { style?: string }) => button.style === "destructive")
      ?.onPress?.();
  });

  // Then
  expect(patches).toHaveLength(0);
});

it("abandons the native confirmation without changing either version", async () => {
  // Given
  const user = userEvent.setup();
  await mount();

  // When
  await user.press(
    await screen.findByRole("button", { name: "Annuler la proposition" }),
  );
  const buttons = alert.mock.calls.at(-1)?.[2];
  await act(async () => {
    buttons
      ?.find((button: { style?: string }) => button.style === "cancel")
      ?.onPress?.();
  });

  // Then
  expect(patches).toHaveLength(0);
  expect(screen.getByText("Votre lien public")).toBeOnTheScreen();
  expect(screen.getByText("En attente de validation")).toBeOnTheScreen();
});

it("requires a fresh read after conflict and never transfers the old confirmation to a new version", async () => {
  // Given
  const boundary = mockFetch.getMockImplementation();
  if (!boundary) throw new Error("Missing test HTTP boundary");
  mockFetch.mockImplementation(async (url, init) => {
    if (init?.method === "PATCH") {
      const body = UpdateOwnStreamContributionRequest.parse(
        JSON.parse(String(init.body)),
      );
      patches.push({ id: String(url).split("/").at(-1) ?? "", body });
      rows = [
        version(3, "pending"),
        version(2, "active"),
        version(1, "superseded"),
      ];
      context = { ...context, revision: "concurrent" };
      return Response.json(
        {
          type: "urn:blockout:problem:conflict",
          title: "Conflict",
          status: 409,
        },
        { status: 409 },
      );
    }
    return boundary(url, init);
  });
  const user = userEvent.setup();
  await mount();
  await user.press(
    await screen.findByRole("button", { name: "Annuler la proposition" }),
  );

  // When
  await act(async () => {
    alert.mock.calls
      .at(-1)?.[2]
      ?.find((button: { style?: string }) => button.style === "destructive")
      ?.onPress?.();
  });

  // Then
  expect(
    await screen.findByText(/L’état courant a été relu/),
  ).toBeOnTheScreen();
  expect(pages).toEqual([0, 0]);
  expect(patches).toEqual([
    {
      id: version(1, "pending").id,
      body: { action: "cancel", revision: "initial" },
    },
  ]);
  expect(screen.getByText("Proposition remplacée")).toBeOnTheScreen();
  expect(screen.getByText("En attente de validation")).toBeOnTheScreen();
});

it("excludes duplicate confirmations and the other owner action while one PATCH is pending", async () => {
  // Given
  const boundary = mockFetch.getMockImplementation();
  if (!boundary) throw new Error("Missing test HTTP boundary");
  let release: (() => void) | undefined;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  let attempts = 0;
  mockFetch.mockImplementation(async (url, init) => {
    if (init?.method === "PATCH") {
      attempts++;
      await delayed;
    }
    return boundary(url, init);
  });
  const user = userEvent.setup();
  await mount();
  await user.press(
    await screen.findByRole("button", { name: "Annuler la proposition" }),
  );

  // When
  await act(async () => {
    alert.mock.calls
      .at(-1)?.[2]
      ?.find((button: { style?: string }) => button.style === "destructive")
      ?.onPress?.();
  });
  await act(async () => {
    alert.mock.calls
      .at(-1)?.[2]
      ?.find((button: { style?: string }) => button.style === "destructive")
      ?.onPress?.();
  });

  // Then
  expect(attempts).toBe(1);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Retirer" })).toBeDisabled(),
  );
  await act(async () => {
    release?.();
  });
  expect(await screen.findByText("Proposition annulée")).toBeOnTheScreen();
});

it("removes private versions after a current read refuses access", async () => {
  // Given
  const boundary = mockFetch.getMockImplementation();
  if (!boundary) throw new Error("Missing test HTTP boundary");
  let denied = false;
  const user = userEvent.setup();
  mockFetch.mockImplementation((url, init) =>
    denied && String(url).includes("/stream-contributions")
      ? Promise.resolve(
          Response.json(
            {
              type: "urn:blockout:problem:not-found",
              title: "Not found",
              status: 404,
            },
            { status: 404 },
          ),
        )
      : boundary(url, init),
  );
  await mount();
  await screen.findByText("Votre lien public");

  // When
  denied = true;
  await user.pullToRefresh(
    screen.getByLabelText("Historique de mes contributions"),
  );

  // Then
  await waitFor(() =>
    expect(screen.queryByText("Votre lien public")).not.toBeOnTheScreen(),
  );
  expect(screen.queryByText("En attente de validation")).not.toBeOnTheScreen();
});

it("retains history after a failed continuation and retries that page only on the explicit footer action", async () => {
  // Given
  rows = Array.from({ length: 21 }, (_, index) =>
    version(index + 1, "replaced"),
  );
  const boundary = mockFetch.getMockImplementation();
  if (!boundary) throw new Error("Missing test HTTP boundary");
  let unavailable = true;
  let continuationAttempts = 0;
  mockFetch.mockImplementation(async (url, init) => {
    if (new URL(String(url)).searchParams.get("page") === "1") {
      continuationAttempts++;
      if (unavailable) throw new TypeError("Controlled continuation failure");
    }
    return boundary(url, init);
  });
  const user = userEvent.setup();
  await mount();
  await screen.findByText("https://youtu.be/history-1");

  // When: native list-edge events cannot retry a failed page.
  await fireEvent(
    screen.getByLabelText("Historique de mes contributions"),
    "endReached",
  );
  await screen.findByRole("button", { name: "Réessayer" });
  await fireEvent(
    screen.getByLabelText("Historique de mes contributions"),
    "endReached",
  );

  // Then
  expect(continuationAttempts).toBe(1);
  expect(screen.getByText("https://youtu.be/history-1")).toBeOnTheScreen();

  // When: a new user action retries the same continuation.
  unavailable = false;
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  await waitFor(() => expect(pages).toEqual([0, 1]));
  expect(continuationAttempts).toBe(2);
});

it.each(["unfocused", "background"])(
  "ignores automatic continuation while the history is %s",
  async (state) => {
    // Given
    rows = Array.from({ length: 21 }, (_, index) =>
      version(index + 1, "replaced"),
    );
    await mount();
    await screen.findByText("https://youtu.be/history-1");
    if (state === "unfocused") mockFocused = false;
    else mockAppState = "background";

    // When
    await fireEvent(
      screen.getByLabelText("Historique de mes contributions"),
      "endReached",
    );

    // Then
    expect(pages).toEqual([0]);
  },
);

it("refreshes recovered match context together with the private history", async () => {
  // Given
  const boundary = mockFetch.getMockImplementation();
  if (!boundary) throw new Error("Missing test HTTP boundary");
  let unavailable = true;
  mockFetch.mockImplementation((url, init) => {
    if (String(url).endsWith(`/matches/${match.match.id}`) && unavailable)
      throw new TypeError("Controlled match read failure");
    return boundary(url, init);
  });
  const user = userEvent.setup();
  await mount();
  await screen.findByText("Votre lien public");
  expect(screen.queryByText("Home")).not.toBeOnTheScreen();

  // When
  unavailable = false;
  await user.pullToRefresh(
    screen.getByLabelText("Historique de mes contributions"),
  );

  // Then
  expect(await screen.findByText("Home")).toBeOnTheScreen();
});

it("opens only one native confirmation and settles its saved callback once", async () => {
  // Given
  const user = userEvent.setup();
  await mount();

  // When
  await user.press(
    await screen.findByRole("button", { name: "Annuler la proposition" }),
  );
  await user.press(screen.getByRole("button", { name: "Retirer" }));

  // Then
  expect(alert).toHaveBeenCalledTimes(1);

  // When: the same native callback arrives again after its command completed.
  const accept = alert.mock.calls[0]?.[2]?.find(
    (button: { style?: string }) => button.style === "destructive",
  )?.onPress;
  await act(async () => {
    accept?.();
  });
  await screen.findByText("Proposition annulée");
  await act(async () => {
    accept?.();
  });

  // Then
  expect(patches).toHaveLength(1);
  expect(screen.getByText("Votre lien public")).toBeOnTheScreen();
});

it.each(["refresh", "reconcile", "acknowledgement"])(
  "retains all authorized history pages when %s cannot read the first page",
  async (operation) => {
    // Given: extra historical versions were moderator-created and ordinary usage stays unchanged.
    rows = Array.from({ length: 21 }, (_, index) =>
      version(index + 1, index === 0 ? "pending" : "replaced"),
    );
    const boundary = mockFetch.getMockImplementation();
    if (!boundary) throw new Error("Missing test HTTP boundary");
    mockFetch.mockImplementation(async (url, init) => {
      if (init?.method === "PATCH" && operation === "reconcile")
        return Response.json({ status: 409 }, { status: 409 });
      return boundary(url, init);
    });
    const user = userEvent.setup();
    await mount();
    await screen.findByText("https://youtu.be/history-1");
    await fireEvent(
      screen.getByLabelText("Historique de mes contributions"),
      "endReached",
    );
    await waitFor(() => expect(pages).toEqual([0, 1]));
    failRead = true;

    // When
    if (operation === "refresh")
      await user.pullToRefresh(
        screen.getByLabelText("Historique de mes contributions"),
      );
    else {
      await user.press(
        screen.getByRole("button", { name: "Annuler la proposition" }),
      );
      await act(async () => {
        alert.mock.calls
          .at(-1)?.[2]
          ?.find((button: { style?: string }) => button.style === "destructive")
          ?.onPress?.();
      });
    }
    await waitFor(() => expect(client.isFetching()).toBe(0));
    await user.scrollTo(
      screen.getByLabelText("Historique de mes contributions"),
      {
        y: 9000,
        contentSize: { width: 400, height: 10000 },
        layoutMeasurement: { width: 400, height: 800 },
      },
    );

    // Then
    expect(
      await screen.findByText("https://youtu.be/history-21"),
    ).toBeOnTheScreen();

    // When: a later authorized read replaces traversal only after success.
    failRead = false;
    await user.pullToRefresh(
      screen.getByLabelText("Historique de mes contributions"),
    );

    // Then
    await waitFor(() =>
      expect(
        screen.queryByText("https://youtu.be/history-21"),
      ).not.toBeOnTheScreen(),
    );
    expect(pages).toEqual([0, 1, 0]);
  },
);

it("keeps original-owner history read-only through a technical profile refresh failure", async () => {
  // Given
  const boundary = mockFetch.getMockImplementation();
  if (!boundary) throw new Error("Missing test HTTP boundary");
  let unavailable = false;
  mockFetch.mockImplementation((url, init) => {
    if (String(url).endsWith("/me") && unavailable)
      throw new TypeError("Controlled profile read failure");
    return boundary(url, init);
  });
  const user = userEvent.setup();
  await mount();
  await screen.findByText("Votre lien public");

  // When
  unavailable = true;
  await user.press(
    screen.getByRole("button", { name: "Actualiser le profil" }),
  );
  await waitFor(() => expect(client.isFetching()).toBe(0));

  // Then
  expect(screen.getByText("Votre lien public")).toBeOnTheScreen();
  expect(screen.getByText("En attente de validation")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Retirer" })).toBeDisabled();
});

it.each([401, 403, 404])(
  "revokes private history after match GET %i and does not restore it on technical retry failure",
  async (status) => {
    // Given
    const boundary = mockFetch.getMockImplementation();
    if (!boundary) throw new Error("Missing test HTTP boundary");
    let failure: "none" | "denied" | "technical" = "none";
    mockFetch.mockImplementation((url, init) => {
      if (String(url).endsWith(`/matches/${match.match.id}`)) {
        if (failure === "denied")
          return Promise.resolve(Response.json({ status }, { status }));
        if (failure === "technical")
          throw new TypeError("Controlled match retry failure");
      }
      return boundary(url, init);
    });
    const user = userEvent.setup();
    await mount();
    await screen.findByText("Votre lien public");

    // When
    failure = "denied";
    failRead = true;
    await user.pullToRefresh(
      screen.getByLabelText("Historique de mes contributions"),
    );
    await waitFor(() => expect(client.isFetching()).toBe(0));

    // Then
    expect(
      screen.queryByText("https://youtu.be/history-2"),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Retirer" }),
    ).not.toBeOnTheScreen();

    // When: a later technical failure cannot undo the sporting refusal.
    failure = "technical";
    await user.press(await screen.findByRole("button", { name: "Réessayer" }));
    await waitFor(() => expect(client.isFetching()).toBe(0));

    // Then
    expect(
      screen.queryByText("https://youtu.be/history-1"),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText("https://youtu.be/history-2"),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Retirer" }),
    ).not.toBeOnTheScreen();
  },
);

it.each([
  {
    condition: "failed native restoration",
    failure: new Error("Synthetic native restoration failure"),
  },
  {
    condition: "expired credentials",
    failure: {
      code: "invalid_grant",
      message: "Synthetic expired credentials",
    },
  },
])("delegates $condition to sign-in", async ({ failure }) => {
  // Given
  mockAuth0.getCredentials.mockRejectedValue(failure);
  const user = userEvent.setup();
  await mount();

  // When
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));

  // Then
  expect(mockPush).toHaveBeenCalledWith("/sign-in");
  expect(
    screen.queryByRole("progressbar", { name: "Chargement en cours" }),
  ).not.toBeOnTheScreen();
  expect(pages).toEqual([]);
  expect(patches).toEqual([]);
});

it("recovers a refused match when its successful retry settles after the personal read", async () => {
  // Given
  const boundary = mockFetch.getMockImplementation();
  if (!boundary) throw new Error("Missing test HTTP boundary");
  let denied = false;
  let pendingMatch: Promise<void> | undefined;
  mockFetch.mockImplementation(async (url, init) => {
    if (String(url).endsWith(`/matches/${match.match.id}`)) {
      if (denied) return Response.json({ status: 404 }, { status: 404 });
      await pendingMatch;
    }
    return boundary(url, init);
  });
  const user = userEvent.setup();
  await mount();
  await screen.findByText("Votre lien public");
  denied = true;
  failRead = true;
  await user.pullToRefresh(
    screen.getByLabelText("Historique de mes contributions"),
  );
  const retry = await screen.findByRole("button", { name: "Réessayer" });

  // When
  denied = false;
  failRead = false;
  let finishMatch: (() => void) | undefined;
  pendingMatch = new Promise<void>((resolve) => {
    finishMatch = resolve;
  });
  await user.press(retry);
  await waitFor(() => expect(pages).toEqual([0, 0]));
  await act(async () => {
    finishMatch?.();
  });

  // Then
  expect(await screen.findByText("Votre lien public")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Retirer" })).toBeEnabled();
});

it("retains every authorized page when match and history refresh both fail technically", async () => {
  // Given
  rows = Array.from({ length: 21 }, (_, index) =>
    version(index + 1, index === 0 ? "active" : "replaced"),
  );
  const boundary = mockFetch.getMockImplementation();
  if (!boundary) throw new Error("Missing test HTTP boundary");
  mockFetch.mockImplementation((url, init) => {
    if (failRead && String(url).endsWith(`/matches/${match.match.id}`))
      throw new TypeError("Controlled match refresh failure");
    return boundary(url, init);
  });
  const user = userEvent.setup();
  await mount();
  await screen.findByText("Votre lien public");
  await fireEvent(
    screen.getByLabelText("Historique de mes contributions"),
    "endReached",
  );
  await waitFor(() => expect(pages).toEqual([0, 1]));

  // When
  failRead = true;
  await user.pullToRefresh(
    screen.getByLabelText("Historique de mes contributions"),
  );
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await user.scrollTo(
    screen.getByLabelText("Historique de mes contributions"),
    {
      y: 9000,
      contentSize: { width: 400, height: 10000 },
      layoutMeasurement: { width: 400, height: 800 },
    },
  );

  // Then
  expect(screen.getByText("Dernier lien public connu")).toBeOnTheScreen();
  expect(
    await screen.findByText("https://youtu.be/history-21"),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Retirer" })).toBeDisabled();
});

it.each([401, 403, 404])(
  "does not reexpose history after GET %i followed by a technical retry failure",
  async (status) => {
    // Given
    const boundary = mockFetch.getMockImplementation();
    if (!boundary) throw new Error("Missing test HTTP boundary");
    let failure: "none" | "denied" | "technical" = "none";
    mockFetch.mockImplementation((url, init) => {
      if (String(url).includes("/stream-contributions")) {
        if (failure === "denied")
          return Promise.resolve(Response.json({ status }, { status }));
        if (failure === "technical")
          throw new TypeError("Controlled retry failure");
      }
      return boundary(url, init);
    });
    const user = userEvent.setup();
    await mount();
    await screen.findByText("Votre lien public");

    // When
    failure = "denied";
    await user.pullToRefresh(
      screen.getByLabelText("Historique de mes contributions"),
    );
    const retry = await screen.findByRole("button", { name: "Réessayer" });
    failure = "technical";
    await user.press(retry);
    await waitFor(() => expect(client.isFetching()).toBe(0));

    // Then
    expect(
      screen.queryByText("https://youtu.be/history-2"),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Retirer" }),
    ).not.toBeOnTheScreen();
  },
);

it.each([401, 403, 404])(
  "revokes current history after PATCH %i even when its bounded current read fails",
  async (status) => {
    // Given
    const boundary = mockFetch.getMockImplementation();
    if (!boundary) throw new Error("Missing test HTTP boundary");
    let refused = false;
    let attempts = 0;
    let observations = 0;
    mockFetch.mockImplementation((url, init) => {
      if (String(url).includes("/stream-contributions")) {
        if (init?.method === "PATCH") {
          attempts++;
          refused = true;
          return Promise.resolve(Response.json({ status }, { status }));
        }
        if (refused) {
          observations++;
          throw new TypeError("Controlled current read failure");
        }
      }
      return boundary(url, init);
    });
    const user = userEvent.setup();
    await mount();
    await user.press(await screen.findByRole("button", { name: "Retirer" }));

    // When
    await act(async () => {
      alert.mock.calls
        .at(-1)?.[2]
        ?.find((button: { style?: string }) => button.style === "destructive")
        ?.onPress?.();
    });
    await waitFor(() => expect(client.isFetching()).toBe(0));

    // Then
    expect(
      screen.queryByText("https://youtu.be/history-2"),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Retirer" }),
    ).not.toBeOnTheScreen();
    expect(attempts).toBe(1);
    expect(observations).toBe(1);
  },
);
