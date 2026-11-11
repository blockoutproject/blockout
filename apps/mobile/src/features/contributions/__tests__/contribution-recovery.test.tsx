import { useLayoutEffect, type PropsWithChildren } from "react";
import {
  QueryClientProvider,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Alert, Text } from "react-native";
import {
  getGetMatchQueryKey,
  getGetMyAccountQueryKey,
  getGetModeratedStreamContributionQueryKey,
} from "../../../../.generated/mobile";
import type {
  ModeratedStreamContributionResponse,
  ModeratedStreamContributionsResponse,
  OwnStreamContributionResponse,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
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
import { useConsultationQueries } from "../../sporting/match-consultation";
import { useOwnContributions } from "../api/own-contributions";
import { useModerationMatch, useModerationQueue } from "../api/moderation";
import { ContributionScreen } from "../screens/contribution-screen";
import { OwnContributionsScreen } from "../screens/own-contributions-screen";
import { ReportContributionScreen } from "../screens/report-contribution-screen";
import { ownContributions } from "../test-support/contribution-data";

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
  useNavigation: () => ({ isFocused: () => true }),
  usePreventRemove: jest.fn(),
  useRouter: () => ({
    push: jest.fn(),
    back: mockBack,
    dismissTo: mockDismissTo,
    canGoBack: () => true,
  }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, init?: RequestInit) => mockFetch(url, init),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const mockDismissTo = jest.fn();
const mockBack = jest.fn();
const previous = { ...process.env };
const match = matchDetail();
const account = accountResponse({ permissions: { moderateStreamLinks: true } });
const version = {
  id: "00000000-0000-4000-8000-000000000099",
  url: "https://youtu.be/viewed",
  platform: "youtube",
  state: "active",
  submittedAt: "2026-10-28T10:00:00Z",
  canWithdraw: true,
} satisfies OwnStreamContributionResponse;
const moderatedVersion = {
  id: version.id,
  url: version.url,
  platform: version.platform,
  state: version.state,
  submittedAt: version.submittedAt,
  canWithdraw: version.canWithdraw,
  reportCount: 0,
  canApprove: false,
  canReject: false,
  canReactivate: false,
  decisions: [],
} satisfies ModeratedStreamContributionResponse;
let profile = account;
let owner = ownContributions();
let detail: ModeratedStreamContributionsResponse;
let failRead = false;
let reported = false;
let write: () => Promise<Response>;
let writes: { url: string; body: unknown; authorization: string | null }[];
let reads: string[];
let publicClient = createQueryClient();
let client = publicClient;

beforeEach(() => {
  jest.useFakeTimers();
  publicClient = createQueryClient();
  client = publicClient;
  publicClient.setQueryDefaults([], { retry: false });
  profile = account;
  owner = ownContributions();
  detail = {
    revision: "viewed",
    match: {
      ...match.match,
      seasonId: match.match.pool.season.id,
      publiclyViewable: true,
    },
    counts: { active: 1, pending: 0, hidden: 0, reports: 0, rejected: 0 },
    approvalRequiredAfterReports: false,
    canPublish: true,
    activeContribution: moderatedVersion,
    items: [moderatedVersion],
  };
  failRead = false;
  reported = false;
  writes = [];
  reads = [];
  write = async () =>
    Response.json({ revision: "accepted", contribution: moderatedVersion });
  mockDismissTo.mockReset();
  mockBack.mockReset();
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
  mockAuth0.webAuth.mockReset();
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
  mockFetch.mockReset().mockImplementation(async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("/application-access")) {
      return Response.json(applicationAccessResponse());
    }
    if (path.endsWith("/me")) {
      return Response.json(profile);
    }
    if (init?.method === "POST" || init?.method === "PATCH") {
      writes.push({
        url: String(url),
        body: JSON.parse(String(init.body)),
        authorization: new Headers(init.headers).get("Authorization"),
      });
      return write();
    }
    reads.push(path);
    if (failRead) {
      throw new TypeError("Controlled read outage");
    }
    if (path.endsWith("/report")) {
      return Response.json({ reported });
    }
    if (path.endsWith("/stream-moderation")) {
      return Response.json({ items: [], total: 0 });
    }
    if (path.includes("/administration/")) {
      return Response.json(detail);
    }
    if (path.includes("/stream-contributions")) {
      return Response.json(owner);
    }
    return Response.json(match);
  });
});
afterEach(async () => {
  await act(async () => {
    await client.cancelQueries();
  });
  await cleanup();
  client.clear();
  publicClient.clear();
  await act(async () => jest.runOnlyPendingTimersAsync());
  jest.useRealTimers();
  process.env = { ...previous };
  jest.restoreAllMocks();
});

