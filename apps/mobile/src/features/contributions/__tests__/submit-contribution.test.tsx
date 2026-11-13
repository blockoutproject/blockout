import { useLayoutEffect, type PropsWithChildren, type ReactNode } from "react";
import { useQueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Alert, Pressable, Text } from "react-native";
import { createQueryClient } from "@/shared/query/query-client";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import {
  useApplicationAccess,
  ApplicationAccessProvider,
} from "@/features/access/queries/use-application-access";
import { applicationAccessResponse as mockApplicationAccessResponse } from "@/shared/api/test-support/application-access";
import {
  AccountSessionProvider,
  useAccountSession,
} from "@/features/accounts/session/account-session-provider";
import { AccountFeedbackProvider } from "@/features/accounts/test-support/account-feedback-provider";
import { accountResponse } from "@/features/accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import { ContributionForm } from "../forms/contribution-form";
import { useOwnContributions } from "../api/own-contributions";
import { ContributionScreen } from "../screens/contribution-screen";
import { ownContributions } from "../test-support/contribution-data";
import { matchDetail } from "@/features/sporting/test-support/consultation-data";
import { getGetMyAccountQueryKey } from "../../../../.generated/mobile";
import type { OwnStreamContributionDetailResponse } from "../../../../.generated/schemas/index.zod";

jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
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
  usePreventRemove: jest.fn(),
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    dismissTo: mockDismissTo,
    canGoBack: () => true,
  }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, init?: RequestInit) =>
    String(url).endsWith("/application-access")
      ? Promise.resolve(
          Response.json({
            ...mockApplicationAccessResponse(),
            maintenance: {
              ...mockApplicationAccessResponse().maintenance,
              active: mockMaintenance,
            },
          }),
        )
      : mockFetch(url, init),
}));
let mockMaintenance = false;
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockDismissTo = jest.fn();
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const previous = { ...process.env };
const match = matchDetail();
const account = accountResponse();
const accepted = {
  revision: "next",
  contribution: {
    id: "00000000-0000-4000-8000-000000000003",
    url: "https://youtu.be/example",
    platform: "youtube",
    state: "active",
    submittedAt: "2026-10-28T10:00:00Z",
    canWithdraw: true,
  },
} satisfies OwnStreamContributionDetailResponse;
let publicClient = createQueryClient();
let client = publicClient;
// Failure presentation is isolated here; native retry defaults have their own Query suite.
publicClient.setQueryDefaults([], { retry: false });
let context = ownContributions();
let failRefresh = false;
let posts: RequestInit[] = [];
beforeEach(() => {
  jest.useFakeTimers();
  publicClient = createQueryClient();
  client = publicClient;
  // Failure presentation is isolated here; native retry defaults have their own Query suite.
  publicClient.setQueryDefaults([], { retry: false });
  mockMaintenance = false;
  context = ownContributions();
  failRefresh = false;
  posts = [];
  mockPush.mockReset();
  mockBack.mockReset();
  mockDismissTo.mockReset();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
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
  mockAuth0.webAuth
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|synthetic"));
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockFetch.mockReset().mockImplementation(async (url, init) => {
    if (String(url).endsWith("/me")) {
      return Response.json(account);
    }
    if (String(url).includes("/stream-contributions")) {
      if (init?.method === "POST") {
        posts.push(init);
        return Response.json(accepted, { status: 201 });
      }
      if (failRefresh) {
        return Response.json(
          {
            type: "urn:blockout:problem:unavailable",
            title: "Unavailable",
            status: 503,
          },
          { status: 503 },
        );
      }
      return Response.json(context);
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
  publicClient.clear();
  // Await pending native/Query batches before restoring the test's real timer environment.
  await act(async () => jest.runOnlyPendingTimersAsync());
  jest.useRealTimers();
  process.env = { ...previous };
  jest.restoreAllMocks();
});

/** Real session, generated HTTP, Query, screen and RHF form; native SDK/HTTP/navigation alone are controlled. */
async function mount(
  content: ReactNode = <ContributionScreen matchId={match.match.id} />,
) {
  await render(
    <QueryClientProvider client={publicClient}>
      <ThemeProvider>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <PrivateQueries>
              <AccountFeedbackProvider>
                {content}
                <SessionExit />
              </AccountFeedbackProvider>
            </PrivateQueries>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

/** Exercises the actual session invalidation while a generated write is pending. */
function SessionExit() {
  const session = useAccountSession();
  const access = useApplicationAccess();
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quitter la session"
        onPress={() => void session.clearCredentials()}
      >
        <Text>Quitter</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Activer le contournement"
        accessibilityState={{ disabled: !session.accountId }}
        disabled={!session.accountId}
        onPress={() => access.requestBypass(session, true)}
      >
        <Text>Contournement</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Revenir au compte"
        onPress={() => void session.signIn("mobile-test")}
      >
        <Text>Revenir</Text>
      </Pressable>
    </>
  );
}

it("invites a guest without retaining a deferred publication", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  const user = userEvent.setup();
  await mount();

  // When
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/sign-in-invitation",
    params: { reason: "contribution" },
  });
  expect(posts).toHaveLength(0);
});

it.each([
  "La contribution n’est pas autorisée dans la situation actuelle.",
  "Le compte doit avoir au moins sept jours.",
  "L’ancienneté du compte est indisponible. Réessayez.",
  "L’heure du match doit être confirmée.",
  "La publication ouvre une heure avant le match.",
  "Les contributions ne sont pas disponibles pour ce match professionnel.",
])(
  "keeps a refused form unavailable without an eligibility ledger: %s",
  async (reason) => {
    // Given
    context = ownContributions({
      eligibility: { canSubmit: false, requiresApproval: false, reason },
    });
    await mount();

    // When
    await screen.findByLabelText("Adresse du lien");

    // Then
    expect(
      screen.getByRole("button", { name: "Soumettre le lien" }),
    ).toBeDisabled();
    expect(screen.queryByText(reason)).not.toBeOnTheScreen();
    expect(screen.queryByText(/Disponible à partir du/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/versions pour ce match/)).not.toBeOnTheScreen();
    expect(posts).toHaveLength(0);
  },
);

it("validates unsupported addresses before any request", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    "https://youtube.com.evil.invalid/video",
  );

  // When
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));

  // Then
  expect(
    await screen.findByText(
      "Utilisez une adresse HTTP(S) YouTube, Twitch ou Facebook sans identifiants.",
    ),
  ).toBeOnTheScreen();
  expect(posts).toHaveLength(0);
  expect(Alert.alert).not.toHaveBeenCalled();
});

