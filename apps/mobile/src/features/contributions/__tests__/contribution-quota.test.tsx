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
import { Alert } from "react-native";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { matchDetail } from "../../sporting/test-support/consultation-data";
import { ContributionScreen } from "../screens/contribution-screen";
import { OwnContributionsScreen } from "../screens/own-contributions-screen";
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
  useRouter: () => ({ push: jest.fn(), dismissTo: jest.fn() }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, init?: RequestInit) => mockFetch(url, init),
}));

const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const previous = { ...process.env };
const match = matchDetail();
let client = createQueryClient();
let context = ownContributions();
let account = accountResponse();

beforeEach(() => {
  client = createQueryClient();
  account = accountResponse();
  context = ownContributions({
    quota: {
      versionsUsed: 2,
      dailyMatchesUsed: 3,
      matchCountedToday: false,
      dayEndsAt: "2026-03-30T00:00:00+02:00",
    },
  });
  const resolved = new Intl.DateTimeFormat().resolvedOptions();
  jest.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...resolved,
    timeZone: "Europe/Paris",
  });
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|quota"));
  mockFetch.mockReset().mockImplementation(async (url, init) => {
    if (String(url).endsWith("/application-access"))
      return Response.json(applicationAccessResponse());
    if (String(url).endsWith("/me")) return Response.json(account);
    if (init?.method === "POST")
      return Response.json(
        {
          type: "urn:blockout:problem:unprocessable-content",
          title: "Refused",
          status: 422,
        },
        { status: 422 },
      );
    if (String(url).includes("/stream-contributions"))
      return Response.json(context);
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
  jest.restoreAllMocks();
});

