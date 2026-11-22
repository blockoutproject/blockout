import { getGetMyAccountQueryKey } from "../../../../.generated/mobile";
import type {
  CollectionSeasonResponse,
  DiscoveredCollectionResourceResponse,
  SourceBindingResponse,
} from "../../../../.generated/schemas/index.zod";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useCurrentAccount } from "@/features/accounts/api/use-current-account";
import { accountResponse } from "@/features/accounts/test-support/account-response";
import {
  layoutNativeTabs,
  scrollNativeTabs,
} from "@/shared/native/test-support/tab-view-native";
import {
  cleanup,
  act,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Stack, router, useGlobalSearchParams, usePathname } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { useState, useLayoutEffect, type ComponentType } from "react";
import { Alert, Text } from "react-native";
import RootLayout from "@/app/_layout";
import EntryRoute from "@/app/index";
import RecoveryLayout from "@/app/(recovery)/_layout";
import SignInRoute from "@/app/(recovery)/sign-in";
import OnboardingRoute from "@/app/onboarding";
import { completeDiscovery } from "@/features/onboarding/discovery-state";
import OperationsLayout from "@/app/(operations)/_layout";
import AdministrationRoute from "@/app/(operations)/administration";
import CollectionLayout from "@/app/(operations)/collection/_layout";
import CollectionRoute from "@/app/(operations)/collection";
import SeasonRoute from "@/app/(operations)/collection/[seasonId]";
import CompetitionRoute from "@/app/(operations)/collection/[seasonId]/controls/[provider]";
import BilanRoute from "@/app/(operations)/collection/[seasonId]/controls/[provider]/bilan";
import BilanFiltersRoute from "@/app/(operations)/collection/[seasonId]/controls/[provider]/bilan-filters";
import SourcesFiltersRoute from "@/app/(operations)/collection/[seasonId]/controls/[provider]/sources-filters";
import ClubRoute from "@/app/(operations)/collection/clubs/[family]";
import SeasonActionsRoute from "@/app/(operations)/collection/[seasonId]/actions";
import ActivateSeasonRoute from "@/app/(operations)/collection/[seasonId]/activation";
import CloseSeasonRoute from "@/app/(operations)/collection/[seasonId]/closure";
import { control, refused, result } from "../test-support/collection-peer";
import SourceRoute from "@/app/(operations)/collection/[seasonId]/sources/[sourceId]";
import NotFoundRoute from "@/app/+not-found";
import { AccessGateScreen } from "@/features/access/screens/access-gate-screen";
import { applicationAccessResponse } from "@/shared/api/test-support/application-access";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";