it("retains dirty input through refresh and a refused submission", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    accepted.contribution.url,
  );
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Soumettre le lien" }),
    ).toBeEnabled(),
  );
  expect(screen.getByDisplayValue(accepted.contribution.url)).toBeOnTheScreen();
  mockFetch.mockImplementationOnce(async () =>
    Response.json(
      {
        type: "urn:blockout:problem:unprocessable-content",
        title: "Refused",
        status: 422,
      },
      { status: 422 },
    ),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));

  // Then
  await screen.findByText("Le lien a été refusé. Votre saisie est conservée.");
  expect(screen.getByDisplayValue(accepted.contribution.url)).toBeOnTheScreen();
  expect(mockDismissTo).not.toHaveBeenCalled();
});

it("keeps confirmed success when dependent refresh fails and disables its pending submit", async () => {
  // Given
  const pending = Promise.withResolvers<Response>();
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    accepted.contribution.url,
  );
  mockFetch.mockImplementationOnce(async (_url, init) => {
    if (init) {
      posts.push(init);
    }
    return pending.promise;
  });

  // When
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));
  failRefresh = true;
  await act(async () =>
    pending.resolve(Response.json(accepted, { status: 201 })),
  );

  // Then
  await waitFor(() => expect(mockDismissTo).toHaveBeenCalledTimes(1));
  expect(posts).toHaveLength(1);
  expect(JSON.parse(String(posts[0].body))).toEqual({
    revision: "initial",
    url: accepted.contribution.url,
  });
});

it("ignores a late accepted response after session departure", async () => {
  // Given
  const pending = Promise.withResolvers<Response>();
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    accepted.contribution.url,
  );
  mockFetch.mockImplementationOnce(() => pending.promise);
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));

  // When
  await user.press(screen.getByRole("button", { name: "Quitter la session" }));
  await act(async () =>
    pending.resolve(Response.json(accepted, { status: 201 })),
  );

  // Then
  expect(mockDismissTo).not.toHaveBeenCalled();
  expect(
    await screen.findByRole("button", { name: "Se connecter" }),
  ).toBeOnTheScreen();
});

