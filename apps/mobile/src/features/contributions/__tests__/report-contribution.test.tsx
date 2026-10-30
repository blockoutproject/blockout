import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
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
import { matchDetail } from "../../sporting/test-support/consultation-data";
import { ReportContributionScreen } from "../screens/report-contribution-screen";

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
    back: mockBack,
    dismissTo: mockDismissTo,
    canGoBack: () => true,
  }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, init?: RequestInit) => mockFetch(url, init),
}));
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockDismissTo = jest.fn();
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const previous = { ...process.env };
const versionId = "00000000-0000-4000-8000-000000000099";
const original = {
  ...matchDetail(),
  streamUrl: "https://youtu.be/viewed",
  streamContributionId: versionId,
};
let detail = original;
let client = createQueryClient();
let posts: { url: string; body: unknown }[] = [];
let ownState = false;
let responseStatus = 201;

beforeEach(() => {
  client = createQueryClient();
  detail = original;
  posts = [];
  ownState = false;
  responseStatus = 201;
  mockPush.mockReset();
  mockBack.mockReset();
  mockDismissTo.mockReset();
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
    if (path.endsWith("/me")) return Response.json(accountResponse());
    if (path.endsWith("/report")) {
      if (init?.method === "POST") {
        posts.push({ url: String(url), body: JSON.parse(String(init.body)) });
        if (responseStatus >= 400)
          return Response.json(
            {
              type: "urn:blockout:problem:conflict",
              title: "Refused",
              status: responseStatus,
            },
            { status: responseStatus },
          );
        ownState = true;
      }
      return Response.json(
        { reported: ownState },
        { status: init?.method === "POST" ? responseStatus : 200 },
      );
    }
    return Response.json(detail);
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
  jest.restoreAllMocks();
});

/** Real form, generated transport, Query and F05/F12 providers; HTTP and native SDK/navigation are controlled. */
async function mount() {
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <AccountFeedbackProvider>
              <ReportContributionScreen
                matchId={detail.match.id}
                contributionId={versionId}
                contributionUrl={original.streamUrl}
              />
              <SessionExit />
            </AccountFeedbackProvider>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

/** Exercises real session invalidation while an exact-version report is pending. */
function SessionExit() {
  const session = useAccountSession();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quitter la session"
      onPress={() => void session.clearCredentials()}
    >
      <Text>Quitter</Text>
    </Pressable>
  );
}

it("validates a nonempty reason before any report", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await screen.findByLabelText("Motif du signalement");

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(
    await screen.findByText("Indiquez le motif du signalement."),
  ).toBeOnTheScreen();
  expect(posts).toHaveLength(0);
});

it("sends only a trimmed reason to the exact version and acknowledges independently of refresh failure", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "  Motif privé  ",
  );
  const peer = mockFetch.getMockImplementation();
  mockFetch.mockImplementation(async (url, init) => {
    if (String(url).includes("/matches/"))
      throw new TypeError("Controlled read failure");
    if (!peer) throw new Error("Missing HTTP boundary");
    return peer(url, init);
  });

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(
    await screen.findByText("Votre signalement a été envoyé."),
  ).toBeOnTheScreen();
  expect(posts).toEqual([
    {
      url: expect.stringContaining(`/stream-contributions/${versionId}/report`),
      body: { reason: "Motif privé" },
    },
  ]);
  expect(screen.queryByLabelText("Motif du signalement")).not.toBeOnTheScreen();
});

it("retains the reason after a confirmed refusal", async () => {
  // Given
  responseStatus = 422;
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Mon motif",
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(
    await screen.findByText(
      "Le signalement a été refusé. Votre saisie est conservée.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Mon motif")).toBeOnTheScreen();
});

it("keeps an obsolete report as an ordinary error without a refresh state or retargeting", async () => {
  // Given
  responseStatus = 409;
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Version vue",
  );
  detail = {
    ...original,
    streamUrl: "https://youtu.be/new",
    streamContributionId: "00000000-0000-4000-8000-000000000098",
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
  expect(screen.getByDisplayValue("Version vue")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Actualiser le match" }),
  ).not.toBeOnTheScreen();
  expect(screen.queryByText(/Le lien a changé/)).not.toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  ).toBeEnabled();
  expect(posts).toHaveLength(1);

  // When: a later explicit retry retains the original version and never reports the replacement.
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(posts).toHaveLength(2);
  expect(posts.every((post) => post.url.includes(versionId))).toBe(true);
  expect(
    posts.every(
      (post) =>
        JSON.stringify(post.body) === JSON.stringify({ reason: "Version vue" }),
    ),
  ).toBe(true);
});