jest.mock("expo-constants", () => {
  const actual = jest.requireActual("expo-constants");
  return {
    ...actual,
    __esModule: true,
    default: {
      ...actual.default,
      expoConfig: {
        ...actual.default.expoConfig,
        extra: { router: { sitemap: false } },
      },
    },
  };
});
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
jest.mock("expo-application", () => ({ nativeApplicationVersion: "2.9.0" }));
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("@/features/pro/test-support/native-purchases")
    .mockPurchases,
}));
jest.mock("@/features/onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "@/features/accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const environment = { ...process.env };
let privateClient: QueryClient;
const seasonId = "00000000-0000-4000-8000-000000000179";
const season: CollectionSeasonResponse = {
  id: seasonId,
  label: "2026/2027",
  startYear: 2026,

  state: "active",
};
const sourceId = "00000000-0000-4000-8000-000000000180";
const officialUrl =
  "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=137";
const source: SourceBindingResponse = {
  id: sourceId,
  seasonId,
  provider: "lnv",
  organizerReference: "137",
  label: "D1 masculine",

  candidateUrl: officialUrl,
  acceptedUrl: officialUrl,
  locked: true,
  validation: "qualified",
  validatedAt: null,
  seasonEvidence: "2026/2027",
  reason: null,
  launched: true,
  catalog: { status: "complete", lastCompleteAt: "2026-11-18T10:00:00Z" },
};
const ffvbSource: SourceBindingResponse = {
  ...source,
  id: "00000000-0000-4000-8000-000000000182",
  provider: "ffvb",
  organizerReference: "ABCCS",
  label: "Championnats nationaux",
  scope: "national",
  candidateUrl: null,
  acceptedUrl:
    "https://www.ffvbbeach.org/ffvbapp/resu/vbspo_calendrier.php?saison=2026/2027&codent=ABCCS",
  catalog: { status: "complete", lastCompleteAt: "2026-11-18T10:00:00Z" },
};

// These route scenarios start after common discovery has been explicitly completed.
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
beforeEach(async () => {
  await completeDiscovery();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|operator179"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuth.mockReset();
  mockFetch.mockReset();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});
afterEach(async () => {
  await cleanup();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** The public router hook exposes navigation location without inspecting navigation internals. */
function RouteLocation() {
  const path = usePathname();
  const { phaseReference } = useGlobalSearchParams<{
    phaseReference?: string;
  }>();
  return (
    <>
      <Text accessibilityLabel="Route courante">{path}</Text>
      {phaseReference && (
        <Text accessibilityLabel="Phase de destination">{phaseReference}</Text>
      )}
    </>
  );
}

/** The route retains the real gate; scenario-level one-failure evidence disables unrelated retry backoff. */
function AccessRoute() {
  const client = useQueryClient();
  useLayoutEffect(() => {
    privateClient = client;
  }, [client]);
  useState(() => {
    client.setDefaultOptions({
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, networkMode: "always", gcTime: Infinity },
    });
  });
  useCurrentAccount();
  return <AccessGateScreen />;
}

/** Mounts real public/operational root guards; unrelated ordinary business destinations remain route probes. */
async function openRoute(path: string) {
  return renderRouter(
    {
      _layout: () => (
        <>
          <RootLayout />
          <RouteLocation />
        </>
      ),
      index: EntryRoute,
      onboarding: OnboardingRoute,
      "(ordinary)/_layout": () => <Stack />,
      "(ordinary)/(tabs)/(home)/(personal)/index": () => (
        <Text>Ordinary home</Text>
      ),
      "(recovery)/_layout": RecoveryLayout,
      "(recovery)/sign-in": SignInRoute,
      "(operations)/_layout": OperationsLayout,
      "(operations)/administration/classification/[kind]/[id]": () => null,
      "(operations)/administration/mapping/index": () => null,
      "(operations)/administration/mapping/[packId]": () => null,
      "(operations)/administration/mapping/filters": () => null,
      "(operations)/administration/divisions/index": () => null,
      "(operations)/administration/divisions/[id]": () => null,
      "(operations)/administration/divisions/new": () => null,
      "(operations)/administration/presentation/[kind]/[id]": () => null,
      "(operations)/administration/index": AdministrationRoute,
      "(operations)/administration/maintenance": () => (
        <Text>Maintenance editor</Text>
      ),
      "(operations)/administration/application-versions": () => (
        <Text>Versions editor</Text>
      ),
      "(operations)/collection/_layout": CollectionLayout,
      "(operations)/collection/index": CollectionRoute,
      "(operations)/collection/[seasonId]/index": SeasonRoute,
      "(operations)/collection/[seasonId]/controls/[provider]/index":
        CompetitionRoute,
      "(operations)/collection/[seasonId]/controls/[provider]/bilan":
        BilanRoute,
      "(operations)/collection/[seasonId]/controls/[provider]/bilan-filters":
        BilanFiltersRoute,
      "(operations)/collection/[seasonId]/controls/[provider]/sources-filters":
        SourcesFiltersRoute,
      "(operations)/collection/clubs/[family]": ClubRoute,
      "(operations)/collection/[seasonId]/actions": SeasonActionsRoute,
      "(operations)/collection/[seasonId]/activation": ActivateSeasonRoute,
      "(operations)/collection/[seasonId]/closure": CloseSeasonRoute,
      "(operations)/collection/[seasonId]/sources/[sourceId]/index":
        SourceRoute,
      access: AccessRoute,
      "+not-found": NotFoundRoute,
    },
    { initialUrl: path },
  );
}

/** Synthetic HTTP peer qualifies admission/navigation only, without a real Auth0 or backend permission operation. */
function responses(
  permissions: Record<string, boolean | undefined>,
  outdated = false,
  currentSeason = season,
) {
  const access = applicationAccessResponse();
  access.maintenance = {
    active: true,
    message: "Maintenance demo",
    imageUrl: null,
  };
  access.versions.ios = {
    minimumVersion: outdated ? "3.0.0" : "0.0.0",
    storeUrl: "https://apps.apple.com/fr/app/blockout/id123456789",
  };
  access.versions.android = {
    ...access.versions.ios,
    storeUrl:
      "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout",
  };
  /** Serves the selected admission and collection projections; unexpected routes fail the scenario. */
  const serve = async (url: RequestInfo | URL) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("/application-access")) {
      return Response.json(access);
    }
    if (path.endsWith("/accounts/me")) {
      return Response.json(
        accountResponse({
          accountId: "00000000-0000-4000-8000-000000000181",
          username: "Operator_179",
          email: "operator@example.invalid",
          permissions,
        }),
      );
    }
    if (path.endsWith("/source-bindings")) {
      return Response.json({ items: [source, ffvbSource] });
    }
    if (path.endsWith(`/source-bindings/${ffvbSource.id}`)) {
      return Response.json(ffvbSource);
    }
    if (path.endsWith(`/source-bindings/${sourceId}`)) {
      return Response.json(source);
    }
    if (path.endsWith(`/source-bindings/${sourceId}/children`)) {
      return Response.json({
        items: [
          {
            id: "00000000-0000-4000-8000-000000000183",
            kind: "pool",
            label: "Groupe A",
            phaseReference: "137",
            phaseLabel: "Phase régulière",
          },
          {
            id: "00000000-0000-4000-8000-000000000184",
            kind: "pool",
            label: "Groupe B",
            phaseReference: "137",
            phaseLabel: "Phase régulière",
          },
          {
            id: "00000000-0000-4000-8000-000000000185",
            kind: "pool",
            label: "Groupe C",
            phaseReference: "138",
          },
        ],
        page: 0,
        hasNext: false,
      });
    }
    if (path.endsWith(`/collection-seasons/${seasonId}`)) {
      return Response.json(currentSeason);
    }
    if (path.endsWith("/collection-seasons")) {
      return Response.json({ items: [currentSeason] });
    }
    if (path.endsWith("/collection-controls")) {
      return Response.json({ items: [control({ family: "lnv", seasonId })] });
    }
    if (path.endsWith("/results")) {
      return Response.json({
        items: [],
        page: 0,
        hasNext: false,
        summary: { success: 0, partial: 0, failed: 0, unconfirmed: 0 },
      });
    }
    throw new Error(`Unexpected controlled request ${path}`);
  };
  return serve;
}