it("suspends submission when the current profile is unavailable and permits a read-only retry", async () => {
  // Given
  const user = userEvent.setup();
  const reads = mockFetch.getMockImplementation();
  let unavailable = true;
  mockFetch.mockImplementation(async (url, init) => {
    if (String(url).endsWith("/me") && unavailable) {
      unavailable = false;
      return Response.json(
        {
          type: "urn:blockout:problem:unavailable",
          title: "Unavailable",
          status: 503,
        },
        { status: 503 },
      );
    }
    if (!reads) {
      throw new Error("Missing test HTTP boundary");
    }
    return reads(url, init);
  });
  await mount();

  // When
  await user.press(await screen.findByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByLabelText("Adresse du lien")).toBeOnTheScreen();
  expect(posts).toHaveLength(0);
});

it("retains the typed address through account read failure and a GET-only retry", async () => {
  // Given: the session and RHF form are real; only the account HTTP read is controlled.
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    "https://youtu.be/retained",
  );
  const boundary = mockFetch.getMockImplementation();
  let unavailable = true;
  mockFetch.mockImplementation(async (url, init) => {
    if (String(url).endsWith("/me") && unavailable) {
      return Response.json({ status: 503 }, { status: 503 });
    }
    if (!boundary) {
      throw new Error("Missing test HTTP boundary");
    }
    return boundary(url, init);
  });

  // When
  await act(() =>
    client.refetchQueries({ queryKey: getGetMyAccountQueryKey(), exact: true }),
  );

  // Then
  expect(
    await screen.findByRole("button", { name: "Réessayer" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByDisplayValue("https://youtu.be/retained", {
      includeHiddenElements: true,
    }),
  ).not.toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Soumettre le lien" }),
  ).not.toBeOnTheScreen();

  // When
  unavailable = false;
  const beforeRetry = mockFetch.mock.calls.length;
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Réessayer" }),
    ).not.toBeOnTheScreen(),
  );
  expect(mockFetch.mock.calls.slice(beforeRetry)).toEqual([
    [
      expect.stringContaining("/me"),
      expect.objectContaining({ method: "GET" }),
    ],
  ]);
  expect(
    screen.getByDisplayValue("https://youtu.be/retained"),
  ).toBeOnTheScreen();
  expect(posts).toHaveLength(0);
});

it("uses moderator eligibility without local age, clock, quota or Pro gates", async () => {
  // Given
  context = ownContributions({
    quota: {
      versionsUsed: 3,
      dailyMatchesUsed: 3,
      matchCountedToday: false,
      dayEndsAt: "2026-10-29T00:00:00+01:00",
    },
  });
  const moderator = accountResponse({
    permissions: { ...account.permissions, moderateStreamLinks: true },
    principalCreatedAt: null,
  });
  mockFetch.mockImplementationOnce(async () => Response.json(moderator));
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    accepted.contribution.url,
  );

  // When
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));

  // Then
  await waitFor(() => expect(mockDismissTo).toHaveBeenCalledTimes(1));
  expect(posts).toHaveLength(1);
});

it("refuses malformed generated reads before cache admission", async () => {
  // Given
  mockFetch.mockImplementation(async (url) => {
    if (String(url).endsWith("/me")) {
      return Response.json(account);
    }
    if (String(url).includes("/stream-contributions")) {
      return Response.json({ ...context, revision: null });
    }
    return Response.json(match);
  });
  await mount();

  // When
  await screen.findByRole("button", { name: "Réessayer" });

  // Then
  expect(screen.queryByLabelText("Adresse du lien")).not.toBeOnTheScreen();
  expect(
    client
      .getQueryCache()
      .getAll()
      .filter((q) =>
        q.queryKey.some(
          (part) =>
            typeof part === "string" && part.includes("stream-contributions"),
        ),
      )
      .every((q) => q.state.data === undefined),
  ).toBe(true);
  expect(posts).toHaveLength(0);
});

