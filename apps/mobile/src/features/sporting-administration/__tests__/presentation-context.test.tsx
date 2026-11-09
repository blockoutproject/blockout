import {
  useLayoutEffect,
  type ComponentType,
  type PropsWithChildren,
} from "react";
import { Text } from "react-native";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  getGetPoolQueryKey,
  getGetTeamQueryKey,
} from "../../../../.generated/mobile";
import type {
  PoolDetailResponse,
  TeamDetailResponse,
} from "../../../../.generated/schemas/index.zod";
import RootLayout from "../../../app/_layout";
import OnboardingRoute from "../../../app/onboarding";
import OperationsLayout from "../../../app/(operations)/_layout";
import PresentationRoute from "../../../app/(operations)/administration/presentation/[kind]/[id]";
import RecoveryLayout from "../../../app/(recovery)/_layout";
import SupportLayout from "../../../app/(recovery)/support/_layout";
import SupportRoute from "../../../app/(recovery)/support/index";
import SupportChoiceRoute from "../../../app/(recovery)/support/choice";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { completeDiscovery } from "../../onboarding/discovery-state";
import { TeamScreen } from "../../sporting/screens/team-screen";
import { PoolScreen } from "../../sporting/screens/pool-screen";

// Root, F05/F12 admission, F03 reads, F02 fields and F10 navigation remain real.
// Only native SDK/storage/file boundaries and HTTP are controlled.
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock(
  "expo-file-system",
  () =>
    jest.requireActual("../../sporting/test-support/native-document-files")
      .nativeDocumentFiles,
);
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../../pro/test-support/native-purchases")
    .mockPurchases,
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(async () => {}),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));

const resourceId = "00000000-0000-4000-8000-000000000216";
const season = { id: resourceId, label: "2096/2097", startYear: 2096 };
const operator = accountResponse({
  permissions: {
    ...accountResponse().permissions,
    manageSportingPresentation: true,
  },
});
const names = {
  sourceName: "Source name",
  effectiveName: "Current name",
  manualName: "Current name",
  effectiveShortName: "Short",
  manualShortName: null,
};
let team: TeamDetailResponse;
let pool: PoolDetailResponse;
let access = applicationAccessResponse();
let client: QueryClient;
const environment = { ...process.env };
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const publicRead = jest.fn<Promise<Response>, [string]>();

beforeEach(async () => {
  jest.useFakeTimers();
  await completeDiscovery();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "presentation-context-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|operator"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  access = applicationAccessResponse();
  pool = {
    pool: {
      pool: { id: resourceId, name: "Current pool" },
      season,
      classification: {},
    },
  };
  team = {
    team: {
      team: { id: resourceId, name: "Current name" },
      season,
      classification: {},
      professional: true,
    },
    participations: [pool.pool],
  };
  publicRead
    .mockReset()
    .mockImplementation(async (path) =>
      Response.json(path.startsWith("/teams/") ? team : pool),
    );
  mockFetch.mockReset().mockImplementation(async (url, options) => {
    const path = new URL(String(url)).pathname;
    if (options?.method && options.method !== "GET") {
      throw new Error(`Unexpected write in navigation-only scenario: ${path}`);
    }
    if (path === "/application-access") {
      return Response.json(access);
    }
    if (path === "/accounts/me") {
      return Response.json(operator);
    }
    if (path.startsWith("/administration/") && path.endsWith("/presentation")) {
      const kind = path.includes("/clubs/")
        ? "club"
        : path.includes("/pools/")
          ? "pool"
          : "team";
      return Response.json({
        id: resourceId,
        revision: "r1",
        names,
        ...(kind === "pool"
          ? {}
          : {
              kind,
              logo: {
                effectiveUrl: null,
                manualUrl: null,
                automaticUrl: null,
              },
            }),
      });
    }
    if (path === `/teams/${resourceId}` || path === `/pools/${resourceId}`) {
      return publicRead(path);
    }
    return Response.json({}, { status: 404 });
  });
});

afterEach(async () => {
  await cleanup();
  client?.clear();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  process.env = { ...environment };
});

/** Observes the actual private cache; deterministic retries do not replace any query or screen owner. */
function PrivateQueries({ children }: PropsWithChildren) {
  const current = useQueryClient();
  useLayoutEffect(() => {
    client = current;
    current.setQueryDefaults([], { retry: false });
    current.setMutationDefaults([], { gcTime: Infinity });
  }, [current]);
  return children;
}

/** Mounts real public/operational root guards and feature routes; initial ordinary member admission is qualified separately. */
async function openRoute(path: string) {
  await renderRouter(
    {
      _layout: () => <RootLayout />,
      onboarding: OnboardingRoute,
      access: () => <Text>Access gate</Text>,
      "age-declaration": () => null,
      "(ordinary)/_layout": () => (
        <PrivateQueries>
          <Stack />
        </PrivateQueries>
      ),
      "(recovery)/_layout": RecoveryLayout,
      "(ordinary)/index": () => <Text>Home</Text>,
      "(ordinary)/teams/[teamId]": () => (
        <TeamScreen
          teamId={resourceId}
          renderFollow={() => null}
          renderStandings={() => <Text>Current standings</Text>}
        />
      ),
      "(ordinary)/pools/[poolId]": () => (
        <PoolScreen
          poolId={resourceId}
          renderFollow={() => null}
          renderStandings={() => <Text>Current standings</Text>}
          renderMap={() => null}
        />
      ),
      "(recovery)/support/_layout": SupportLayout,
      "(recovery)/support/index": SupportRoute,
      "(recovery)/support/choice": SupportChoiceRoute,
      "(operations)/_layout": () => (
        <PrivateQueries>
          <OperationsLayout />
        </PrivateQueries>
      ),
      "(operations)/administration/index": () => null,
      "(operations)/administration/maintenance": () => null,
      "(operations)/administration/application-versions": () => null,
      "(operations)/administration/classification/[kind]/[id]": () => null,
      "(operations)/administration/classification-selection": () => null,
      "(operations)/administration/divisions/index": () => null,
      "(operations)/administration/divisions/[id]": () => null,
      "(operations)/administration/divisions/new": () => null,
      "(operations)/administration/presentation/[kind]/[id]": PresentationRoute,
      "(operations)/collection": () => null,
    },
    { initialUrl: path },
  );
}