it("opens collection from the administration entry during maintenance with collection permission alone", async () => {
  // Given
  mockFetch.mockImplementation(responses({ manageCollection: true }));
  const user = userEvent.setup();
  await openRoute("/access");
  await user.press(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  );

  // When
  await user.press(await screen.findByRole("link", { name: "Collectes" }));

  // Then
  expect(
    await screen.findByRole("link", { name: "2026/2027, Active" }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Route courante")).toHaveTextContent(
    "/collection",
  );
  expect(screen.queryByText("Ordinary home")).not.toBeOnTheScreen();
});

async function chooseSeasonAction(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.press(
    await screen.findByRole("button", { name: "Actions de la saison" }),
  );
  await user.press(await screen.findByRole("button", { name }));
}

it("activates only the selected season after exact typed confirmation and acknowledges it once", async () => {
  // Given
  let currentSeason: CollectionSeasonResponse = {
    ...season,
    state: "preparing",
  };
  const acknowledgment = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) =>
    options?.method === "POST"
      ? acknowledgment.promise
      : responses({ manageCollection: true }, false, currentSeason)(url),
  );
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () => router.push(`/collection/${seasonId}`));
  const activation = { name: "Activer la saison" };
  const seasonPath = new RegExp(`^/collection/${seasonId}$`);

  // When
  await user.press(
    await screen.findByRole("button", { name: "Actions de la saison" }),
  );
  expect(
    await screen.findByRole("header", { name: "Actions de la saison" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", activation)).toBeEnabled();
  expect(
    screen.getByRole("button", { name: "Clôturer la saison" }),
  ).toBeEnabled();
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  expect(screen.getByLabelText("Route courante")).toHaveTextContent(seasonPath);

  await chooseSeasonAction(user, activation.name);
  await user.press(await screen.findByRole("button", { name: "Annuler" }));
  expect(screen.getByLabelText("Route courante")).toHaveTextContent(seasonPath);
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "POST"),
  ).toBe(false);

  await chooseSeasonAction(user, activation.name);
  expect(
    await screen.findByRole("header", { name: "Activer 2026/2027 ?" }),
  ).toBeOnTheScreen();
  const input = await screen.findByLabelText(
    "Saisissez 2026/2027 pour confirmer",
  );
  await user.type(input, "2026/2027 ");
  expect(screen.getByRole("button", activation)).toBeDisabled();
  await user.press(screen.getByRole("button", activation));
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "POST"),
  ).toBe(false);
  await user.clear(input);
  await user.type(input, "2026/2027");
  await user.press(screen.getByRole("button", activation));
  expect(
    await screen.findByRole("button", {
      name: "Activer la saison",
      busy: true,
    }),
  ).toBeDisabled();
  expect(screen.queryByText("Saison activée.")).not.toBeOnTheScreen();
  currentSeason = season;
  await act(async () => acknowledgment.resolve(Response.json(currentSeason)));

  // Then
  expect(
    await screen.findByRole("alert", { name: "Saison activée." }),
  ).toBeOnTheScreen();
  expect(screen.getAllByText("Saison activée.")).toHaveLength(1);
  expect(screen.getByLabelText("Route courante")).toHaveTextContent(seasonPath);
  expect(
    screen.getByRole("header", { name: "Collectes de la saison" }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Active")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Clôturer la saison" }),
  ).not.toBeOnTheScreen();
  await user.press(
    screen.getByRole("button", { name: "Actions de la saison" }),
  );
  expect(
    screen.queryByRole("button", { name: "Activer la saison" }),
  ).not.toBeOnTheScreen();
  expect(
    await screen.findByRole("button", { name: "Clôturer la saison" }),
  ).toBeEnabled();
  const writes = mockFetch.mock.calls.filter(
    ([, options]) => options?.method === "POST",
  );
  expect(writes).toHaveLength(1);
  expect(new URL(String(writes[0][0])).pathname).toBe(
    `/administration/collection-seasons/${seasonId}/activation`,
  );
  expect(writes[0][1]?.body).toBeUndefined();
  expect(
    mockFetch.mock.calls.some(([url]) =>
      String(url).includes("/source-bindings"),
    ),
  ).toBe(false);
});

it("keeps the explicit activation action after a refusal without verifying or retrying the write", async () => {
  // Given
  const serve = responses({ manageCollection: true }, false, {
    ...season,
    state: "preparing",
  });
  mockFetch.mockImplementation((url, options) =>
    options?.method === "POST" ? Promise.resolve(refused(409)) : serve(url),
  );
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () => router.push(`/collection/${seasonId}`));
  const activation = { name: "Activer la saison" };
  await chooseSeasonAction(user, activation.name);
  await user.type(
    await screen.findByLabelText("Saisissez 2026/2027 pour confirmer"),
    "2026/2027",
  );
  const seasonReads = () =>
    mockFetch.mock.calls.filter(([url]) =>
      String(url).endsWith(`/collection-seasons/${seasonId}`),
    );
  const readsBeforeSubmission = seasonReads().length;

  // When
  await user.press(screen.getByRole("button", activation));

  // Then
  expect(
    await screen.findByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", activation)).toBeEnabled();
  expect(screen.getByDisplayValue("2026/2027")).toBeOnTheScreen();
  expect(screen.queryByText("Saison activée.")).not.toBeOnTheScreen();
  expect(seasonReads()).toHaveLength(readsBeforeSubmission);
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
});