/** Uses F05's actual principal-owned client; deterministic read retries do not alter write policy. */
function PrivateQueries({ children }: Readonly<PropsWithChildren>) {
  const privateClient = useQueryClient();
  privateClient.setQueryDefaults([], { retry: false, gcTime: Infinity });
  privateClient.setMutationDefaults([], { gcTime: Infinity });
  useLayoutEffect(() => {
    client = privateClient;
  }, [privateClient]);
  return children;
}

/** Only native credentials, HTTP and navigation are doubled; generated calls and application providers stay real. */
function Wrapper({ children }: Readonly<PropsWithChildren>) {
  return (
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
  );
}

/** Observes the real F03 resource so settlement must refresh its authorized projection too. */
function useOwner() {
  const editing = useOwnContributions(match.match.id);
  const matchQuery = useQuery(useConsultationQueries().match(match.match.id));
  return { ...editing, matchQuery };
}

/** Keeps actual private queue and detail observers mounted for mutation invalidation. */
function useModerator() {
  const editing = useModerationMatch(match.match.id);
  const queue = useModerationQueue({});
  const matchQuery = useQuery(useConsultationQueries().match(match.match.id));
  return { ...editing, queue, matchQuery };
}

/** Selects the mutation result whose explicit command is exercised by each action variant. */
function selectedMutation(
  current: ReturnType<typeof useModerator>,
  action: string,
) {
  if (action === "publish") {
    return current.publish;
  }
  if (action === "reactivate") {
    return current.reactivate;
  }
  return current.change;
}

/** Accepts the existing native dialog exactly once without replacing its confirmation owner. */
async function confirm(label: string) {
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls.at(-1)?.[2]
      ?.find((button) => button.text === label)
      ?.onPress?.(),
  );
}

it.each([
  { status: 401, type: "unauthenticated" },
  { status: 403, type: "forbidden" },
  { status: 404, type: "not-found" },
])(
  "withdraws moderator availability after a current-account $status without a render exception",
  async ({ status, type }) => {
    // Given: actual account and moderation owners share the principal's Query client.
    const { result } = await renderHook(useModerator, { wrapper: Wrapper });
    await waitFor(() => expect(result.current.allowed).toBe(true));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    mockFetch.mockResolvedValueOnce(
      Response.json(
        { status, type: `urn:blockout:problem:${type}`, title: "Refused" },
        { status },
      ),
    );

    // When
    await act(async () => {
      await result.current.profile.refetch();
    });

    // Then
    await waitFor(() => expect(result.current.allowed).toBe(false));
    expect(result.current.canRetain).toBe(false);
    expect(result.current.profile.data).toBeNull();
    expect(writes).toHaveLength(0);

    // When: a fresh authorized read restores this same account's current grant.
    await act(async () => {
      await result.current.profile.refetch();
    });

    // Then
    await waitFor(() => expect(result.current.allowed).toBe(true));
    expect(result.current.profile.data?.accountId).toBe(account.accountId);
    expect(writes).toHaveLength(0);
  },
);

it("offers account recovery when proposals open after a failed retained-account read", async () => {
  // Given: the account was accepted on a different screen, then its reread failed.
  const user = userEvent.setup();
  const view = await render(<Text>Another route</Text>, { wrapper: Wrapper });
  await waitFor(() =>
    expect(client.getQueryData(getGetMyAccountQueryKey())).toEqual(account),
  );
  await waitFor(() => expect(client.isFetching()).toBe(0));
  const boundary = mockFetch.getMockImplementation();
  if (!boundary) {
    throw new Error("Missing test HTTP boundary");
  }
  let unavailable = true;
  mockFetch.mockImplementation((url, init) =>
    String(url).endsWith("/me") && unavailable
      ? Promise.reject(new TypeError("Controlled account outage"))
      : boundary(url, init),
  );
  let reading: Promise<void> | undefined;
  await act(async () => {
    reading = client.refetchQueries({
      queryKey: getGetMyAccountQueryKey(),
      exact: true,
    });
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(7_000);
    await reading;
  });

  // When
  await view.rerender(<OwnContributionsScreen matchId={match.match.id} />);

  // Then: the disabled dependent Query must not leave an empty body.
  expect(await screen.findByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();
  expect(reads.some((path) => path.includes("/stream-contributions"))).toBe(
    false,
  );

  // When
  unavailable = false;
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByRole("header", { name: "Mes propositions (0)" }),
  ).toBeOnTheScreen();
  expect(writes).toHaveLength(0);
});

