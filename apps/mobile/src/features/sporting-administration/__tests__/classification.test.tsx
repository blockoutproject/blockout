import { useLayoutEffect } from "react";
import { ClassificationVisitProvider } from "../forms/classification-visit";
import { nativeAlertAction } from "../../../shared/native/test-support/native-alert";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import {
  QueryClientProvider,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  getGetPoolClassificationQueryKey,
  getListClubTeamsQueryKey,
} from "../../../../.generated/mobile";
import {
  cleanup,
  act,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Alert, Pressable, Text } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ComponentType, PropsWithChildren } from "react";
import RootLayout from "../../../app/_layout";
import OnboardingRoute from "../../../app/onboarding";
import OperationsLayout from "../../../app/(operations)/_layout";
import ClassificationRoute from "../../../app/(operations)/administration/classification/[kind]/[id]";
import DivisionsRoute from "../../../app/(operations)/administration/divisions/index";
import DivisionRoute from "../../../app/(operations)/administration/divisions/[id]";
import ClassificationSelectionRoute from "../../../app/(operations)/administration/classification-selection";
import { ClassificationSelectionScreen } from "../screens/classification-selection-screen";
import { PresentationScreen } from "../screens/presentation-screen";
import CreateDivisionRoute from "../../../app/(operations)/administration/divisions/new";
import { AdministrationScreen } from "../../access/screens/administration-screen";
import { useCurrentAccount } from "../../accounts/current-account";
import { ClassificationEntry } from "../entry";
import { completeDiscovery } from "../../onboarding/discovery-state";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { applicationAccessResponse as mockAccess } from "../../../shared/api/test-support/application-access";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { ClassificationScreen } from "../screens/classification-screen";
import { DivisionsScreen } from "../screens/divisions-screen";

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
jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock(
  "react-native-safe-area-context",
  () =>
    jest.requireActual("react-native-safe-area-context/src/jest/mock").default,
);
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    String(url).endsWith("/application-access")
      ? Promise.resolve(Response.json(mockAccess()))
      : mockFetch(url, options),
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const id = "00000000-0000-4000-8000-000000000178";
const divisionId = "00000000-0000-4000-8000-000000000179";
const inactiveId = "00000000-0000-4000-8000-000000000180";
const division = {
  id: divisionId,
  revision: "d1",
  name: "National 2",
  color: "#123456",
  gradient: null,
  logo: { effectiveUrl: null, automaticUrl: null, manualUrl: null },
  active: true,
};
const classification = { divisionId, format: "6x6", gender: "female" };
let stored = {
  id,
  revision: "r1",
  setting: null as typeof classification | null,
  effective: classification as typeof classification | null,
};
let permissions: Record<string, boolean>;
let client: QueryClient;
let publicClient = createQueryClient();
const environment = { ...process.env };
/** Deterministic transport responses still pass through the real generated schema boundary. */
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type":
        status >= 400 ? "application/problem+json" : "application/json",
    },
  });
}
/** Synthetic baseline HTTP peer; each scenario owns its changed network outcome. */
async function respond(
  url: RequestInfo | URL,
  _options?: RequestInit,
): Promise<Response> {
  return json(
    String(url).endsWith("/accounts/me")
      ? {
          accountId: "00000000-0000-4000-8000-000000000001",
          username: "Operator",
          email: "operator@example.invalid",
          principalCreatedAt: null,
          hasPhoto: false,
          permissions,
        }
      : String(url).includes("/divisions?")
        ? {
            items: [
              division,
              { ...division, id: inactiveId, name: "Inactive", active: false },
            ],
          }
        : String(url).includes(`/divisions/${divisionId}`)
          ? division
          : stored,
  );
}
beforeEach(async () => {
  await completeDiscovery();
  jest.mocked(initializeV2Installation).mockResolvedValue();
  publicClient = createQueryClient();
  stored = { id, revision: "r1", setting: null, effective: classification };
  permissions = {
    manageSportingClassification: true,
    manageDivisionLifecycle: true,
  };
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
  });
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|operator-178"));
  mockFetch.mockReset().mockImplementation(respond);
});
afterEach(async () => {
  await cleanup();
  client?.clear();
  publicClient.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});
/** Selects the real private client with one-shot reads and no detached mutation GC timers in these scenarios. */
function PrivateQueries({ children }: PropsWithChildren) {
  const current = useQueryClient();
  useLayoutEffect(() => {
    client = current;
    current.setQueryDefaults([], { retry: false });
    current.setMutationDefaults([], { gcTime: Infinity });
  }, [current]);
  return children;
}