it("discards an open season activation confirmation after collection access is refused", async () => {
  // Given
  const serve = responses({ manageCollection: true }, false, {
    ...season,
    state: "preparing",
  });
  mockFetch.mockImplementation(serve);
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () => router.push(`/collection/${seasonId}`));
  await chooseSeasonAction(user, "Activer la saison");
  await user.type(
    await screen.findByLabelText("Saisissez 2026/2027 pour confirmer"),
    "2026/2027",
  );
  mockFetch.mockImplementation((url) =>
    String(url).endsWith("/accounts/me")
      ? Promise.resolve(refused(403))
      : serve(url),
  );

  // When
  await act(async () =>
    privateClient.invalidateQueries({
      queryKey: getGetMyAccountQueryKey(),
      exact: true,
    }),
  );
  await screen.findByRole("header", { name: "Blockout est en maintenance" });

  // Then
  expect(
    screen.queryByRole("button", { name: "Activer la saison" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "POST"),
  ).toBe(false);
});

it("keeps season actions hidden during a failed required read until its own Retry succeeds", async () => {
  // Given
  const serve = responses({ manageCollection: true }, false, {
    ...season,
    state: "preparing",
  });
  let status = 200;
  mockFetch.mockImplementation((url) =>
    String(url).endsWith(`/collection-seasons/${seasonId}`) && status !== 200
      ? Promise.resolve(refused(status))
      : serve(url),
  );
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () => router.push(`/collection/${seasonId}`));
  await screen.findByRole("button", { name: "Actions de la saison" });
  status = 403;

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByRole("alert", { name: "Une erreur est survenue" });
  status = 503;
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled(),
  );
  expect(
    screen.queryByRole("button", { name: "Actions de la saison" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("link", {
      name: "LNV, Les trois championnats professionnels",
    }),
  ).not.toBeOnTheScreen();

  // When
  status = 200;
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByRole("button", { name: "Actions de la saison" }),
  ).toBeEnabled();
  expect(
    screen.queryByRole("alert", { name: "Une erreur est survenue" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "POST"),
  ).toBe(false);
});

it("switches from Suivi to the read-only source catalogue in the provider tabs", async () => {
  // Given
  mockFetch.mockImplementation(responses({ manageCollection: true }));
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () => router.push("/collection"));

  // When
  await user.press(
    await screen.findByRole("link", { name: "2026/2027, Active" }),
  );
  await user.press(
    await screen.findByRole("link", {
      name: "LNV, Les trois championnats professionnels",
    }),
  );
  await screen.findByRole("tab", { name: "Suivi", selected: true });
  await layoutNativeTabs();
  await user.press(screen.getByRole("tab", { name: "Sources" }));
  await scrollNativeTabs(1, true);

  // Then
  expect(await screen.findByText(source.label)).toBeOnTheScreen();
  expect(
    screen.getByRole("tab", { name: "Sources", selected: true }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Route courante")).toHaveTextContent(
    `/collection/${seasonId}/controls/lnv`,
  );
  await act(async () => router.setParams({ scope: "regional" }));
  expect(screen.getByRole("button", { name: "Filtres" })).toBeEnabled();
  expect(screen.getByText(source.label)).toBeOnTheScreen();
});

it("searches the native FFVB reference and applies status and perimeter together", async () => {
  // Given
  const serve = responses({ manageCollection: true }, false, {
    ...season,
    state: "preparing",
  });
  const regional: SourceBindingResponse = {
    ...ffvbSource,
    id: "00000000-0000-4000-8000-000000000186",
    label: "Ligue Auvergne Rhône-Alpes",
    organizerReference: "LIRA",
    scope: "regional",
    catalog: { status: "partial" },
  };
  const departmental: SourceBindingResponse = {
    ...regional,
    id: "00000000-0000-4000-8000-000000000187",
    label: "Comité du Rhône",
    organizerReference: "PTRA69",
    scope: "departmental",
  };
  mockFetch.mockImplementation(async (url) =>
    new URL(String(url)).pathname.endsWith("/source-bindings")
      ? Response.json({ items: [ffvbSource, regional, departmental] })
      : serve(url),
  );
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () =>
    router.push(`/collection/${seasonId}/controls/ffvb?tab=sources`),
  );
  await layoutNativeTabs();
  await screen.findByRole("link", { name: regional.label });

  // When
  await user.type(screen.getByLabelText("Rechercher une source"), "lira");
  await user.press(screen.getByRole("tab", { name: "Suivi" }));
  await scrollNativeTabs(0, true);
  expect(screen.queryByLabelText("Rechercher une source")).toBeNull();
  await user.press(screen.getByRole("tab", { name: "Sources" }));
  await scrollNativeTabs(1, true);
  expect(screen.getByLabelText("Rechercher une source")).toHaveDisplayValue(
    "lira",
  );
  expect(screen.getByRole("link", { name: regional.label })).toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: departmental.label }),
  ).not.toBeOnTheScreen();
  await user.press(
    screen.getByRole("button", { name: "Effacer la recherche" }),
  );
  await user.press(screen.getByRole("button", { name: "Filtres" }));
  await user.press(await screen.findByRole("button", { name: "Statut" }));
  await user.press(await screen.findByRole("radio", { name: "Partiel" }));
  await user.press(screen.getByRole("button", { name: "Périmètre" }));
  await user.press(
    await screen.findByRole("radio", { name: "Ligues régionales" }),
  );
  await user.press(
    screen.getByRole("button", { name: "Appliquer les filtres" }),
  );

  // Then
  expect(
    await screen.findByRole("button", { name: "Filtres actifs" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("link", {
      name: regional.label,
      value: { text: "Partiel" },
    }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: ffvbSource.label }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: departmental.label }),
  ).not.toBeOnTheScreen();
});

