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
import { Pressable, Text } from "react-native";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import {
  useApplicationAccess,
  ApplicationAccessProvider,
} from "../../access/queries/use-application-access";
import { applicationAccessResponse as mockApplicationAccessResponse } from "../../../shared/api/test-support/application-access";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ContributionScreen } from "../screens/contribution-screen";
import { ownContributions } from "../test-support/contribution-data";
import { matchDetail } from "../../sporting/test-support/consultation-data";

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
  useRouter: () => ({ push: mockPush, back: mockBack, canGoBack: () => true }),
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
    canCancel: false,
    canWithdraw: true,
  },
};
let client = createQueryClient();
let context = ownContributions();
let failRefresh = false;
let posts: RequestInit[] = [];
beforeEach(() => {
  client = createQueryClient();
  mockMaintenance = false;
  context = ownContributions();
  failRefresh = false;
  posts = [];
  mockPush.mockReset();
  mockBack.mockReset();
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
    if (String(url).endsWith("/me")) return Response.json(account);
    if (String(url).includes("/stream-contributions")) {
      if (init?.method === "POST") {
        posts.push(init);
        return Response.json(accepted, { status: 201 });
      }
      if (failRefresh)
        return Response.json(
          {
            type: "urn:blockout:problem:unavailable",
            title: "Unavailable",
            status: 503,
          },
          { status: 503 },
        );
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
  process.env = { ...previous };
});

/** Real session, generated HTTP, Query, screen and RHF form; native SDK/HTTP/navigation alone are controlled. */
async function mount() {
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <AccountFeedbackProvider>
              <ContributionScreen matchId={match.match.id} />
              <SessionExit />
            </AccountFeedbackProvider>
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
        onPress={() => access.bypass.request(session.getSnapshot(), true)}
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
])("explains current refusal: %s", async (reason) => {
  // Given
  context = ownContributions({
    eligibility: { canSubmit: false, requiresApproval: false, reason },
  });
  await mount();
  // When
  await screen.findByText(reason);
  // Then
  expect(
    screen.getByRole("button", { name: "Soumettre le lien" }),
  ).toBeDisabled();
  expect(posts).toHaveLength(0);
});

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
});

it("retains dirty input through refresh and a refused submission", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    accepted.contribution.url,
  );
  fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
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
  expect(mockBack).not.toHaveBeenCalled();
});

it("keeps confirmed success when dependent reads fail and excludes duplicate actions", async () => {
  // Given
  const pending = Promise.withResolvers<Response>();
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    accepted.contribution.url,
  );
  mockFetch.mockImplementationOnce(async (_url, init) => {
    if (init) posts.push(init);
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
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(posts).toHaveLength(1);
  expect(JSON.parse(String(posts[0].body))).toEqual({
    revision: "initial",
    url: accepted.contribution.url,
  });
  expect(
    client
      .getQueryCache()
      .getAll()
      .some((q) => JSON.stringify(q.state.data) === JSON.stringify(accepted)),
  ).toBe(true);
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
  expect(mockBack).not.toHaveBeenCalled();
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
    if (!reads) throw new Error("Missing test HTTP boundary");
    return reads(url, init);
  });
  await mount();
  // When
  await user.press(await screen.findByRole("button", { name: "Réessayer" }));
  // Then
  expect(await screen.findByLabelText("Adresse du lien")).toBeOnTheScreen();
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
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(posts).toHaveLength(1);
});

it("refuses malformed generated reads before cache admission", async () => {
  // Given
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/me")
      ? Response.json(account)
      : String(url).includes("/stream-contributions")
        ? Response.json({ ...context, revision: null })
        : Response.json(match),
  );
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
    if (init) posts.push(init);
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
  expect(mockBack).not.toHaveBeenCalled();

  // When: a new explicit action uses the newly observed revision.
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));
  // Then
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(posts).toHaveLength(2);
  expect(JSON.parse(String(posts[1].body)).revision).toBe("current");
});

it("keeps an uncertain failure guarded after a failed read without write replay", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    accepted.contribution.url,
  );
  mockFetch.mockImplementationOnce(async (_url, init) => {
    if (init) posts.push(init);
    throw new TypeError("Response lost");
  });
  // When
  failRefresh = true;
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));
  // Then
  expect(
    await screen.findByRole("button", { name: "Vérifier la contribution" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Soumettre le lien" }),
  ).toBeDisabled();
  expect(screen.getByDisplayValue(accepted.contribution.url)).toBeOnTheScreen();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Vérifier la contribution" }),
    ).toBeEnabled(),
  );
  expect(posts).toHaveLength(1);
  expect(mockBack).not.toHaveBeenCalled();
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
  expect(mockBack).not.toHaveBeenCalled();
});

it("explains a new time restriction after a confirmed business refusal", async () => {
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
    if (init) posts.push(init);
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
    await screen.findByText(context.eligibility.reason ?? ""),
  ).toBeOnTheScreen();
  expect(screen.getByText(/Disponible à partir du/)).toBeOnTheScreen();
  expect(screen.getByDisplayValue(accepted.contribution.url)).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Soumettre le lien" }),
  ).toBeDisabled();
  expect(posts).toHaveLength(1);
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
    if (String(url).endsWith("/me")) return Response.json(moderator);
    if (new URL(String(url)).pathname === `/matches/${match.match.id}`)
      matchReads++;
    if (!reads) throw new Error("Missing test HTTP boundary");
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