it.each(
  (["submit", "withdraw"] as const).flatMap((action) =>
    (["lost", "conflict"] as const).map((outcome) => ({ action, outcome })),
  ),
)(
  "invalidates owner and public reads after $action $outcome without replay",
  async ({ action, outcome }) => {
    // Given
    const { result } = await renderHook(useOwner, { wrapper: Wrapper });
    await waitFor(() =>
      expect(
        result.current.query.isSuccess && result.current.matchQuery.isSuccess,
      ).toBe(true),
    );
    const baselineReads = reads.length;
    write = async () => {
      owner = ownContributions({ revision: "newer" });
      if (outcome === "lost") {
        throw new TypeError("Lost acknowledgement");
      }
      return Response.json(
        {
          status: 409,
          title: "Conflict",
          type: "urn:blockout:problem:stale-revision",
        },
        { status: 409 },
      );
    };

    // When
    await act(async () => {
      const attempt =
        action === "submit"
          ? result.current.submit.mutateAsync({
              revision: "initial",
              url: version.url,
            })
          : result.current.change.mutateAsync({
              versionId: version.id,
              body: { action, revision: "initial" },
            });
      await expect(attempt).rejects.toBeInstanceOf(ApiError);
    });

    // Then
    await waitFor(() =>
      expect(result.current.query.data?.pages[0].revision).toBe("newer"),
    );
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(reads.slice(baselineReads)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("stream-contributions"),
        `/matches/${match.match.id}`,
      ]),
    );
    expect(writes).toHaveLength(1);
    expect(writes[0].body).toEqual(
      action === "submit"
        ? { revision: "initial", url: version.url }
        : { action, revision: "initial" },
    );
    expect(writes[0].url).toContain(
      action === "submit"
        ? `/matches/${match.match.id}/stream-contributions`
        : `/stream-contributions/${version.id}`,
    );
    expect(
      (action === "submit" ? result.current.submit : result.current.change)
        .isError,
    ).toBe(true);
  },
);

it.each(
  (["publish", "approve", "reject", "withdraw", "reactivate"] as const).flatMap(
    (action) =>
      (["lost", "conflict"] as const).map((outcome) => ({ action, outcome })),
  ),
)(
  "invalidates moderation resources after $action $outcome without inferring historical execution",
  async ({ action, outcome }) => {
    // Given
    const { result } = await renderHook(useModerator, { wrapper: Wrapper });
    await waitFor(() =>
      expect(
        result.current.query.isSuccess &&
          result.current.queue.query.isSuccess &&
          result.current.matchQuery.isSuccess,
      ).toBe(true),
    );
    const memberKey = getGetModeratedStreamContributionQueryKey(
      match.match.id,
      version.id,
    );
    client.setQueryData(memberKey, {
      revision: "viewed",
      contribution: moderatedVersion,
    });
    const baselineReads = reads.length;
    write = async () => {
      detail = { ...detail, revision: "someone-else-later" };
      if (outcome === "lost") {
        throw new TypeError("Lost acknowledgement");
      }
      return Response.json(
        {
          status: 409,
          title: "Conflict",
          type: "urn:blockout:problem:stale-revision",
        },
        { status: 409 },
      );
    };

    // When
    await act(async () => {
      const body = { revision: "viewed", actorAccountId: account.accountId };
      let attempt: Promise<unknown>;
      if (action === "publish") {
        attempt = result.current.publish.mutateAsync({
          ...body,
          url: version.url,
        });
      } else if (action === "reactivate") {
        attempt = result.current.reactivate.mutateAsync({
          versionId: version.id,
          body,
        });
      } else {
        attempt = result.current.change.mutateAsync({
          versionId: version.id,
          body: { ...body, action },
        });
      }
      await expect(attempt).rejects.toBeInstanceOf(ApiError);
    });

    // Then
    await waitFor(() =>
      expect(result.current.query.data?.pages[0].revision).toBe(
        "someone-else-later",
      ),
    );
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(reads.slice(baselineReads)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("/stream-moderation"),
        expect.stringContaining("/administration/matches/"),
        `/matches/${match.match.id}`,
      ]),
    );
    expect(client.getQueryState(memberKey)?.isInvalidated).toBe(true);
    expect(writes).toHaveLength(1);
    let expectedCommand = {};
    if (action === "publish") {
      expectedCommand = { url: version.url };
    } else if (action !== "reactivate") {
      expectedCommand = { action };
    }
    expect(writes[0].body).toEqual({
      revision: "viewed",
      actorAccountId: account.accountId,
      ...expectedCommand,
    });
    const mutation = selectedMutation(result.current, action);
    expect(mutation.isError).toBe(true);
    expect(mutation.data).toBeUndefined();
  },
);