it("keeps a draft after conflict and requires a fresh explicit submission", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    accepted.contribution.url,
  );
  context = ownContributions({ revision: "current" });
  mockFetch.mockImplementationOnce(async (_url, init) => {
    if (init) {
      posts.push(init);
    }
    return Response.json(
      {
        type: "urn:blockout:problem:stale-revision",
        title: "Conflict",
        status: 409,
      },
      { status: 409 },
    );
  });

  // When
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Soumettre le lien" }),
    ).toBeEnabled(),
  );

  // Then
  expect(posts).toHaveLength(1);
  expect(screen.getByDisplayValue(accepted.contribution.url)).toBeOnTheScreen();
  expect(mockDismissTo).not.toHaveBeenCalled();

  // When: a new explicit action uses the newly observed revision.
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));

  // Then
  await waitFor(() => expect(mockDismissTo).toHaveBeenCalledTimes(1));
  expect(posts).toHaveLength(2);
  expect(JSON.parse(String(posts[1].body)).revision).toBe("current");
});

it("does not replay a guest invitation after explicit sign-in", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  const user = userEvent.setup();
  await mount();
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));

  // When
  await user.press(screen.getByRole("button", { name: "Revenir au compte" }));

  // Then
  expect(await screen.findByLabelText("Adresse du lien")).toHaveDisplayValue(
    "",
  );
  expect(posts).toHaveLength(0);
  expect(mockDismissTo).not.toHaveBeenCalled();
});

it("retains the address after a new time restriction without adding availability copy", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    accepted.contribution.url,
  );
  context = ownContributions({
    eligibility: {
      canSubmit: false,
      requiresApproval: false,
      reason: "La publication ouvre une heure avant le match.",
      eligibleAt: "2026-11-01T14:00:00+01:00",
    },
  });
  mockFetch.mockImplementationOnce(async (_url, init) => {
    if (init) {
      posts.push(init);
    }
    return Response.json(
      {
        type: "urn:blockout:problem:unprocessable-content",
        title: "Refused",
        status: 422,
      },
      { status: 422 },
    );
  });

  // When
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));

  // Then
  expect(
    await screen.findByText(
      "Le lien a été refusé. Votre saisie est conservée.",
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/Disponible à partir du/)).not.toBeOnTheScreen();
  expect(screen.getByDisplayValue(accepted.contribution.url)).toBeOnTheScreen();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Soumettre le lien" }),
    ).toBeDisabled(),
  );
  expect(posts).toHaveLength(1);
});

it("presents only the address and supported platforms before submission", async () => {
  // Given
  await mount();

  // When
  await screen.findByLabelText("Adresse du lien");

  // Then: the ordinary form has no repeated introduction, availability disclaimer or quota counters.
  expect(screen.getByText("YouTube, Twitch ou Facebook")).toBeOnTheScreen();
  expect(
    screen.queryByText("Une adresse de diffusion pour ce match."),
  ).not.toBeOnTheScreen();
  expect(screen.queryByText(/L’adresse ne prouve pas/)).not.toBeOnTheScreen();
  expect(screen.queryByText(/versions pour ce match/)).not.toBeOnTheScreen();
});

it("refreshes the actual F03 match key after a publication under explicit maintenance bypass", async () => {
  // Given
  mockMaintenance = true;
  const moderator = accountResponse({
    permissions: {
      ...account.permissions,
      moderateStreamLinks: true,
      bypassMaintenance: true,
    },
  });
  const reads = mockFetch.getMockImplementation();
  let matchReads = 0;
  mockFetch.mockImplementation(async (url, init) => {
    if (String(url).endsWith("/me")) {
      return Response.json(moderator);
    }
    if (new URL(String(url)).pathname === `/matches/${match.match.id}`) {
      matchReads++;
    }
    if (!reads) {
      throw new Error("Missing test HTTP boundary");
    }
    return reads(url, init);
  });
  const user = userEvent.setup();
  await mount();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Activer le contournement" }),
    ).toBeEnabled(),
  );
  await user.press(
    screen.getByRole("button", { name: "Activer le contournement" }),
  );
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    accepted.contribution.url,
  );
  await waitFor(() => expect(client.isFetching()).toBe(0));
  const before = matchReads;

  // When
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));

  // Then
  await waitFor(() => expect(matchReads).toBeGreaterThan(before));
  expect(posts).toHaveLength(1);
  expect(new Headers(posts[0].headers).get("Blockout-Maintenance-Bypass")).toBe(
    "true",
  );
});

it("shows compact match context without inventing unknown scores or extra sporting navigation", async () => {
  // Given: the public match has no published score.

  // When
  await mount();
  await screen.findByLabelText("Adresse du lien");

  // Then
  expect(screen.getByText("Home")).toBeOnTheScreen();
  expect(screen.getByText("Away")).toBeOnTheScreen();
  expect(screen.queryByText("À venir")).not.toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Score domicile : indisponible"),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: /Home · Score/ }),
  ).not.toBeOnTheScreen();
});