it("keeps an invalid Bilan filter link dismissible without reading collection data", async () => {
  // Given
  mockFetch.mockImplementation(responses({ manageCollection: true }));
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });

  // When
  await act(async () =>
    router.push(`/collection/${seasonId}/controls/unknown/bilan-filters`),
  );
  expect(
    await screen.findByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Fermer" }));

  // Then
  expect(screen.getByLabelText("Route courante")).toHaveTextContent("/access");
  expect(
    mockFetch.mock.calls.some(([url]) =>
      new URL(String(url)).pathname.includes("collection-"),
    ),
  ).toBe(false);
});

it("opens a source-filtered Bilan and returns from the attributed source to the same criteria", async () => {
  // Given
  const serve = responses({ manageCollection: true });
  const attributed = result({
    scopeLabel: "D1 masculine · Phase régulière",
    source: { id: sourceId, label: source.label, phaseReference: "137" },
  });
  mockFetch.mockImplementation((url) =>
    new URL(String(url)).pathname.endsWith("/results")
      ? Promise.resolve(
          Response.json({ items: [attributed], page: 0, hasNext: false }),
        )
      : serve(url),
  );
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });

  // When
  const detail = `/collection/${seasonId}/sources/${sourceId}`;
  const bilan = `/collection/${seasonId}/controls/lnv/bilan`;
  await act(async () => router.push(`${detail}?phaseReference=137`));
  expect(await screen.findAllByText("Phase régulière")).toHaveLength(1);
  expect(screen.getByText("Phase 138")).toBeOnTheScreen();
  expect(screen.queryByText("Groupe A")).not.toBeOnTheScreen();
  await user.press(
    screen.getByRole("link", { name: "Voir le bilan de cette source" }),
  );
  const sourceLink = await screen.findByRole("link", {
    name: "Voir la source",
  });
  // Maintenance permits this operational read while the ordinary support route is gated.
  expect(
    screen.queryByRole("button", { name: "Contacter le support" }),
  ).not.toBeOnTheScreen();
  await user.press(sourceLink);
  await screen.findByText("Phase régulière");
  expect(screen.getByLabelText("Route courante")).toHaveTextContent(
    `/collection/${seasonId}/sources/${sourceId}`,
  );
  expect(screen.getByLabelText("Phase de destination")).toHaveTextContent(
    "137",
  );
  await user.press(screen.getByRole("button", { name: "Retour" }));

  // Then
  expect(await screen.findByText(attributed.scopeLabel)).toBeOnTheScreen();
  expect(screen.getByLabelText("Route courante")).toHaveTextContent(bilan);
  const reads = mockFetch.mock.calls
    .map(([url]) => new URL(String(url)))
    .filter((url) => url.pathname.endsWith("/results"));
  expect(reads.length).toBeGreaterThan(0);
  expect(
    reads.every((url) => url.searchParams.get("sourceId") === sourceId),
  ).toBe(true);

  await user.press(screen.getByRole("button", { name: "Filtres actifs" }));
  await user.press(
    await screen.findByRole("button", { name: "Réinitialiser les filtres" }),
  );
  await user.press(
    screen.getByRole("button", { name: "Appliquer les filtres" }),
  );
  expect(
    await screen.findByRole("button", { name: "Filtres" }),
  ).toBeOnTheScreen();
  await waitFor(() => {
    const latest = mockFetch.mock.calls
      .map(([url]) => new URL(String(url)))
      .findLast((url) => url.pathname.endsWith("/results"));
    expect(latest?.searchParams.has("sourceId")).toBe(false);
  });
});

it("can continue past another group of an already displayed LNV phase", async () => {
  // Given
  const serve = responses({ manageCollection: true });
  mockFetch.mockImplementation(async (url) => {
    const { pathname, searchParams } = new URL(String(url));
    if (!pathname.endsWith(`/source-bindings/${sourceId}/children`)) {
      return serve(url);
    }
    const page = Number(searchParams.get("page"));
    return Response.json({
      items: [
        {
          id: `00000000-0000-4000-8000-00000000018${page + 3}`,
          kind: "pool",
          label: `Groupe ${page + 1}`,
          phaseReference: page < 2 ? "137" : "138",
          phaseLabel: page < 2 ? "Saison régulière" : "Playoffs",
        },
      ],
      page,
      hasNext: page < 2,
    });
  });
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () =>
    router.push(`/collection/${seasonId}/sources/${sourceId}`),
  );
  await screen.findByText("Saison régulière");

  // When
  await user.press(
    await screen.findByRole("link", { name: "Afficher plus de phases" }),
  );
  await user.press(
    await screen.findByRole("link", { name: "Afficher plus de phases" }),
  );

  // Then
  expect(await screen.findByText("Playoffs")).toBeOnTheScreen();
  expect(screen.getAllByText("Saison régulière")).toHaveLength(1);
  expect(screen.queryByText("Groupe 2")).not.toBeOnTheScreen();
});