it("keeps confirmed report success when both dependent reads fail", async () => {
  // Given
  const user = userEvent.setup();
  await render(
    <ReportContributionScreen
      matchId={match.match.id}
      contributionId={version.id}
      contributionUrl={version.url}
    />,
    { wrapper: Wrapper },
  );
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Fictional private reason",
  );
  write = async () => {
    failRead = true;
    return Response.json({ reported: true }, { status: 201 });
  };

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(
    await screen.findByText("Votre signalement a été envoyé."),
  ).toBeOnTheScreen();
  expect(screen.queryByLabelText("Motif du signalement")).not.toBeOnTheScreen();
  expect(writes).toHaveLength(1);
});

it("retains a lost report's draft for a later explicit retry on the same version", async () => {
  // Given
  const user = userEvent.setup();
  await render(
    <ReportContributionScreen
      matchId={match.match.id}
      contributionId={version.id}
      contributionUrl={version.url}
    />,
    { wrapper: Wrapper },
  );
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Fictional private reason",
  );
  write = async () => {
    failRead = true;
    throw new TypeError("Lost report acknowledgement");
  };

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(
    await screen.findByText(
      "Une erreur est survenue. Veuillez réessayer plus tard.",
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByDisplayValue("Fictional private reason"),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: /Actualiser/ }),
  ).not.toBeOnTheScreen();
  expect(writes).toHaveLength(1);

  // When
  write = async () => Response.json({ reported: true });
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(
    await screen.findByText("Votre signalement a été envoyé."),
  ).toBeOnTheScreen();
  expect(writes).toHaveLength(2);
  expect(writes[1]).toEqual(writes[0]);
});

it("retains a dirty contribution after conflict and failed explicit refresh without claiming a successful read", async () => {
  // Given
  const user = userEvent.setup();
  await render(<ContributionScreen matchId={match.match.id} />, {
    wrapper: Wrapper,
  });
  await user.type(await screen.findByLabelText("Adresse du lien"), version.url);
  write = async () => {
    failRead = true;
    return Response.json(
      {
        type: "urn:blockout:problem:stale-revision",
        title: "Conflict",
        status: 409,
      },
      { status: 409 },
    );
  };

  // When
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));
  await confirm("Soumettre le lien");
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(screen.getByDisplayValue(version.url)).toBeOnTheScreen();
  expect(screen.queryByText(/L’état courant a été relu/)).not.toBeOnTheScreen();
  expect(mockDismissTo).not.toHaveBeenCalled();
  expect(writes).toHaveLength(1);
});

it.each(["submit", "withdraw"] as const)(
  "keeps confirmed %s separate from failed derivative reads",
  async (action) => {
    // Given
    const { result } = await renderHook(useOwner, { wrapper: Wrapper });
    await waitFor(() =>
      expect(
        result.current.query.isSuccess && result.current.matchQuery.isSuccess,
      ).toBe(true),
    );
    const previousData = result.current.query.data;
    write = async () => {
      failRead = true;
      return Response.json({ revision: "accepted", contribution: version });
    };

    // When
    await act(async () => {
      if (action === "submit") {
        await result.current.submit.mutateAsync({
          revision: "initial",
          url: version.url,
        });
      } else {
        await result.current.change.mutateAsync({
          versionId: version.id,
          body: { action, revision: "initial" },
        });
      }
    });

    // Then
    await waitFor(() =>
      expect(
        result.current.query.isError && result.current.matchQuery.isError,
      ).toBe(true),
    );
    expect(
      (action === "submit" ? result.current.submit : result.current.change)
        .isSuccess,
    ).toBe(true);
    expect(result.current.query.data).toBe(previousData);
    expect(writes).toHaveLength(1);
  },
);