it("delegates failed native session restoration to F05 instead of showing an endless loader", async () => {
  // Given
  mockAuth0.getCredentials.mockRejectedValue(
    new Error("Synthetic native restoration failure"),
  );
  const user = userEvent.setup();
  await mount();

  // When
  mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|synthetic"));
  await user.press(await screen.findByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByLabelText("Adresse du lien")).toBeOnTheScreen();
  expect(mockPush).not.toHaveBeenCalled();
  expect(posts).toHaveLength(0);
});

it("submits the entered address directly without an extra confirmation", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    "https://youtu.be/direct",
  );

  // When
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));

  // Then
  await waitFor(() => expect(mockDismissTo).toHaveBeenCalledTimes(1));
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining(
      `/accounts/${account.accountId}/matches/${match.match.id}/stream-contributions`,
    ),
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        revision: "initial",
        url: "https://youtu.be/direct",
      }),
    }),
  );
});

/** Exercises the actual retained editor and generated command owner without the surrounding personal list. */
function ReplacementForm() {
  const editing = useOwnContributions(match.match.id);
  const current = editing.query.data?.pages[0];
  return current ? (
    <ContributionForm
      matchId={match.match.id}
      current={current}
      editing={editing}
      replacement={current.activeContribution}
    />
  ) : null;
}

it("updates a pristine replacement field when the current active version changes", async () => {
  // Given: the retained Query data initially seeds version A without any user edit.
  context = ownContributions({
    proposalCount: 1,
    activeContribution: accepted.contribution,
  });
  await mount(<ReplacementForm />);
  expect(await screen.findByLabelText("Adresse du lien")).toHaveDisplayValue(
    accepted.contribution.url,
  );
  const replacement = {
    ...accepted.contribution,
    id: "00000000-0000-4000-8000-000000000009",
    url: "https://youtu.be/current-version",
  };
  context = ownContributions({
    revision: "current-version",
    proposalCount: 2,
    activeContribution: replacement,
  });

  // When: a successful original-account read accepts version B.
  await act(async () =>
    client.refetchQueries({
      predicate: (query) =>
        query.queryKey.some(
          (part) =>
            typeof part === "string" && part.includes("stream-contributions"),
        ),
    }),
  );

  // Then
  await waitFor(() =>
    expect(screen.getByLabelText("Adresse du lien")).toHaveDisplayValue(
      replacement.url,
    ),
  );
  expect(
    screen.getByRole("button", { name: "Remplacer le lien" }),
  ).toBeEnabled();
  expect(posts).toHaveLength(0);
  expect(Alert.alert).not.toHaveBeenCalled();
});