it.each([
  { kind: "team", editLabel: "Modifier l’équipe" },
  { kind: "pool", editLabel: "Modifier la poule" },
] as const)(
  "keeps the current canonical $kind season through resource entry without replacing a dirty editor",
  async ({ kind, editLabel }) => {
    // Given
    const user = userEvent.setup();
    await openRoute(`/${kind}s/${resourceId}`);
    await user.press(await screen.findByRole("button", { name: editLabel }));
    await screen.findByDisplayValue("Current name");
    await screen.findByText(season.label);
    await user.type(
      screen.getByLabelText("Nom complet personnalisé"),
      " edited",
    );
    const currentSeason = { ...season, label: "2097/2098", startYear: 2097 };
    team = { ...team, team: { ...team.team, season: currentSeason } };
    pool = { ...pool, pool: { ...pool.pool, season: currentSeason } };
    const key =
      kind === "team"
        ? getGetTeamQueryKey(resourceId)
        : getGetPoolQueryKey(resourceId);

    // When
    await act(() => client.invalidateQueries({ queryKey: key, exact: true }));

    // Then
    await screen.findByText(currentSeason.label);
    expect(
      screen.getByLabelText("Nom complet personnalisé"),
    ).toHaveDisplayValue("Current name edited");
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
    expect(
      kind === "team"
        ? client.getQueryData<TeamDetailResponse>(key)?.team.season
        : client.getQueryData<PoolDetailResponse>(key)?.pool.season,
    ).toEqual(currentSeason);
  },
);

it.each([
  { kind: "team", status: 404 },
  { kind: "pool", status: 403 },
] as const)(
  "keeps $kind fields usable while public context is pending and after $status",
  async ({ kind, status }) => {
    // Given
    const response = Promise.withResolvers<Response>();
    publicRead.mockImplementation(() => response.promise);
    const user = userEvent.setup();
    await openRoute(`/administration/presentation/${kind}/${resourceId}`);
    await screen.findByDisplayValue("Current name");
    await waitFor(() => expect(publicRead).toHaveBeenCalledTimes(1));

    // When
    await user.type(
      screen.getByLabelText("Nom complet personnalisé"),
      " edited",
    );
    await act(() => response.resolve(Response.json({}, { status })));

    // Then
    await waitFor(() =>
      expect(
        client.getQueryState(
          kind === "team"
            ? getGetTeamQueryKey(resourceId)
            : getGetPoolQueryKey(resourceId),
        )?.status,
      ).toBe("error"),
    );
    expect(screen.queryByText(season.label)).not.toBeOnTheScreen();
    expect(
      screen.getByLabelText("Nom complet personnalisé"),
    ).toHaveDisplayValue("Current name edited");
    expect(screen.getByLabelText("Nom court personnalisé")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  },
);

it("omits cached public season and public requests during maintenance without blocking the admitted editor", async () => {
  // Given
  access = { ...access, maintenance: { ...access.maintenance, active: true } };
  await openRoute(`/administration/presentation/team/${resourceId}`);
  await screen.findByDisplayValue("Current name");

  // When
  await act(() => client.setQueryData(getGetTeamQueryKey(resourceId), team));
  // Query schedules observer notifications with setTimeout(callback, 0).
  await act(async () => jest.advanceTimersByTimeAsync(0));

  // Then
  expect(publicRead).not.toHaveBeenCalled();
  expect(screen.queryByText(season.label)).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Signaler un problème" }),
  ).not.toBeOnTheScreen();
});

it.each([
  { kind: "club", context: "Club" },
  { kind: "team", context: "Équipe" },
  { kind: "pool", context: "Poule" },
] as const)(
  "navigates from the $kind editor to the real F10 form without sending anything",
  async ({ kind, context }) => {
    // Given
    const user = userEvent.setup();
    await openRoute(`/administration/presentation/${kind}/${resourceId}`);
    await screen.findByDisplayValue("Current name");

    // When
    await user.press(
      screen.getByRole("button", { name: "Signaler un problème" }),
    );

    // Then
    await screen.findByRole("header", { name: "Assistance et suggestions" });
    expect(screen).toHavePathname("/support");
    expect(screen).toHaveSearchParams({
      originScreen: kind,
      targetType: kind,
      targetId: resourceId,
    });
    expect(screen.getByText(context)).toBeOnTheScreen();
    expect(screen.getByLabelText("Titre")).toBeEnabled();
    expect(
      mockFetch.mock.calls.every(
        ([, options]) =>
          options?.method === undefined || options.method === "GET",
      ),
    ).toBe(true);
  },
);