it.each(["publish", "approve", "reject", "withdraw", "reactivate"] as const)(
  "keeps confirmed moderator %s separate from failed derivative reads",
  async (action) => {
    // Given
    const { result } = await renderHook(useModerator, { wrapper: Wrapper });
    await waitFor(() =>
      expect(
        result.current.query.isSuccess && result.current.queue.query.isSuccess,
      ).toBe(true),
    );
    const previousData = result.current.query.data;
    write = async () => {
      failRead = true;
      return Response.json({
        revision: "accepted",
        contribution: moderatedVersion,
      });
    };

    // When
    await act(async () => {
      const body = { revision: "viewed", actorAccountId: account.accountId };
      if (action === "publish") {
        await result.current.publish.mutateAsync({ ...body, url: version.url });
      } else if (action === "reactivate") {
        await result.current.reactivate.mutateAsync({
          versionId: version.id,
          body,
        });
      } else {
        await result.current.change.mutateAsync({
          versionId: version.id,
          body: { ...body, action },
        });
      }
    });

    // Then
    await waitFor(() =>
      expect(
        result.current.query.isError && result.current.queue.query.isError,
      ).toBe(true),
    );
    expect(selectedMutation(result.current, action).isSuccess).toBe(true);
    expect(result.current.query.data).toBe(previousData);
    expect(writes).toHaveLength(1);
  },
);

it("allows a read of newer state while a dispatched reactivation can still complete later", async () => {
  // Given
  const pending = Promise.withResolvers<Response>();
  const { result } = await renderHook(useModerator, { wrapper: Wrapper });
  await waitFor(() =>
    expect(result.current.query.data?.pages[0].revision).toBe("viewed"),
  );
  await waitFor(() => expect(client.isFetching()).toBe(0));
  write = () => pending.promise;
  let attempt: Promise<unknown> | undefined;
  await act(async () => {
    attempt = result.current.reactivate.mutateAsync({
      versionId: version.id,
      body: { actorAccountId: account.accountId, revision: "viewed" },
    });
  });
  await waitFor(() => expect(writes).toHaveLength(1));
  detail = { ...detail, revision: "newer-decision" };

  // When
  await act(async () => {
    const reread = await result.current.refresh();
    expect(reread[0].pages[0].revision).toBe("newer-decision");
  });

  // Then
  await waitFor(() =>
    expect(result.current.query.data?.pages[0].revision).toBe("newer-decision"),
  );
  expect(result.current.reactivate.isPending).toBe(true);
  expect(result.current.reactivate.data).toBeUndefined();

  // When
  await act(async () => {
    pending.resolve(
      Response.json({
        revision: "acknowledged",
        contribution: moderatedVersion,
      }),
    );
    await attempt;
  });

  // Then
  await waitFor(() => expect(result.current.reactivate.isSuccess).toBe(true));
  await waitFor(() =>
    expect(result.current.query.data?.pages[0].revision).toBe("newer-decision"),
  );
  expect(writes).toHaveLength(1);
});