it("prefills the published URL once and preserves a changed replacement through a successful refetch", async () => {
  // Given
  context = ownContributions({
    proposalCount: 1,
    activeContribution: accepted.contribution,
  });
  const user = userEvent.setup();
  await mount(<ReplacementForm />);
  expect(await screen.findByLabelText("Adresse du lien")).toHaveDisplayValue(
    accepted.contribution.url,
  );
  await user.clear(screen.getByLabelText("Adresse du lien"));
  await user.type(
    screen.getByLabelText("Adresse du lien"),
    "https://youtu.be/edited",
  );
  context = ownContributions({
    revision: "new-read",
    proposalCount: 2,
    activeContribution: {
      ...accepted.contribution,
      id: "00000000-0000-4000-8000-000000000009",
      url: "https://youtu.be/refetched",
    },
  });

  // When
  await act(async () =>
    client.refetchQueries({
      predicate: (query) =>
        query.queryKey.some(
          (part) =>
            typeof part === "string" && part.includes("stream-contributions"),
        ),
    }),
  );

  // Then
  expect(screen.getByLabelText("Adresse du lien")).toHaveDisplayValue(
    "https://youtu.be/edited",
  );
  expect(
    screen.getByRole("header", { name: "Votre lien public" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Remplacer le lien" }),
  ).toBeEnabled();
  expect(posts).toHaveLength(0);
});

it("replaces directly using the viewed revision and returns after acknowledgement", async () => {
  // Given
  context = ownContributions({ activeContribution: accepted.contribution });
  const user = userEvent.setup();
  await mount(<ReplacementForm />);
  await user.clear(await screen.findByLabelText("Adresse du lien"));
  await user.type(
    screen.getByLabelText("Adresse du lien"),
    "https://youtu.be/replacement",
  );

  // When
  await user.press(screen.getByRole("button", { name: "Remplacer le lien" }));

  // Then
  await waitFor(() =>
    expect(mockDismissTo).toHaveBeenCalledWith({
      pathname: "/matches/[matchId]",
      params: { matchId: match.match.id },
    }),
  );
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(posts).toHaveLength(1);
  expect(posts[0].method).toBe("POST");
  expect(JSON.parse(String(posts[0].body))).toEqual({
    revision: "initial",
    url: "https://youtu.be/replacement",
  });
});

it("withdraws only the confirmed published version despite an edited draft and unavailable submission eligibility", async () => {
  // Given
  context = ownContributions({
    activeContribution: accepted.contribution,
    eligibility: { canSubmit: false, requiresApproval: false },
  });
  const boundary = mockFetch.getMockImplementation();
  const writes: { url: string; body: unknown }[] = [];
  mockFetch.mockImplementation(async (url, init) => {
    if (init?.method === "PATCH") {
      writes.push({ url: String(url), body: JSON.parse(String(init.body)) });
      return Response.json({
        ...accepted,
        contribution: {
          ...accepted.contribution,
          state: "withdrawn",
          canWithdraw: false,
        },
      });
    }
    if (!boundary) {
      throw new Error("Missing test HTTP boundary");
    }
    return boundary(url, init);
  });
  const user = userEvent.setup();
  await mount(<ReplacementForm />);
  await user.clear(await screen.findByLabelText("Adresse du lien"));
  await user.type(
    screen.getByLabelText("Adresse du lien"),
    "https://youtu.be/unsaved",
  );

  // When
  await user.press(screen.getByRole("button", { name: "Retirer" }));

  // Then
  expect(jest.mocked(Alert.alert).mock.calls[0]?.[1]).toContain(
    accepted.contribution.url,
  );
  expect(jest.mocked(Alert.alert).mock.calls[0]?.[1]).not.toContain("unsaved");
  expect(writes).toHaveLength(0);

  // When
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls[0]?.[2]?.find((button) => button.text === "Retirer le lien")
      ?.onPress?.(),
  );

  // Then
  await waitFor(() =>
    expect(mockDismissTo).toHaveBeenCalledWith({
      pathname: "/matches/[matchId]",
      params: { matchId: match.match.id },
    }),
  );
  expect(writes).toEqual([
    {
      url: expect.stringContaining(
        `/stream-contributions/${accepted.contribution.id}`,
      ),
      body: { action: "withdraw", revision: "initial" },
    },
  ]);
  expect(posts).toHaveLength(0);
});

it.each(["cancel", "session", "unmount"])(
  "does not dispatch a held withdrawal after %s",
  async (departure) => {
    // Given
    context = ownContributions({ activeContribution: accepted.contribution });
    const user = userEvent.setup();
    await mount(<ReplacementForm />);
    await user.press(await screen.findByRole("button", { name: "Retirer" }));
    const buttons = jest.mocked(Alert.alert).mock.calls[0]?.[2];
    const confirm = buttons?.find(
      (button) => button.text === "Retirer le lien",
    )?.onPress;

    // When
    if (departure === "cancel") {
      await act(async () =>
        buttons?.find((button) => button.style === "cancel")?.onPress?.(),
      );
    }
    if (departure === "session") {
      await user.press(
        screen.getByRole("button", { name: "Quitter la session" }),
      );
    }
    if (departure === "unmount") {
      await cleanup();
    }
    await act(async () => confirm?.());

    // Then
    expect(
      mockFetch.mock.calls.some(([, init]) => init?.method === "PATCH"),
    ).toBe(false);
    expect(mockDismissTo).not.toHaveBeenCalled();
  },
);

/** Captures the identity-owned private cache while retaining the public cache for fixture cleanup. */
function PrivateQueries({ children }: Readonly<PropsWithChildren>) {
  const privateClient = useQueryClient();
  // Configure deterministic failure presentation before child Query observers mount.
  privateClient.setQueryDefaults([], { retry: false, gcTime: Infinity });
  privateClient.setMutationDefaults([], { gcTime: Infinity });
  useLayoutEffect(() => {
    client = privateClient;
  }, [privateClient]);
  return children;
}