/** Uses real session, access, Query and theme owners; only device credentials and HTTP are controlled. */
async function renderEditor(
  kind: "pack" | "pool" | "divisions" | "division" = "pool",
) {
  await renderRouter(
    {
      _layout: () => <Stack screenOptions={{ headerShown: false }} />,
      index: () =>
        kind === "divisions" ? (
          <DivisionsScreen />
        ) : kind === "division" ? (
          <PresentationScreen target={{ kind, id: divisionId }} />
        ) : (
          <ClassificationScreen target={{ kind, id }} />
        ),
      /** Reads the real selector route parameters while keeping its visit owner in the fixture wrapper. */
      "administration/classification-selection":
        function SelectionRouteFixture() {
          const params = useLocalSearchParams<{
            kind: "pack" | "pool";
            id: string;
            field: "divisionId" | "gender" | "format";
          }>();
          return (
            <ClassificationSelectionScreen
              target={params}
              field={params.field}
            />
          );
        },
    },
    {
      initialUrl: "/",
      wrapper: ({ children }) => (
        <QueryClientProvider client={publicClient}>
          <ThemeProvider>
            <ApplicationAccessProvider>
              <AccountSessionProvider>
                <PrivateQueries>
                  <AccountFeedbackProvider>
                    <ClassificationVisitProvider>
                      {children}
                    </ClassificationVisitProvider>
                  </AccountFeedbackProvider>
                </PrivateQueries>
              </AccountSessionProvider>
            </ApplicationAccessProvider>
          </ThemeProvider>
        </QueryClientProvider>
      ),
    },
  );
}
it("announces the pending division catalogue without inventing editable rows", async () => {
  // Given
  const response = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) =>
    String(url).includes("/divisions?")
      ? response.promise
      : respond(url, options),
  );

  // When
  await renderEditor("divisions");

  // Then
  expect(
    await screen.findByRole("progressbar", {
      name: "Chargement des divisions",
    }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: division.name }),
  ).not.toBeOnTheScreen();

  // When
  await act(() => response.resolve(Response.json({ items: [division] })));

  // Then
  expect(
    await screen.findByRole("link", { name: division.name }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
});