it("keeps accepted packs during a failed continuation and resumes seeking the attributed pool", async () => {
  // Given
  const serve = responses({ manageCollection: true });
  const childrenPath = `/source-bindings/${ffvbSource.id}/children`;
  const packId = "00000000-0000-4000-8000-000000000186";
  const poolId = "00000000-0000-4000-8000-000000000187";
  let rejectPackContinuation = true;
  mockFetch.mockImplementation(async (url) => {
    const { pathname, searchParams } = new URL(String(url));
    if (!pathname.endsWith(childrenPath)) {
      return serve(url);
    }
    const page = Number(searchParams.get("page"));
    if (searchParams.get("parentId") === packId) {
      return Response.json({
        items: [
          page === 0
            ? {
                id: "00000000-0000-4000-8000-000000000188",
                label: "Poule A",
                kind: "pool",
              }
            : { id: poolId, label: "Poule B", kind: "pool" },
        ],
        page,
        hasNext: page === 0,
      });
    }
    if (page === 1 && rejectPackContinuation) {
      return refused(503);
    }
    return Response.json({
      items: [
        page === 0
          ? {
              id: "00000000-0000-4000-8000-000000000189",
              label: "N1",
              kind: "pack",
            }
          : { id: packId, label: "N2", kind: "pack" },
      ],
      page,
      hasNext: page === 0,
    });
  });
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () =>
    router.push(
      `/collection/${seasonId}/sources/${ffvbSource.id}?packId=${packId}&poolId=${poolId}`,
    ),
  );
  const retry = await screen.findByRole("button", { name: "Réessayer" });
  expect(screen.getByRole("button", { name: "N1" })).toBeOnTheScreen();

  // When
  rejectPackContinuation = false;
  await user.press(retry);

  // Then
  expect(await screen.findByText("Poule B")).toBeOnTheScreen();
  expect(screen.getByText("Poule A")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "N2", expanded: true }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "N1" })).toBeOnTheScreen();
});

it("reloads a confirmed empty catalogue and then uses Réessayer for a failed application read", async () => {
  // Given
  const serve = responses({ manageCollection: true });
  const childrenPath = `/source-bindings/${ffvbSource.id}/children`;
  const deferred = Promise.withResolvers<Response>();
  let next = Promise.resolve(
    Response.json({ items: [], page: 0, hasNext: false }),
  );
  mockFetch.mockImplementation((url) =>
    new URL(String(url)).pathname.endsWith(childrenPath) ? next : serve(url),
  );
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () =>
    router.push(`/collection/${seasonId}/sources/${ffvbSource.id}`),
  );
  await screen.findByRole("header", { name: "Aucun pack découvert" });
  expect(
    screen.queryByLabelText("Actualiser les données"),
  ).not.toBeOnTheScreen();

  // When
  next = deferred.promise;
  await user.press(screen.getByRole("button", { name: "Actualiser" }));
  expect(
    await screen.findByRole("button", { name: "Actualiser", busy: true }),
  ).toBeDisabled();
  await act(() => deferred.resolve(refused(503)));
  const retry = await screen.findByRole("button", { name: "Réessayer" });
  next = Promise.resolve(
    Response.json({
      items: [
        {
          id: "00000000-0000-4000-8000-000000000186",
          label: "N2F",
          kind: "pack",
          poolCount: 1,
        },
      ],
      page: 0,
      hasNext: false,
    }),
  );
  await user.press(retry);

  // Then
  expect(
    await screen.findByRole("button", { name: "N2F, 1 poule" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Actualiser" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("alert", { name: "Une erreur est survenue" }),
  ).not.toBeOnTheScreen();
});

it.each(["partial", "unavailable"] as const)(
  "shows retained FFVB pools for provider status %s and keeps a failed mobile read at its own scope",
  async (status) => {
    // Given
    const user = userEvent.setup();
    const serve = responses({ manageCollection: true });
    const packId = "00000000-0000-4000-8000-000000000186";
    const poolId = "00000000-0000-4000-8000-000000000187";
    const pack: DiscoveredCollectionResourceResponse = {
      id: packId,
      kind: "pack",
      label: "N2F",
      poolCount: 1,
    };
    const pool: DiscoveredCollectionResourceResponse = {
      id: poolId,
      kind: "pool",
      label: "Poule A",
      parentId: packId,
    };
    let fails = true;
    mockFetch.mockImplementation(async (url) => {
      const { pathname, searchParams } = new URL(String(url));
      if (pathname.endsWith(`/source-bindings/${ffvbSource.id}`)) {
        return Response.json({
          ...ffvbSource,
          catalog: {
            status,
            observedAt: "2026-11-18T10:00:00Z",
            lastCompleteAt: "2026-11-17T10:00:00Z",
            reason: "Une partie du site officiel n’a pas répondu.",
          },
        });
      }
      if (pathname.endsWith(`/source-bindings/${ffvbSource.id}/children`)) {
        if (fails) {
          return refused(503);
        }
        return Response.json({
          items: [searchParams.get("parentId") ? pool : pack],
          page: 0,
          hasNext: false,
        });
      }
      return serve(url);
    });
    await openRoute("/access");
    await screen.findByRole("link", { name: "Accès administrateur" });
    const detail = `/collection/${seasonId}/sources/${ffvbSource.id}`;
    await act(async () =>
      router.push(`${detail}?packId=${packId}&poolId=${poolId}`),
    );
    expect(
      await screen.findByRole("button", { name: "Réessayer" }),
    ).toBeEnabled();
    expect(
      screen.queryByText("Le dernier catalogue connu reste affiché."),
    ).not.toBeOnTheScreen();

    // When
    fails = false;
    await user.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    expect(await screen.findByText(pool.label)).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "N2F, 1 poule", expanded: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(status === "partial" ? "Partiel" : "Indisponible"),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Le dernier catalogue connu reste affiché."),
    ).toBeOnTheScreen();
    expect(screen.getByText(/Dernière lecture complète/)).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Ouvrir le site officiel" }),
    ).toBeEnabled();
  },
);