/** Real screens, generated transport, session and Query; only HTTP, native credentials, navigation and zone discovery are controlled. */
async function mount(history = false, pro = false) {
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider proAccent={pro}>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <AccountFeedbackProvider>
              {history ? (
                <OwnContributionsScreen matchId={match.match.id} />
              ) : (
                <ContributionScreen matchId={match.match.id} />
              )}
            </AccountFeedbackProvider>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

it.each([false, true])(
  "shows authoritative usage once in the %s history composition",
  async (history) => {
    // Given
    context.eligibility = {
      canSubmit: false,
      requiresApproval: false,
      reason: "Le quota journalier est atteint.",
      eligibleAt: context.quota.dayEndsAt,
    };

    // When
    await mount(history);

    // Then
    expect(
      await screen.findByText(
        "2/3 versions pour ce match · 3/3 matchs aujourd’hui (Paris)",
      ),
    ).toBeOnTheScreen();
    expect(screen.getAllByText(/versions pour ce match/)).toHaveLength(1);
    expect(
      screen.getByText("Ce match n’est pas encore compté aujourd’hui."),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Le quota journalier est atteint."),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(/À revérifier à partir du 30 mars 2026 à 00:00/),
    ).toBeOnTheScreen();
  },
);

it("does not treat full daily usage as a refusal for a match already counted today", async () => {
  // Given
  context.quota.matchCountedToday = true;

  // When
  await mount();

  // Then
  expect(
    await screen.findByText("Ce match est déjà compté aujourd’hui."),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Soumettre le lien" }),
  ).toBeEnabled();
  expect(screen.queryByText(/À revérifier/)).not.toBeOnTheScreen();
});

it("shows the permanent match limit without suggesting midnight replenishes it", async () => {
  // Given
  context.quota.versionsUsed = 3;
  context.eligibility = {
    canSubmit: false,
    requiresApproval: false,
    reason: "Le quota de versions est atteint.",
  };

  // When
  await mount();

  // Then
  expect(
    await screen.findByText(
      "3/3 versions pour ce match · 3/3 matchs aujourd’hui (Paris)",
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByText("Le quota de versions est atteint."),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Soumettre le lien" }),
  ).toBeDisabled();
  expect(screen.queryByText(/À revérifier/)).not.toBeOnTheScreen();
});

it.each([
  ["2026-03-30T00:00:00+02:00", "Europe/Paris", "30 mars 2026 à 00:00"],
  ["2026-03-30T00:00:00+02:00", "America/New_York", "29 mars 2026 à 18:00"],
  ["2026-10-26T00:00:00+01:00", "Europe/Paris", "26 oct. 2026 à 00:00"],
  ["2026-10-26T00:00:00+01:00", "America/New_York", "25 oct. 2026 à 19:00"],
])(
  "displays the same server Paris midnight %s in %s",
  async (dayEndsAt, zone, label) => {
    // Given: these are the ends of the 23- and 25-hour Paris days, not now + 24 hours.
    context.quota.dayEndsAt = dayEndsAt;
    const resolved = new Intl.DateTimeFormat().resolvedOptions();
    jest
      .mocked(Intl.DateTimeFormat.prototype.resolvedOptions)
      .mockReturnValue({ ...resolved, timeZone: zone });

    // When
    await mount();

    // Then
    expect(
      await screen.findByText(`Journée de Paris jusqu’au ${label} (${zone}).`),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Soumettre le lien" }),
    ).toBeEnabled();
  },
);

it("keeps the supplied refusal after a past deadline and accepts only the next server read", async () => {
  // Given
  context.eligibility = {
    canSubmit: false,
    requiresApproval: false,
    reason: "La publication ouvre une heure avant le match.",
    eligibleAt: "2020-01-01T12:00:00Z",
  };
  await mount();
  await screen.findByLabelText("Adresse du lien");

  // When
  await userEvent
    .setup()
    .type(screen.getByLabelText("Adresse du lien"), "https://youtu.be/draft");

  // Then: a phone clock already past the deadline grants no permission and resets no usage.
  expect(
    screen.getByRole("button", { name: "Soumettre le lien" }),
  ).toBeDisabled();
  expect(screen.getByText(/2\/3 versions pour ce match/)).toBeOnTheScreen();
  expect(mockFetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(
    false,
  );

  // When
  context = ownContributions({
    revision: "reread",
    quota: { ...context.quota, dailyMatchesUsed: 0 },
  });
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Soumettre le lien" }),
    ).toBeEnabled(),
  );
  expect(
    screen.getByText(/2\/3 versions pour ce match · 0\/3 matchs/),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("https://youtu.be/draft")).toBeOnTheScreen();
});

it("preserves usage and a dirty address after a refused attempt", async () => {
  // Given
  const user = userEvent.setup();
  await mount();
  await user.type(
    await screen.findByLabelText("Adresse du lien"),
    "https://youtu.be/refused",
  );

  // When
  await user.press(screen.getByRole("button", { name: "Soumettre le lien" }));
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.calls.at(-1)?.[2]
      ?.find((button) => button.text === "Soumettre le lien")
      ?.onPress?.(),
  );

  // Then
  expect(
    await screen.findByText(
      "Le lien a été refusé. Votre saisie est conservée.",
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByDisplayValue("https://youtu.be/refused"),
  ).toBeOnTheScreen();
  expect(
    screen.getByText(/2\/3 versions pour ce match · 3\/3 matchs/),
  ).toBeOnTheScreen();
});

it.each(["rejected", "cancelled"] as const)(
  "uses quota facts rather than refunding a %s history row",
  async (state) => {
    // Given
    context = ownContributions({
      quota: { ...context.quota, versionsUsed: 3 },
      proposalCount: 1,
      items: [
        {
          id: "00000000-0000-4000-8000-000000000003",
          url: "https://youtu.be/history",
          platform: "youtube",
          state,
          submittedAt: "2026-03-28T10:00:00Z",
          canCancel: false,
          canWithdraw: false,
        },
      ],
    });

    // When
    await mount(true);

    // Then
    expect(
      await screen.findByRole("header", { name: "Mes propositions (1)" }),
    ).toBeOnTheScreen();
    expect(screen.getByText(/3\/3 versions pour ce match/)).toBeOnTheScreen();
    expect(
      screen.getByText("Ce match n’est pas encore compté aujourd’hui."),
    ).toBeOnTheScreen();
  },
);

it("shows quota once when history composes the owned active editor, including unchanged-address guidance", async () => {
  // Given
  context = ownContributions({
    quota: { ...context.quota, versionsUsed: 3 },
    activeContribution: {
      id: "00000000-0000-4000-8000-000000000003",
      url: "https://youtu.be/current",
      platform: "youtube",
      state: "active",
      submittedAt: "2026-03-28T10:00:00Z",
      canCancel: false,
      canWithdraw: true,
    },
  });

  // When
  await mount(true);

  // Then
  expect(
    await screen.findByDisplayValue("https://youtu.be/current"),
  ).toBeOnTheScreen();
  expect(screen.getAllByText(/versions pour ce match/)).toHaveLength(1);
  expect(
    screen.getByHintText(
      /Une adresse identique déjà publiée ou en attente ne consomme aucun quota supplémentaire/,
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Remplacer le lien" }),
  ).toBeEnabled();
});

it.each([false, true])(
  "does not grant a moderation exemption through Pro accent %s",
  async (pro) => {
    // Given: membership does not change the generated account permissions or eligibility.
    context.eligibility = { canSubmit: false, requiresApproval: false };

    // When
    await mount(false, pro);

    // Then
    expect(await screen.findByLabelText("Adresse du lien")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Soumettre le lien" }),
    ).toBeDisabled();
    expect(
      screen.queryByText(/publications de modération sont exemptées/),
    ).not.toBeOnTheScreen();
  },
);

it("explains the actual moderation grant without overriding a server refusal", async () => {
  // Given
  account = accountResponse({
    permissions: { ...account.permissions, moderateStreamLinks: true },
  });
  context.quota.versionsUsed = 3;
  context.eligibility = {
    canSubmit: false,
    requiresApproval: false,
    reason: "Le match n’est pas accessible.",
  };

  // When
  await mount();

  // Then
  expect(
    await screen.findByText(
      "Les publications de modération sont exemptées de ces quotas.",
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Soumettre le lien" }),
  ).toBeDisabled();
  expect(screen.getByText("Le match n’est pas accessible.")).toBeOnTheScreen();
});