it("submits a complete pool override after confirmation and excludes inactive choices", async () => {
  // Given
  jest.spyOn(Alert, "alert");
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PUT") {
      stored = {
        ...stored,
        revision: "r2",
        setting: { divisionId, format: "4x4", gender: "mixed" },
      };
      return Promise.resolve(json(stored));
    }
    return respond(url, options);
  });
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByRole("radio", { name: "Du pack" });
  // When
  await user.press(screen.getByRole("radio", { name: "Personnalisé" }));
  await user.press(await screen.findByRole("button", { name: "Division" }));
  await user.press(await screen.findByRole("radio", { name: "National 2" }));
  await screen.findByRole("button", { name: "Division" });
  await user.press(await screen.findByRole("button", { name: "Format" }));
  await user.press(await screen.findByRole("radio", { name: "4 × 4" }));
  await screen.findByRole("button", { name: "Format" });
  await user.press(await screen.findByRole("button", { name: "Genre" }));
  await user.press(await screen.findByRole("radio", { name: "Mixte" }));
  await screen.findByRole("button", { name: "Genre" });
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  // Then
  expect(screen.queryByRole("radio", { name: "Inactive" })).toBeNull();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(0);
  // When
  await act(async () => nativeAlertAction("Enregistrer")());
  // Then
  await waitFor(() =>
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/pools/${id}/classification`),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          revision: "r1",
          classification: { divisionId, format: "4x4", gender: "mixed" },
        }),
      }),
    ),
  );
  await waitFor(() =>
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen(),
  );
});

it("refreshes classification data without replacing dirty choices or accepting a newer editing baseline", async () => {
  // Given
  stored.setting = classification;
  const user = userEvent.setup();
  await renderEditor();
  await user.press(await screen.findByRole("button", { name: "Format" }));
  await user.press(await screen.findByRole("radio", { name: "4 × 4" }));
  await screen.findByRole("button", { name: "Format" });
  stored = { ...stored, revision: "r2" };

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await screen.findByRole("button", { name: "Relire la classification" });
  expect(
    screen.getByRole("button", { name: "Format" }),
  ).toHaveAccessibilityValue({ text: "4 × 4" });
  expect(screen.getByText("Modifications non enregistrées")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  expect(
    mockFetch.mock.calls.every(([, options]) => options?.method === "GET"),
  ).toBe(true);
});

it("refreshes an empty division catalogue without changing its search or activity filter", async () => {
  // Given
  let listed = false;
  mockFetch.mockImplementation((url, options) =>
    String(url).includes("/divisions?")
      ? Promise.resolve(
          json({ items: listed ? [{ ...division, active: false }] : [] }),
        )
      : respond(url, options),
  );
  const user = userEvent.setup();
  await renderEditor("divisions");
  await screen.findByText("Aucune division active");
  await user.type(screen.getByLabelText("Rechercher une division"), "National");
  await user.press(screen.getByRole("tab", { name: "Inactives" }));
  listed = true;

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("link", { name: "National 2" }),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("National")).toBeOnTheScreen();
  expect(
    screen.getByRole("tab", { name: "Inactives", selected: true }),
  ).toBeOnTheScreen();
});

it("removes the complete pack default with explicit null", async () => {
  // Given
  stored.setting = classification;
  jest.spyOn(Alert, "alert");
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PUT") {
      stored = { ...stored, revision: "r2", setting: null };
      return Promise.resolve(json(stored));
    }
    return respond(url, options);
  });
  const user = userEvent.setup();
  await renderEditor("pack");
  await screen.findByRole("radio", { name: "Sans classification" });
  // When
  await user.press(screen.getByRole("radio", { name: "Sans classification" }));
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Enregistrer")());
  // Then
  await waitFor(() =>
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ revision: "r1", classification: null }),
      }),
    ),
  );
  await waitFor(() =>
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen(),
  );
});

it("retains dirty choices and displays conflicting scopes without applying a subset", async () => {
  // Given
  jest.spyOn(Alert, "alert");
  const initialFetch = respond;
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT"
      ? Promise.resolve(
          json(
            {
              type: "urn:blockout:problem:classification-conflict",
              title: "Conflict",
              status: 409,
              conflictingResourceIds: [inactiveId],
            },
            409,
          ),
        )
      : initialFetch(url, options),
  );
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByRole("radio", { name: "Personnalisé" });
  // When
  await user.press(screen.getByRole("radio", { name: "Personnalisé" }));
  await user.press(await screen.findByRole("button", { name: "Division" }));
  await user.press(await screen.findByRole("radio", { name: "National 2" }));
  await screen.findByRole("button", { name: "Division" });
  await user.press(await screen.findByRole("button", { name: "Format" }));
  await user.press(await screen.findByRole("radio", { name: "2 × 2" }));
  await screen.findByRole("button", { name: "Format" });
  await user.press(await screen.findByRole("button", { name: "Genre" }));
  await user.press(await screen.findByRole("radio", { name: "Masculin" }));
  await screen.findByRole("button", { name: "Genre" });
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Enregistrer")());
  // Then
  expect(await screen.findByText(new RegExp(inactiveId))).toBeOnTheScreen();
  expect(
    screen.getByText(
      /division inactive, participations partagées ou identité d’équipe incompatible/,
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Format" }),
  ).toHaveAccessibilityValue({ text: "2 × 2" });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
  );
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
});
it("preserves a failed write draft without requiring recovery or replaying the request", async () => {
  // Given
  stored.setting = classification;
  jest.spyOn(Alert, "alert");
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT"
      ? Promise.reject(new TypeError("Lost response"))
      : respond(url, options),
  );
  const user = userEvent.setup();
  await renderEditor();
  await user.press(await screen.findByRole("button", { name: "Format" }));
  await user.press(await screen.findByRole("radio", { name: "4 × 4" }));
  await screen.findByRole("button", { name: "Format" });

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Enregistrer")());

  // Then
  await screen.findByText(
    "Une erreur est survenue. Veuillez réessayer plus tard.",
  );
  expect(
    screen.getByRole("button", { name: "Format" }),
  ).toHaveAccessibilityValue({ text: "4 × 4" });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
  );
  expect(
    screen.queryByRole("button", { name: "Relire la classification" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
});
it("uses an independent explicit activity command with the division revision", async () => {
  // Given
  jest.spyOn(Alert, "alert");
  let current = division;
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PUT")
      current = { ...division, revision: "d2", active: false };
    return String(url).includes(`/divisions/${divisionId}`)
      ? Promise.resolve(json(current))
      : respond(url, options);
  });
  const user = userEvent.setup();
  await renderEditor("division");
  // When
  await user.press(
    await screen.findByRole("button", { name: "Désactiver la division" }),
  );
  await act(async () => nativeAlertAction("Désactiver")());
  // Then
  await waitFor(() =>
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(`/divisions/${divisionId}/activity`),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ revision: "d1", active: false }),
      }),
    ),
  );
});
it("does not grant classification reads or writes to a lifecycle-only operator", async () => {
  // Given
  permissions = { manageDivisionLifecycle: true };
  // When
  await renderEditor();
  // Then
  expect(await screen.findByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) =>
      String(url).includes("/classification"),
    ),
  ).toBe(false);
});

it("refuses an incomplete override without opening confirmation or writing", async () => {
  // Given
  stored.effective = null;
  jest.spyOn(Alert, "alert");
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByRole("radio", { name: "Personnalisé" });

  // When
  await user.press(screen.getByRole("radio", { name: "Personnalisé" }));
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  expect(
    await screen.findByText("Choisissez une division active."),
  ).toBeOnTheScreen();
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PUT"),
  ).toBe(false);
});

it("keeps dirty choices through a failed ordinary refresh without retrying the write", async () => {
  // Given
  stored.setting = classification;
  jest.spyOn(Alert, "alert");
  const initialFetch = respond;
  let failedRead = false;
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT" ||
    (failedRead && String(url).includes("/classification"))
      ? Promise.reject(new TypeError("Unavailable"))
      : initialFetch(url, options),
  );
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByRole("button", { name: "Format" });

  // When
  await user.press(await screen.findByRole("button", { name: "Format" }));
  await user.press(await screen.findByRole("radio", { name: "4 × 4" }));
  await screen.findByRole("button", { name: "Format" });
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Enregistrer")());
  await screen.findByText(
    "Une erreur est survenue. Veuillez réessayer plus tard.",
  );
  failedRead = true;
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await screen.findByText(
    "Une erreur est survenue. Veuillez réessayer plus tard.",
  );
  expect(
    screen.getByRole("button", { name: "Format" }),
  ).toHaveAccessibilityValue({ text: "4 × 4" });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled(),
  );
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
});

it("refreshes saved activity after a failed deactivation response before explicit reactivation", async () => {
  // Given
  jest.spyOn(Alert, "alert");
  const initialFetch = respond;
  let deactivationSent = false;
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PUT") {
      deactivationSent = true;
      return Promise.reject(new TypeError("Lost response"));
    }
    return deactivationSent && String(url).endsWith(`/divisions/${divisionId}`)
      ? Promise.resolve(json({ ...division, revision: "d2", active: false }))
      : initialFetch(url, options);
  });
  const user = userEvent.setup();
  await renderEditor("division");

  // When
  await user.press(
    await screen.findByRole("button", { name: "Désactiver la division" }),
  );
  await act(async () => nativeAlertAction("Désactiver")());
  await user.press(
    await screen.findByRole("button", { name: "Relire la division" }),
  );

  // Then
  expect(
    await screen.findByRole("button", { name: "Réactiver la division" }),
  ).toBeEnabled();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
});

/** Exposes real account refresh and keeps protected-route fixture mutations free of detached GC timers. */
function PermissionRefresh() {
  const cache = useQueryClient();
  useLayoutEffect(() => {
    cache.setMutationDefaults([], { gcTime: Infinity });
  }, [cache]);
  const account = useCurrentAccount();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Relire les permissions"
      onPress={() => void account.refetch()}
    >
      <Text>
        {account.isSuccess ? "Permissions connues" : "Permissions en attente"}
      </Text>
    </Pressable>
  );
}
/** Real root and operational layouts retain all declared routes; unrelated destinations remain probes. */
async function openRoutes() {
  return renderRouter(
    {
      _layout: () => <RootLayout />,
      access: PermissionRefresh,
      onboarding: OnboardingRoute,
      "age-declaration": () => null,
      "(ordinary)/_layout": () => (
        <Stack screenOptions={{ headerShown: false }} />
      ),
      "(ordinary)/index": () => (
        <>
          <ClassificationEntry target={{ kind: "pool", id }} />
          <PermissionRefresh />
        </>
      ),
      "(operations)/_layout": () => (
        <>
          <OperationsLayout />
          <PermissionRefresh />
        </>
      ),
      "(operations)/administration/maintenance": () => (
        <Text>Maintenance route</Text>
      ),
      "(operations)/administration/application-versions": () => (
        <Text>Versions route</Text>
      ),
      "(operations)/collection": () => <Text>Collection route</Text>,
      "(operations)/administration/presentation/[kind]/[id]": () => (
        <Text>Presentation route</Text>
      ),
      "(operations)/administration/index": () => (
        <AdministrationScreen admitted />
      ),
      "(operations)/administration/classification/[kind]/[id]":
        ClassificationRoute,
      "(operations)/administration/divisions/index": DivisionsRoute,
      "(operations)/administration/divisions/[id]": DivisionRoute,
      "(operations)/administration/classification-selection":
        ClassificationSelectionRoute,
      "(operations)/administration/divisions/new": CreateDivisionRoute,
    },
    { initialUrl: "/" },
  );
}

it("drops the local classification draft when its protected route is removed", async () => {
  // Given
  permissions = { manageSportingClassification: true };
  stored.setting = classification;
  const user = userEvent.setup();
  await openRoutes();
  await user.press(await screen.findByText("Modifier la classification"));
  await user.press(await screen.findByRole("button", { name: "Format" }));
  await user.press(await screen.findByRole("radio", { name: "4 × 4" }));
  await screen.findByRole("button", { name: "Format" });

  // When
  permissions = {};
  await user.press(
    await screen.findByRole("button", { name: "Relire les permissions" }),
  );

  // Then
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Format" }),
    ).not.toBeOnTheScreen(),
  );

  // When
  permissions = { manageSportingClassification: true };
  await user.press(
    await screen.findByRole("button", { name: "Relire les permissions" }),
  );
  await user.press(await screen.findByText("Modifier la classification"));

  // Then
  expect(
    await screen.findByRole("button", { name: "Format" }),
  ).toHaveAccessibilityValue({ text: "6 × 6" });
  expect(
    screen.queryByText("Modifications non enregistrées"),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PUT"),
  ).toBe(false);
});
it("admits the divisions administration destination for the lifecycle grant alone", async () => {
  // Given
  permissions = { manageDivisionLifecycle: true };
  const user = userEvent.setup();
  await openRoutes();
  await screen.findByRole("button", { name: "Relire les permissions" });

  // When
  await screen.findByText("Permissions connues");
  await act(async () => router.push("/administration"));
  await user.press(await screen.findByText("Divisions"));

  // Then
  await screen.findByRole("header", { name: "Divisions" });
  expect(
    await screen.findByRole("button", { name: "Créer une division" }),
  ).toBeEnabled();
  expect(screen.queryByText("Modifier la présentation")).not.toBeOnTheScreen();
});

it.each(["classification", "activity"])(
  "invalidates a previously loaded club team list after accepted %s",
  async (operation) => {
    // Given
    const clubKey = getListClubTeamsQueryKey(id, { seasonId: inactiveId });
    jest.spyOn(Alert, "alert");
    let accepted = false;
    mockFetch.mockImplementation((url, options) => {
      if (options?.method === "PUT") {
        accepted = true;
        return Promise.resolve(
          json(
            operation === "activity"
              ? { ...division, revision: "d2", active: false }
              : { ...stored, revision: "r2" },
          ),
        );
      }
      return accepted &&
        operation === "activity" &&
        String(url).includes("/divisions?")
        ? Promise.resolve(
            json({ items: [{ ...division, revision: "d2", active: false }] }),
          )
        : respond(url, options);
    });
    const user = userEvent.setup();
    await renderEditor(operation === "activity" ? "division" : "pool");
    client.setQueryData(clubKey, { seasonId: inactiveId, items: [] });

    // When
    if (operation === "activity")
      await user.press(
        await screen.findByRole("button", { name: "Désactiver la division" }),
      );
    else
      await user.press(
        await screen.findByRole("button", { name: "Enregistrer" }),
      );
    await act(async () =>
      nativeAlertAction(
        operation === "activity" ? "Désactiver" : "Enregistrer",
      )(),
    );

    // Then
    if (operation === "activity")
      await screen.findByText(
        "Division désactivée. L’historique est conservé.",
      );
    await waitFor(() =>
      expect(client.getQueryState(clubKey)?.isInvalidated).toBe(true),
    );
    expect(
      publicClient.getQueryState(["/application-access"])?.isInvalidated,
    ).toBe(false);
  },
);

it("distinguishes a stale revision and uses the reread revision only on explicit resubmission", async () => {
  // Given
  stored.setting = classification;
  jest.spyOn(Alert, "alert");
  let refuse = true;
  mockFetch.mockImplementation((url, options) => {
    if (options?.method !== "PUT") return respond(url, options);
    if (refuse) {
      stored = { ...stored, revision: "r2" };
      return Promise.resolve(
        json(
          {
            type: "urn:blockout:problem:stale-revision",
            title: "Conflict",
            status: 409,
          },
          409,
        ),
      );
    }
    stored = {
      ...stored,
      revision: "r3",
      setting: { ...classification, format: "4x4" },
    };
    return Promise.resolve(json(stored));
  });
  const user = userEvent.setup();
  await renderEditor();
  await user.press(await screen.findByRole("button", { name: "Format" }));
  await user.press(await screen.findByRole("radio", { name: "4 × 4" }));
  await screen.findByRole("button", { name: "Format" });

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Enregistrer")());
  await screen.findByText(/La classification a changé depuis votre lecture/);
  stored = { ...stored, revision: "r2" };
  await user.press(
    await screen.findByRole("button", { name: "Relire la classification" }),
  );
  refuse = false;
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Enregistrer")());

  // Then
  await waitFor(() =>
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen(),
  );
  const writes = mockFetch.mock.calls.filter(
    ([, options]) => options?.method === "PUT",
  );
  expect(writes).toHaveLength(2);
  expect(JSON.parse(String(writes[1][1]?.body))).toEqual({
    revision: "r2",
    classification: { ...classification, format: "4x4" },
  });
});

it("retains dirty choices when the server refuses a confirmation after the grant was revoked", async () => {
  // Given
  jest.spyOn(Alert, "alert");
  stored.setting = classification;
  const user = userEvent.setup();
  await renderEditor();
  await user.press(await screen.findByRole("button", { name: "Format" }));
  await user.press(await screen.findByRole("radio", { name: "4 × 4" }));
  await screen.findByRole("button", { name: "Format" });
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  permissions = { manageDivisionLifecycle: true };
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT"
      ? Promise.resolve(
          json(
            {
              type: "urn:blockout:problem:forbidden",
              title: "Forbidden",
              status: 403,
            },
            403,
          ),
        )
      : respond(url, options),
  );
  await act(async () =>
    client.refetchQueries({
      predicate: ({ queryKey }) => queryKey.includes("/accounts/me"),
    }),
  );

  // When
  await act(async () => nativeAlertAction("Enregistrer")());

  // Then
  await screen.findByText(
    "Une erreur est survenue. Veuillez réessayer plus tard.",
  );
  expect(
    screen.getByRole("button", { name: "Format" }),
  ).toHaveAccessibilityValue({ text: "4 × 4" });
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
});
it("shows current activity on reentry for an operator with classification permission only", async () => {
  // Given
  permissions = { manageSportingClassification: true };
  let active = true;
  mockFetch.mockImplementation((url, options) =>
    String(url).includes("/divisions?")
      ? Promise.resolve(
          json({
            items: [{ ...division, revision: active ? "d1" : "d2", active }],
          }),
        )
      : respond(url, options),
  );
  const user = userEvent.setup();
  await openRoutes();
  await screen.findByText("Permissions connues");
  await act(async () => router.push("/administration/divisions"));
  await screen.findByText("National 2");

  // When
  await act(async () => router.back());
  active = false;
  await user.press(
    await screen.findByRole("button", { name: "Relire les permissions" }),
  );
  await act(async () => router.push("/administration/divisions"));
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([url]) =>
        String(url).includes("/divisions?"),
      ),
    ).toHaveLength(2),
  );

  // Then
  await screen.findByText("Aucune division active");
  // When
  await user.press(screen.getByRole("tab", { name: "Inactives" }));
  // Then
  expect(await screen.findByText("National 2")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Désactiver la division" }),
  ).not.toBeOnTheScreen();
});

it("filters division names within the selected activity catalogue without exposing lifecycle commands on cards", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor("divisions");
  await screen.findByRole("link", { name: "National 2" });

  // When
  await user.type(screen.getByLabelText("Rechercher une division"), "national");
  await user.press(screen.getByRole("tab", { name: "Inactives" }));

  // Then
  expect(
    await screen.findByText("Aucune division ne correspond à votre recherche."),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Désactiver la division" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PUT"),
  ).toBe(false);
});

it("clears the division search without resetting the selected activity catalogue", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor("divisions");
  await screen.findByRole("link", { name: "National 2" });
  await user.type(screen.getByLabelText("Rechercher une division"), "national");
  await user.press(screen.getByRole("tab", { name: "Inactives" }));
  await screen.findByText("Aucune division ne correspond à votre recherche.");

  // When
  await user.press(
    screen.getByRole("button", { name: "Effacer la recherche" }),
  );

  // Then
  expect(screen.getByLabelText("Rechercher une division")).toHaveDisplayValue(
    "",
  );
  expect(
    screen.getByRole("tab", { name: "Inactives", selected: true }),
  ).toBeOnTheScreen();
  expect(
    await screen.findByRole("link", { name: "Inactive" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("link", { name: "National 2" }),
  ).not.toBeOnTheScreen();
});

it("opens division creation from the catalogue for a lifecycle-only operator", async () => {
  // Given
  permissions = { manageDivisionLifecycle: true };
  const user = userEvent.setup();
  await openRoutes();
  await screen.findByText("Permissions connues");
  await act(async () => router.push("/administration/divisions"));

  // When
  await user.press(
    await screen.findByRole("button", { name: "Créer une division" }),
  );

  // Then
  expect(
    await screen.findByRole("header", { name: "Créer une division" }),
  ).toBeOnTheScreen();
  expect(await screen.findByLabelText("Nom de la division")).toBeOnTheScreen();
});

it("discards a held classification confirmation when its protected route is removed", async () => {
  // Given
  permissions = { manageSportingClassification: true };
  stored.setting = classification;
  const user = userEvent.setup();
  await openRoutes();
  await user.press(await screen.findByText("Modifier la classification"));
  jest.spyOn(Alert, "alert");
  await user.press(await screen.findByRole("button", { name: "Enregistrer" }));
  const confirmation = jest
    .mocked(Alert.alert)
    .mock.lastCall?.[2]?.find(
      (action) => action.text === "Enregistrer",
    )?.onPress;
  if (!confirmation)
    throw new Error("Missing native classification confirmation");

  // When
  permissions = {};
  await user.press(
    await screen.findByRole("button", { name: "Relire les permissions" }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Enregistrer" }),
    ).not.toBeOnTheScreen(),
  );
  await act(async () => confirmation());

  // Then
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PUT"),
  ).toBe(false);
});

it("keeps classification choices but disables editing after a current resource refusal", async () => {
  // Given
  stored.setting = classification;
  const user = userEvent.setup();
  await renderEditor();
  await user.press(await screen.findByRole("button", { name: "Format" }));
  await user.press(await screen.findByRole("radio", { name: "4 × 4" }));
  await screen.findByRole("button", { name: "Format" });
  mockFetch.mockImplementation((url, options) =>
    String(url).includes("/classification")
      ? Promise.resolve(json({ title: "Forbidden", status: 403 }, 403))
      : respond(url, options),
  );

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Format" }),
  ).toHaveAccessibilityValue({ text: "4 × 4" });
  expect(screen.getByRole("button", { name: "Format" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  expect(screen.getByText("Modifications non enregistrées")).toBeOnTheScreen();
});

it("keeps an open selector's known choices visible and read-only after its grant is withdrawn", async () => {
  // Given
  stored.setting = classification;
  const user = userEvent.setup();
  await renderEditor();
  await user.press(await screen.findByRole("button", { name: "Format" }));
  await user.press(await screen.findByRole("radio", { name: "4 × 4" }));
  await screen.findByRole("button", { name: "Format" });
  await user.press(screen.getByRole("button", { name: "Format" }));
  await screen.findByRole("radio", { name: "4 × 4", checked: true });

  // When
  permissions = {};
  await act(async () =>
    client.refetchQueries({
      predicate: ({ queryKey }) => queryKey.includes("/accounts/me"),
    }),
  );

  // Then
  await waitFor(() =>
    expect(screen.getByRole("radio", { name: "2 × 2" })).toBeDisabled(),
  );
  expect(
    screen.getByRole("radio", { name: "4 × 4", checked: true }),
  ).toBeDisabled();
  expect(screen.queryByText("Une erreur est survenue")).toBeNull();
  // When
  await user.press(screen.getByRole("radio", { name: "2 × 2" }));
  // Then
  expect(
    screen.getByRole("radio", { name: "4 × 4", checked: true }),
  ).toBeOnTheScreen();
});

it.each([
  { authority: "unavailable", accountStatus: 503, canRetry: true },
  { authority: "withdrawn", accountStatus: 200, canRetry: false },
])(
  "keeps a refused division selector explicit when its authority is $authority",
  async ({ accountStatus, canRetry }) => {
    // Given
    stored.setting = classification;
    const user = userEvent.setup();
    await renderEditor();
    await user.press(await screen.findByRole("button", { name: "Format" }));
    await user.press(await screen.findByRole("radio", { name: "4 × 4" }));
    await screen.findByRole("button", { name: "Format" });
    await user.press(screen.getByRole("button", { name: "Division" }));
    await screen.findByRole("radio", { name: "National 2" });
    mockFetch.mockImplementation((url, options) =>
      String(url).includes("/divisions?")
        ? Promise.resolve(json({ title: "Forbidden", status: 403 }, 403))
        : respond(url, options),
    );
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
    await screen.findByRole("alert", { name: "Une erreur est survenue" });
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled();

    // When
    permissions = {};
    mockFetch.mockImplementation((url, options) =>
      String(url).endsWith("/accounts/me") && accountStatus !== 200
        ? Promise.resolve(
            json(
              { title: "Unavailable", status: accountStatus },
              accountStatus,
            ),
          )
        : respond(url, options),
    );
    await act(async () =>
      client.refetchQueries({
        predicate: ({ queryKey }) => queryKey.includes("/accounts/me"),
      }),
    );

    // Then
    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "Format",
          includeHiddenElements: true,
        }),
      ).toBeDisabled(),
    );
    expect(
      screen.getByRole("alert", { name: "Une erreur est survenue" }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("radio", { name: "National 2" }),
    ).not.toBeOnTheScreen();
    expect(screen.queryAllByRole("button", { name: "Réessayer" })).toHaveLength(
      canRetry ? 1 : 0,
    );

    // When
    await user.press(screen.getByRole("button", { name: "Fermer" }));

    // Then
    expect(
      await screen.findByRole("button", { name: "Format" }),
    ).toHaveAccessibilityValue({ text: "4 × 4" });
    expect(
      screen.getByText("Modifications non enregistrées"),
    ).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.every(([, options]) => options?.method === "GET"),
    ).toBe(true);
  },
);

it.each([200, 403, 503])(
  "removes refresh from an accepted empty division selector after account response %s blocks its authority",
  async (accountStatus) => {
    // Given
    stored.setting = classification;
    mockFetch.mockImplementation((url, options) =>
      String(url).includes("/divisions?")
        ? Promise.resolve(json({ items: [] }))
        : respond(url, options),
    );
    const user = userEvent.setup();
    await renderEditor();
    await user.press(await screen.findByRole("button", { name: "Format" }));
    await user.press(await screen.findByRole("radio", { name: "4 × 4" }));
    await screen.findByRole("button", { name: "Format" });
    await user.press(screen.getByRole("button", { name: "Division" }));
    await screen.findByRole("header", { name: "Aucune division active" });
    expect(screen.getByLabelText("Actualiser les données")).toBeOnTheScreen();

    // When
    permissions = {};
    mockFetch.mockImplementation((url, options) =>
      String(url).endsWith("/accounts/me") && accountStatus !== 200
        ? Promise.resolve(
            json(
              { title: "Unavailable", status: accountStatus },
              accountStatus,
            ),
          )
        : String(url).includes("/divisions?")
          ? Promise.resolve(json({ items: [] }))
          : respond(url, options),
    );
    await act(async () =>
      client.refetchQueries({
        predicate: ({ queryKey }) => queryKey.includes("/accounts/me"),
      }),
    );

    // Then
    expect(
      await screen.findByRole("alert", { name: "Une erreur est survenue" }),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText("Actualiser les données")).toBeNull();
    expect(
      screen.queryByRole("header", { name: "Aucune division active" }),
    ).toBeNull();
    expect(screen.queryAllByRole("button", { name: "Réessayer" })).toHaveLength(
      accountStatus === 200 ? 0 : 1,
    );

    // When
    await user.press(screen.getByRole("button", { name: "Fermer" }));

    // Then
    expect(
      await screen.findByRole("button", { name: "Format" }),
    ).toHaveAccessibilityValue({ text: "4 × 4" });
    expect(screen.getByRole("button", { name: "Format" })).toBeDisabled();
    expect(
      screen.getByText("Modifications non enregistrées"),
    ).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.every(([, options]) => options?.method === "GET"),
    ).toBe(true);
  },
);

it("retains an empty division selector and reports an ordinary refresh failure through a toast", async () => {
  // Given
  stored.setting = classification;
  mockFetch.mockImplementation((url, options) =>
    String(url).includes("/divisions?")
      ? Promise.resolve(json({ items: [] }))
      : respond(url, options),
  );
  const user = userEvent.setup();
  await renderEditor();
  await user.press(await screen.findByRole("button", { name: "Format" }));
  await user.press(await screen.findByRole("radio", { name: "4 × 4" }));
  await screen.findByRole("button", { name: "Format" });
  await user.press(screen.getByRole("button", { name: "Division" }));
  await screen.findByRole("header", { name: "Aucune division active" });
  mockFetch.mockImplementation((url, options) =>
    String(url).includes("/divisions?")
      ? Promise.resolve(json({ title: "Unavailable", status: 503 }, 503))
      : respond(url, options),
  );

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("header", { name: "Aucune division active" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));

  // Then
  expect(
    await screen.findByRole("button", { name: "Format" }),
  ).toHaveAccessibilityValue({ text: "4 × 4" });
  expect(screen.getByText("Modifications non enregistrées")).toBeOnTheScreen();
});

it("keeps an open format selector unavailable through a refused then failed classification reread", async () => {
  // Given
  stored.setting = classification;
  const user = userEvent.setup();
  await renderEditor();
  await user.press(await screen.findByRole("button", { name: "Format" }));
  await user.press(await screen.findByRole("radio", { name: "4 × 4" }));
  await screen.findByRole("button", { name: "Format" });
  await user.press(screen.getByRole("button", { name: "Format" }));
  await screen.findByRole("radio", { name: "4 × 4", checked: true });
  let status = 403;
  mockFetch.mockImplementation((url, options) =>
    String(url).includes("/classification")
      ? Promise.resolve(json({ title: "Read unavailable", status }, status))
      : respond(url, options),
  );
  const [classificationPath] = getGetPoolClassificationQueryKey(id);

  // When
  await act(async () =>
    client.refetchQueries({
      predicate: ({ queryKey }) => queryKey.includes(classificationPath),
    }),
  );

  // Then
  expect(screen.queryByText("Une erreur est survenue")).toBeNull();
  await waitFor(() =>
    expect(screen.getByRole("radio", { name: "2 × 2" })).toBeDisabled(),
  );

  // When
  status = 503;
  await act(async () =>
    client.refetchQueries({
      predicate: ({ queryKey }) => queryKey.includes(classificationPath),
    }),
  );
  await user.press(await screen.findByRole("radio", { name: "2 × 2" }));

  // Then
  await waitFor(() =>
    expect(screen.getByRole("radio", { name: "2 × 2" })).toBeDisabled(),
  );
  expect(
    screen.getByRole("radio", { name: "4 × 4", checked: true }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Une erreur est survenue")).toBeNull();
});

it("retains the draft when the server refuses a held save after its current read was refused", async () => {
  // Given
  jest.spyOn(Alert, "alert");
  stored.setting = classification;
  const user = userEvent.setup();
  await renderEditor();
  await user.press(await screen.findByRole("button", { name: "Format" }));
  await user.press(await screen.findByRole("radio", { name: "4 × 4" }));
  await screen.findByRole("button", { name: "Format" });
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  mockFetch.mockImplementation((url, options) =>
    String(url).includes("/classification")
      ? Promise.resolve(json({ title: "Forbidden", status: 403 }, 403))
      : respond(url, options),
  );
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByRole("alert", {
    name: "Une erreur est survenue. Veuillez réessayer plus tard.",
  });

  // When
  await act(async () => nativeAlertAction("Enregistrer")());

  // Then
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
  expect(
    screen.getByRole("button", { name: "Format" }),
  ).toHaveAccessibilityValue({ text: "4 × 4" });
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
});