it("keeps B's native identity and private client when A's dispatched mutation completes late", async () => {
  // Given
  const pending = Promise.withResolvers<Response>();
  const { result } = await renderHook(useOwner, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  const originalClient = client;
  write = () => pending.promise;
  let attempt: Promise<unknown> | undefined;
  await act(async () => {
    attempt = result.current.submit.mutateAsync({
      revision: "initial",
      url: version.url,
    });
  });
  await waitFor(() => expect(writes).toHaveLength(1));
  const credentialsB = {
    ...credentialsFor("auth0|other"),
    accessToken: "other-test-token",
  };
  profile = accountResponse({
    accountId: "00000000-0000-4000-8000-000000000077",
  });
  owner = ownContributions({ revision: "B-current" });
  mockAuth0.webAuth.mockResolvedValue(credentialsB);
  mockAuth0.getCredentials.mockResolvedValue(credentialsB);

  // When
  await act(async () => {
    await result.current.session.signIn("mobile-test");
  });
  await waitFor(() =>
    expect(result.current.query.data?.pages[0].revision).toBe("B-current"),
  );
  const otherClient = client;
  await act(async () => {
    pending.resolve(
      Response.json({ revision: "A-accepted", contribution: version }),
    );
    await attempt;
  });

  // Then
  expect(otherClient).not.toBe(originalClient);
  expect(client).toBe(otherClient);
  expect(result.current.session.subject).toBe("auth0|other");
  expect(result.current.session.accountId).toBe(profile.accountId);
  expect(result.current.submit.data).toBeUndefined();
  expect(result.current.query.data?.pages[0].revision).toBe("B-current");
  expect(writes).toEqual([
    {
      url: expect.stringContaining(`/accounts/${account.accountId}/`),
      body: { revision: "initial", url: version.url },
      authorization: "Bearer test-access-token",
    },
  ]);
});

it("refuses another subject's credentials captured before contribution dispatch", async () => {
  // Given
  const pending = Promise.withResolvers<ReturnType<typeof credentialsFor>>();
  const { result } = await renderHook(useOwner, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  mockAuth0.getCredentials.mockReturnValueOnce(pending.promise);
  let attempt: Promise<unknown> | undefined;
  await act(async () => {
    attempt = result.current.change
      .mutateAsync({
        versionId: version.id,
        body: { action: "withdraw", revision: "initial" },
      })
      .catch((error: unknown) => error);
  });

  // When
  await act(async () => {
    pending.resolve(credentialsFor("auth0|other"));
  });

  // Then
  expect(await attempt).toMatchObject({ kind: "cancelled" });
  expect(writes).toHaveLength(0);
  expect(result.current.session.subject).toBe("auth0|synthetic");
});

it.each(["success", "failure"] as const)(
  "suppresses late form %s feedback after its route unmounts",
  async (outcome) => {
    // Given
    const pending = Promise.withResolvers<Response>();
    const user = userEvent.setup();
    const view = await render(<ContributionScreen matchId={match.match.id} />, {
      wrapper: Wrapper,
    });
    await user.type(
      await screen.findByLabelText("Adresse du lien"),
      version.url,
    );
    write = () => pending.promise;
    await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));
    await confirm("Soumettre le lien");
    await waitFor(() => expect(writes).toHaveLength(1));

    // When
    await view.rerender(<Text>Another page</Text>);
    await act(async () => {
      if (outcome === "success") {
        pending.resolve(
          Response.json({ revision: "accepted", contribution: version }),
        );
      } else {
        pending.reject(new TypeError("Late network failure"));
      }
    });

    // Then
    expect(mockDismissTo).not.toHaveBeenCalled();
    expect(screen.getByText("Another page")).toBeOnTheScreen();
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
    expect(writes).toHaveLength(1);
  },
);