it("keeps historical preparation eligible for typed closure and the closed season consultable", async () => {
  // Given
  let current: CollectionSeasonResponse = {
    ...season,
    label: "2025/2026",
    startYear: 2025,
    state: "preparing",
  };
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "POST") {
      current = { ...current, state: "closed" };
      return Promise.resolve(Response.json(current));
    }
    return responses({ manageCollection: true }, false, current)(url);
  });
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () => router.push(`/collection/${seasonId}`));

  // When
  await chooseSeasonAction(user, "Clôturer la saison");
  expect(
    await screen.findByRole("button", { name: "Clôturer la saison" }),
  ).toBeDisabled();
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "POST"),
  ).toBe(false);
  await user.type(
    await screen.findByLabelText("Saisissez 2025/2026 pour confirmer"),
    "2025/2026",
  );
  await user.press(screen.getByRole("button", { name: "Clôturer la saison" }));
  await user.press(
    await screen.findByRole("button", { name: "Retour à la saison" }),
  );

  // Then
  expect(await screen.findByText("Clôturée")).toBeOnTheScreen();
  expect(
    screen.getByRole("link", {
      name: "LNV, Les trois championnats professionnels",
    }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Actions de la saison" }),
  ).not.toBeOnTheScreen();
});

it("discards a closure draft on protected-route removal and confirms discard only for new input", async () => {
  // Given
  const serve = responses({ manageCollection: true });
  mockFetch.mockImplementation(serve);
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  const permissions = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url) =>
    String(url).endsWith("/accounts/me") ? permissions.promise : serve(url),
  );
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await act(async () => router.push(`/collection/${seasonId}`));
  await chooseSeasonAction(user, "Clôturer la saison");
  await user.type(
    await screen.findByLabelText("Saisissez 2026/2027 pour confirmer"),
    "2026/",
  );

  // When
  await act(async () =>
    permissions.resolve(
      Response.json(
        {
          type: "urn:blockout:problem:forbidden",
          title: "Forbidden",
          status: 403,
        },
        { status: 403 },
      ),
    ),
  );
  await screen.findByRole("header", { name: "Blockout est en maintenance" });
  mockFetch.mockImplementation(serve);
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () => router.push(`/collection/${seasonId}`));
  await chooseSeasonAction(user, "Clôturer la saison");

  // Then
  expect(
    await screen.findByLabelText("Saisissez 2026/2027 pour confirmer"),
  ).toHaveDisplayValue("");
  await user.type(
    screen.getByLabelText("Saisissez 2026/2027 pour confirmer"),
    "2026/",
  );
  // When
  await user.press(screen.getByRole("button", { name: "Annuler" }));
  const discard = jest
    .mocked(Alert.alert)
    .mock.lastCall?.[2]?.find((choice) => choice.text === "Abandonner");
  if (!discard?.onPress) {
    throw new Error("Missing native discard confirmation");
  }
  await act(async () => discard.onPress?.());
  // Then
  expect(
    await screen.findByRole("button", { name: "Actions de la saison" }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Route courante")).toHaveTextContent(
    new RegExp(`^/collection/${seasonId}$`),
  );
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "POST"),
  ).toBe(false);
});

it("retains the admitted closure route and its draft after a technical account reread failure", async () => {
  // Given: the real root and operational guards admit the known collection holder.
  const serve = responses({ manageCollection: true });
  mockFetch.mockImplementation(serve);
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () => router.push(`/collection/${seasonId}`));
  await chooseSeasonAction(user, "Clôturer la saison");
  await user.type(
    await screen.findByLabelText("Saisissez 2026/2027 pour confirmer"),
    "2026/",
  );
  mockFetch.mockImplementation((url) =>
    String(url).endsWith("/accounts/me")
      ? Promise.resolve(new Response(null, { status: 503 }))
      : serve(url),
  );

  // When
  await act(async () =>
    privateClient.refetchQueries({
      queryKey: getGetMyAccountQueryKey(),
      exact: true,
    }),
  );

  // Then
  await waitFor(() =>
    expect(
      privateClient.getQueryState(getGetMyAccountQueryKey())?.error,
    ).toMatchObject({ status: 503 }),
  );
  expect(screen.getByLabelText("Route courante")).toHaveTextContent(
    `/collection/${seasonId}/closure`,
  );
  expect(
    screen.getByLabelText("Saisissez 2026/2027 pour confirmer"),
  ).toHaveDisplayValue("2026/");
  expect(
    mockFetch.mock.calls.every(
      ([, options]) => !options?.method || options.method === "GET",
    ),
  ).toBe(true);
});