it("suppresses duplicate presses while the report is pending", async () => {
  // Given
  const deferred = Promise.withResolvers<Response>();
  const peer = mockFetch.getMockImplementation();
  mockFetch.mockImplementation(async (url, init) => {
    if (init?.method === "POST") {
      posts.push({ url: String(url), body: JSON.parse(String(init.body)) });
      return deferred.promise;
    }
    if (!peer) throw new Error("Missing HTTP boundary");
    return peer(url, init);
  });
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Motif",
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(posts).toHaveLength(1);
  expect(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  ).toBeDisabled();
  await act(async () =>
    deferred.resolve(Response.json({ reported: true }, { status: 201 })),
  );
});

it("reads only existing report state without exposing a reason or offering a second send", async () => {
  // Given
  ownState = true;
  await mount();

  // When / Then
  expect(
    await screen.findByText("Vous avez déjà signalé ce lien."),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Envoyer le signalement" }),
  ).not.toBeOnTheScreen();
  expect(posts).toHaveLength(0);
});

it("invites a guest without a deferred report", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(false);
  const user = userEvent.setup();
  await mount();

  // When
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));

  // Then
  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/sign-in-invitation",
    params: { reason: "stream-report" },
  });
  expect(posts).toHaveLength(0);
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).endsWith("/report")),
  ).toBe(false);
});

it("cancels without sending a report", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await screen.findByLabelText("Motif du signalement");

  // When
  await user.press(screen.getByRole("button", { name: "Annuler" }));

  // Then
  expect(mockDismissTo).toHaveBeenCalledWith({
    pathname: "/matches/[matchId]",
    params: { matchId: detail.match.id },
  });
  expect(posts).toHaveLength(0);
});

it.each(["session", "departure"])(
  "ignores a late report acknowledgement after %s",
  async (end) => {
    // Given
    const deferred = Promise.withResolvers<Response>();
    const peer = mockFetch.getMockImplementation();
    mockFetch.mockImplementation(async (url, init) => {
      if (init?.method === "POST") {
        posts.push({ url: String(url), body: JSON.parse(String(init.body)) });
        return deferred.promise;
      }
      if (!peer) throw new Error("Missing HTTP boundary");
      return peer(url, init);
    });
    const user = userEvent.setup();
    await mount();
    await user.type(
      await screen.findByLabelText("Motif du signalement"),
      "Motif",
    );
    await user.press(
      screen.getByRole("button", { name: "Envoyer le signalement" }),
    );

    // When
    if (end === "session")
      await user.press(
        screen.getByRole("button", { name: "Quitter la session" }),
      );
    else await cleanup();
    await act(async () =>
      deferred.resolve(Response.json({ reported: true }, { status: 201 })),
    );

    // Then
    if (end === "session")
      expect(
        screen.queryByText("Votre signalement a été envoyé."),
      ).not.toBeOnTheScreen();
    expect(mockDismissTo).not.toHaveBeenCalled();
    expect(posts).toHaveLength(1);
  },
);

it("uses ordinary error feedback for an invalid acknowledgement without automatic replay", async () => {
  // Given
  const peer = mockFetch.getMockImplementation();
  mockFetch.mockImplementation(async (url, init) => {
    if (init?.method === "POST") {
      posts.push({ url: String(url), body: JSON.parse(String(init.body)) });
      return Response.json({ reported: "yes" });
    }
    if (!peer) throw new Error("Missing HTTP boundary");
    return peer(url, init);
  });
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Motif",
  );

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
  expect(screen.getByDisplayValue("Motif")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  ).toBeEnabled();
  expect(posts).toHaveLength(1);
});

it("keeps the viewed address when current public context already contains a replacement", async () => {
  // Given
  detail = {
    ...original,
    streamUrl: "https://youtu.be/replacement",
    streamContributionId: "00000000-0000-4000-8000-000000000098",
  };
  responseStatus = 409;
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Motif du signalement"),
    "Lien vu",
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Envoyer le signalement" }),
  );

  // Then
  expect(screen.getByText(original.streamUrl)).toBeOnTheScreen();
  expect(screen.queryByText(detail.streamUrl)).not.toBeOnTheScreen();
  expect(posts).toHaveLength(1);
  expect(posts[0].url).toContain(versionId);
});