it("does not restore refused owner data when submission refusal is followed by an outage", async () => {
  // Given
  owner = ownContributions({ items: [version], proposalCount: 1 });
  const { result } = await renderHook(useOwner, { wrapper: Wrapper });
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
  write = async () => {
    failRead = true;
    return Response.json(
      {
        status: 403,
        title: "Forbidden",
        type: "urn:blockout:problem:forbidden",
      },
      { status: 403 },
    );
  };

  // When
  await act(async () => {
    await expect(
      result.current.submit.mutateAsync({
        revision: "initial",
        url: version.url,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  // Then
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await waitFor(() => expect(result.current.query.data).toBeUndefined());
  expect(writes).toHaveLength(1);
});

it("uses current positive report state after lost acknowledgement without another POST", async () => {
  // Given
  const user = userEvent.setup();
  await render(
    <ReportContributionScreen
      matchId={match.match.id}
      contributionId={version.id}
      contributionUrl={version.url}
    />,
    { wrapper: Wrapper },
  );
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Fictional private reason",
  );
  write = async () => {
    reported = true;
    throw new TypeError("Lost report acknowledgement");
  };

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(
    await screen.findByText("Vous avez déjà signalé ce lien."),
  ).toBeOnTheScreen();
  expect(screen.queryByLabelText("Motif du signalement")).not.toBeOnTheScreen();
  expect(
    screen.queryByText("Votre signalement a été envoyé."),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Retour au match" }),
  ).not.toBeOnTheScreen();
  expect(writes).toHaveLength(1);
  expect(writes[0].url).toContain(
    `/accounts/${account.accountId}/stream-contributions/${version.id}/report`,
  );

  // When
  await user.press(screen.getByRole("button", { name: "Retour" }));

  // Then
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockDismissTo).not.toHaveBeenCalled();
});

it("retains the reason after a negative read while a delayed report can still become visible", async () => {
  // Given
  const user = userEvent.setup();
  await render(
    <ReportContributionScreen
      matchId={match.match.id}
      contributionId={version.id}
      contributionUrl={version.url}
    />,
    { wrapper: Wrapper },
  );
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Fictional private reason",
  );
  write = async () => {
    throw new TypeError("Lost report acknowledgement");
  };

  // When: the read still precedes the delayed server effect.
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );
  await waitFor(() => expect(client.isFetching()).toBe(0));

  // Then
  expect(
    screen.getByDisplayValue("Fictional private reason"),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  ).toBeEnabled();
  expect(
    screen.queryByText("Vous avez déjà signalé ce lien."),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByText("Votre signalement a été envoyé."),
  ).not.toBeOnTheScreen();
  expect(writes).toHaveLength(1);

  // When: an ordinary authorized refresh observes the delayed effect on the same target.
  reported = true;
  await act(async () => {
    await client.invalidateQueries();
  });

  // Then
  expect(
    await screen.findByText("Vous avez déjà signalé ce lien."),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText("Votre signalement a été envoyé."),
  ).not.toBeOnTheScreen();
  expect(writes).toHaveLength(1);
});

it.each([401, 403, 404])(
  "withdraws the captured report address after the match refuses with %s, including a later outage",
  async (status) => {
    // Given
    const peer = mockFetch.getMockImplementation();
    let denied = false;
    mockFetch.mockImplementation(async (url, init) => {
      const path = new URL(String(url)).pathname;
      if (
        denied &&
        init?.method !== "POST" &&
        path === `/matches/${match.match.id}`
      ) {
        return Response.json({ status, title: "Unavailable" }, { status });
      }
      if (!peer) {
        throw new Error("Missing HTTP boundary");
      }
      return peer(url, init);
    });
    const user = userEvent.setup();
    await render(
      <ReportContributionScreen
        matchId={match.match.id}
        contributionId={version.id}
        contributionUrl={version.url}
      />,
      { wrapper: Wrapper },
    );
    await user.type(
      await screen.findByLabelText("Motif du signalement"),
      "Fictional private reason",
    );
    expect(await screen.findByText(version.url)).toBeOnTheScreen();
    write = async () => {
      denied = true;
      reported = true;
      throw new TypeError("Lost acknowledgement");
    };

    // When
    await user.press(
      screen.getByRole("button", { name: "Envoyer le signalement" }),
    );

    // Then
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Envoyer le signalement" }),
      ).toBeDisabled(),
    );
    expect(
      screen.queryByText("Vous avez déjà signalé ce lien."),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText(version.url)).not.toBeOnTheScreen();
    expect(screen.queryByText("Home")).not.toBeOnTheScreen();
    expect(
      screen.getByDisplayValue("Fictional private reason"),
    ).toBeOnTheScreen();

    // When
    denied = false;
    failRead = true;
    await act(async () => {
      await client.invalidateQueries({
        queryKey: getGetMatchQueryKey(match.match.id),
      });
    });

    // Then
    expect(screen.queryByText(version.url)).not.toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Envoyer le signalement" }),
    ).toBeDisabled();
    expect(writes).toHaveLength(1);
  },
);

it("keeps the exact-version draft retryable when only the report member is unavailable", async () => {
  // Given
  const peer = mockFetch.getMockImplementation();
  let missing = false;
  mockFetch.mockImplementation(async (url, init) => {
    if (missing && String(url).endsWith("/report") && init?.method !== "POST") {
      return Response.json(
        { status: 404, title: "Not Found" },
        { status: 404 },
      );
    }
    if (!peer) {
      throw new Error("Missing HTTP boundary");
    }
    return peer(url, init);
  });
  const user = userEvent.setup();
  await render(
    <ReportContributionScreen
      matchId={match.match.id}
      contributionId={version.id}
      contributionUrl={version.url}
    />,
    { wrapper: Wrapper },
  );
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Fictional private reason",
  );
  write = async () => {
    missing = true;
    return Response.json({ status: 404, title: "Not Found" }, { status: 404 });
  };

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );
  await waitFor(() => expect(client.isFetching()).toBe(0));

  // Then
  expect(screen.getByText(version.url)).toBeOnTheScreen();
  expect(
    screen.getByDisplayValue("Fictional private reason"),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  ).toBeEnabled();
  expect(writes).toHaveLength(1);
});