it("requires fresh confirmation after discarding a pending closure form without replaying it", async () => {
  // Given
  const serve = responses({ manageCollection: true });
  mockFetch.mockImplementation(serve);
  const pending = Promise.withResolvers<Response>();
  const user = userEvent.setup();
  mockFetch.mockImplementation((url, options) =>
    options?.method === "POST" ? pending.promise : serve(url),
  );
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () => router.push(`/collection/${seasonId}`));
  await chooseSeasonAction(user, "Clôturer la saison");
  await user.type(
    await screen.findByLabelText("Saisissez 2026/2027 pour confirmer"),
    "2026/2027",
  );
  await user.press(screen.getByRole("button", { name: "Clôturer la saison" }));
  await screen.findByRole("button", {
    name: "Clôturer la saison",
    busy: true,
  });

  // When
  await user.press(screen.getByRole("button", { name: "Annuler" }));
  const discard = jest
    .mocked(Alert.alert)
    .mock.lastCall?.[2]?.find((choice) => choice.text === "Abandonner");
  if (!discard?.onPress) {
    throw new Error("Missing native discard confirmation");
  }
  await act(async () => discard.onPress?.());
  await chooseSeasonAction(user, "Clôturer la saison");
  await screen.findByRole("button", {
    name: "Clôturer la saison",
    busy: false,
  });
  expect(
    screen.getByLabelText("Saisissez 2026/2027 pour confirmer"),
  ).toHaveDisplayValue("");
  await act(async () => pending.reject(new TypeError("Lost acknowledgement")));
  await screen.findByRole("button", {
    name: "Clôturer la saison",
    busy: false,
  });
  await user.type(
    await screen.findByLabelText("Saisissez 2026/2027 pour confirmer"),
    "2026/2027",
  );

  // Then
  expect(
    screen.getByRole("button", { name: "Clôturer la saison" }),
  ).toBeEnabled();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
});

it.each([{ manageMaintenance: true }, { bypassMaintenance: true }])(
  "refuses a collection deep link with unrelated rights %j",
  async (permissions) => {
    // Given
    mockFetch.mockImplementation(responses(permissions));
    await openRoute("/access");
    await screen.findByRole("link", { name: "Accès administrateur" });

    // When
    await act(async () =>
      router.push(`/collection/${seasonId}/controls/lnv?tab=sources`),
    );

    // Then
    await waitFor(() =>
      expect(screen.getByLabelText("Route courante")).not.toHaveTextContent(
        `/collection/${seasonId}/controls/lnv`,
      ),
    );
    expect(
      mockFetch.mock.calls.some(([url]) =>
        String(url).includes("/collection-seasons"),
      ),
    ).toBe(false);
  },
);

it("keeps collection operations closed to an outdated client even with the collection grant", async () => {
  // Given
  mockFetch.mockImplementation(responses({ manageCollection: true }, true));
  await openRoute("/access");
  await screen.findByText("Maintenance demo");

  // When
  await act(async () => router.push("/collection"));

  // Then
  await waitFor(() =>
    expect(screen.getByLabelText("Route courante")).not.toHaveTextContent(
      "/collection",
    ),
  );
  expect(
    mockFetch.mock.calls.some(([url]) =>
      String(url).includes("/collection-seasons"),
    ),
  ).toBe(false);
});

it("reloads empty Suivi and retries a failed read of the selected season's controls", async () => {
  // Given
  const serve = responses({ manageCollection: true });
  const reload = Promise.withResolvers<Response>();
  const retry = Promise.withResolvers<Response>();
  let nextRead: Promise<Response> | undefined;
  mockFetch.mockImplementation((url) =>
    new URL(String(url)).pathname.endsWith("/collection-controls") && nextRead
      ? nextRead
      : serve(url),
  );
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () => router.push(`/collection/${seasonId}/controls/ffvb`));
  await screen.findByRole("header", { name: "Aucun contrôle de collecte" });
  mockFetch.mockClear();

  // When
  nextRead = reload.promise;
  await user.press(screen.getByRole("button", { name: "Actualiser" }));
  expect(
    await screen.findByRole("button", { name: "Actualiser", busy: true }),
  ).toBeDisabled();
  await act(() => reload.resolve(refused(503)));
  nextRead = retry.promise;
  await user.press(await screen.findByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByRole("button", { name: "Réessayer", busy: true }),
  ).toBeDisabled();
  expect(
    screen.getByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Actualiser" })).toBeNull();
  const requested = mockFetch.mock.calls.map(([url, options]) => {
    const { pathname, search } = new URL(String(url));
    return [options?.method ?? "GET", `${pathname}${search}`];
  });
  const controlsRequest = [
    "GET",
    `/administration/collection-controls?seasonId=${seasonId}`,
  ];
  expect(requested).toEqual([controlsRequest, controlsRequest]);

  // When
  await act(() =>
    retry.resolve(Response.json({ items: [control({ seasonId })] })),
  );

  // Then
  expect(
    await screen.findByRole("button", { name: "Mettre en pause" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
});

it.each(["preparing", "active"] as const)(
  "keeps Sources accessible when the %s season has no provider control yet",
  async (state) => {
    // Given
    const serve = responses({ manageCollection: true });
    mockFetch.mockImplementation((url) => {
      const path = new URL(String(url)).pathname;
      if (path.endsWith("/collection-controls")) {
        return Promise.resolve(Response.json({ items: [] }));
      }
      if (path.endsWith(`/collection-seasons/${seasonId}`)) {
        return Promise.resolve(Response.json({ ...season, state }));
      }
      return serve(url);
    });
    const user = userEvent.setup();
    await openRoute("/access");
    await screen.findByRole("link", { name: "Accès administrateur" });

    // When
    await act(async () => router.push(`/collection/${seasonId}/controls/ffvb`));
    await screen.findByText("Aucun contrôle de collecte");
    await layoutNativeTabs();
    await user.press(screen.getByRole("tab", { name: "Sources" }));
    await scrollNativeTabs(1, true);
    // Then
    expect(await screen.findByText("Championnats nationaux")).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Relancer" }),
    ).not.toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.every(
        ([, options]) => !options?.method || options.method === "GET",
      ),
    ).toBe(true);
  },
);
