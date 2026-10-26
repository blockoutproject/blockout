import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { QueryClientProvider } from "@tanstack/react-query";
import { getListClubTeamsQueryKey } from "../../../../.generated/mobile";
import { act, screen, userEvent, waitFor } from "@testing-library/react-native";
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
import {
  useCurrentAccount,
  useAccountSession,
} from "../../accounts/current-account";
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
let client = createQueryClient();
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
  client = createQueryClient();
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
afterEach(() => {
  client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});
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
        <QueryClientProvider client={client}>
          <ThemeProvider>
            <ApplicationAccessProvider>
              <AccountSessionProvider>
                <ActionFeedbackScope>{children}</ActionFeedbackScope>
              </AccountSessionProvider>
            </ApplicationAccessProvider>
          </ThemeProvider>
        </QueryClientProvider>
      ),
    },
  );
  return userEvent.setup();
}
/** Chooses through the real native-stack selection route and returns to the original form. */
async function choose(
  user: ReturnType<typeof userEvent.setup>,
  field: string,
  label: string,
) {
  await user.press(await screen.findByRole("button", { name: field }));
  await user.press(await screen.findByRole("radio", { name: label }));
  await screen.findByRole("button", { name: field });
}
/** Accepts the native confirmation only when a test explicitly chooses its final action. */
async function confirm() {
  const action = jest
    .mocked(Alert.alert)
    .mock.calls.at(-1)?.[2]
    ?.find((button) => button.text === "Confirmer");
  await act(async () => {
    action?.onPress?.();
  });
}
it("submits a complete pool override after confirmation and excludes inactive choices", async () => {
  // Given
  jest.spyOn(Alert, "alert");
  const user = await renderEditor();
  await screen.findByRole("radio", { name: "Du pack" });
  // When
  await user.press(screen.getByRole("radio", { name: "Personnalisé" }));
  await choose(user, "Division", "National 2");
  await choose(user, "Format", "4 × 4");
  await choose(user, "Genre", "Mixte");
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  // Then
  expect(screen.queryByRole("radio", { name: "Inactive" })).toBeNull();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(0);
  await confirm();
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

it("removes the complete pack default with explicit null", async () => {
  // Given
  stored.setting = classification;
  jest.spyOn(Alert, "alert");
  const user = await renderEditor("pack");
  await screen.findByRole("radio", { name: "Sans classification" });
  // When
  await user.press(screen.getByRole("radio", { name: "Sans classification" }));
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await confirm();
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
  const user = await renderEditor();
  await screen.findByRole("radio", { name: "Personnalisé" });
  // When
  await user.press(screen.getByRole("radio", { name: "Personnalisé" }));
  await choose(user, "Division", "National 2");
  await choose(user, "Format", "2 × 2");
  await choose(user, "Genre", "Masculin");
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await confirm();
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
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled(),
  );
});
it("requires a successful current-state read after an uncertain write and preserves the draft", async () => {
  // Given
  stored.setting = classification;
  jest.spyOn(Alert, "alert");
  const initialFetch = respond;
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT"
      ? Promise.reject(new TypeError("Lost response"))
      : initialFetch(url, options),
  );
  const user = await renderEditor();
  await screen.findByRole("button", { name: "Format" });
  // When
  await choose(user, "Format", "4 × 4");
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await confirm();
  await screen.findByRole("button", { name: "Relire la classification" });
  stored = { ...stored, revision: "r2" };
  await user.press(
    await screen.findByRole("button", { name: "Relire la classification" }),
  );
  // Then
  expect(
    screen.getByRole("button", { name: "Format" }),
  ).toHaveAccessibilityValue({ text: "4 × 4" });
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
});
it("uses an independent explicit activity command with the division revision", async () => {
  // Given
  jest.spyOn(Alert, "alert");
  const user = await renderEditor("division");
  // When
  await user.press(
    await screen.findByRole("button", { name: "Désactiver la division" }),
  );
  await confirm();
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
  expect(
    await screen.findByText("Cette action nécessite une permission dédiée."),
  ).toBeOnTheScreen();
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
  const user = await renderEditor();
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

it("keeps a failed recovery read blocking and never retries the uncertain write", async () => {
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
  const user = await renderEditor();
  await screen.findByRole("button", { name: "Format" });

  // When
  await choose(user, "Format", "4 × 4");
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await confirm();
  await screen.findByRole("button", { name: "Relire la classification" });
  failedRead = true;
  await user.press(
    await screen.findByRole("button", { name: "Relire la classification" }),
  );

  // Then
  await screen.findByText(
    "La relecture a échoué. Votre brouillon est conservé.",
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

it("reconciles uncertain deactivation before offering explicit reactivation", async () => {
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
  const user = await renderEditor("division");

  // When
  await user.press(
    await screen.findByRole("button", { name: "Désactiver la division" }),
  );
  await confirm();
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

/** Exposes only an explicit account refresh through the real current-account Query owner. */
function PermissionRefresh() {
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
/** Real root and operational protection exercise admission changes; unrelated destinations remain probes. */
async function openRoutes() {
  return renderRouter(
    {
      _layout: () => <RootLayout />,
      access: PermissionRefresh,
      onboarding: OnboardingRoute,
      "(ordinary)/_layout": () => (
        <Stack screenOptions={{ headerShown: false }} />
      ),
      "(ordinary)/index": () => (
        <>
          <ClassificationEntry target={{ kind: "pool", id }} />
          <PermissionRefresh />
        </>
      ),
      "(operations)/_layout": OperationsLayout,
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

it("retains a classification draft and uncertainty through actual protected-route removal", async () => {
  // Given
  permissions = { manageSportingClassification: true };
  stored.setting = classification;
  const user = userEvent.setup();
  await openRoutes();
  const permissionRead = Promise.withResolvers<Response>();
  const initialFetch = respond;
  mockFetch.mockImplementation((url, options) =>
    String(url).endsWith("/accounts/me")
      ? permissionRead.promise
      : options?.method === "PUT"
        ? Promise.reject(new TypeError("Lost response"))
        : initialFetch(url, options),
  );
  await user.press(
    await screen.findByRole("button", { name: "Relire les permissions" }),
  );
  await user.press(screen.getByText("Modifier la classification"));
  await choose(user, "Format", "4 × 4");
  jest.spyOn(Alert, "alert");
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await confirm();
  await screen.findByRole("button", { name: "Relire la classification" });

  // When
  await act(async () =>
    permissionRead.resolve(
      json(
        {
          type: "urn:blockout:problem:unavailable",
          title: "Unavailable",
          status: 503,
        },
        503,
      ),
    ),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Format" }),
    ).not.toBeOnTheScreen(),
  );
  mockFetch.mockImplementation(initialFetch);
  await user.press(
    await screen.findByRole("button", { name: "Relire les permissions" }),
  );
  await user.press(await screen.findByText("Modifier la classification"));

  // Then
  expect(
    await screen.findByRole("button", { name: "Format" }),
  ).toHaveAccessibilityValue({ text: "4 × 4" });
  expect(
    await screen.findByRole("button", { name: "Relire la classification" }),
  ).toBeOnTheScreen();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled(),
  );
  await act(async () => router.back());
  expect(Alert.alert).toHaveBeenLastCalledWith(
    "Abandonner les modifications ?",
    "Votre brouillon n’a pas été enregistré.",
    expect.any(Array),
    expect.any(Object),
  );
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
    client.setQueryData(clubKey, { seasonId: inactiveId, items: [] });
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
    const user = await renderEditor(
      operation === "activity" ? "division" : "pool",
    );

    // When
    if (operation === "activity")
      await user.press(
        await screen.findByRole("button", { name: "Désactiver la division" }),
      );
    else
      await user.press(
        await screen.findByRole("button", { name: "Enregistrer" }),
      );
    await confirm();

    // Then
    if (operation === "activity")
      await screen.findByText(
        "Division désactivée. L’historique est conservé.",
      );
    await waitFor(() =>
      expect(client.getQueryState(clubKey)?.isInvalidated).toBe(true),
    );
    expect(client.getQueryState(["/application-access"])?.isInvalidated).toBe(
      false,
    );
  },
);

it("distinguishes a stale revision and uses the reread revision only on explicit resubmission", async () => {
  // Given
  stored.setting = classification;
  jest.spyOn(Alert, "alert");
  let refuse = true;
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT"
      ? Promise.resolve(
          refuse
            ? json(
                {
                  type: "urn:blockout:problem:stale-revision",
                  title: "Conflict",
                  status: 409,
                },
                409,
              )
            : json({
                ...stored,
                revision: "r3",
                setting: { ...classification, format: "4x4" },
              }),
        )
      : respond(url, options),
  );
  const user = await renderEditor();
  await choose(user, "Format", "4 × 4");

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await confirm();
  await screen.findByText(/La classification a changé depuis votre lecture/);
  stored = { ...stored, revision: "r2" };
  await user.press(
    await screen.findByRole("button", { name: "Relire la classification" }),
  );
  refuse = false;
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await confirm();

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

it("reauthorizes a held native confirmation after the current classification grant is revoked", async () => {
  // Given
  jest.spyOn(Alert, "alert");
  const user = await renderEditor();
  await user.press(await screen.findByRole("button", { name: "Enregistrer" }));

  // When
  permissions = { manageDivisionLifecycle: true };
  await act(async () =>
    client.refetchQueries({
      predicate: ({ queryKey }) =>
        queryKey.some((part) => part === "/accounts/me"),
    }),
  );
  await confirm();

  // Then
  expect(
    await screen.findByText("Cette action nécessite une permission dédiée."),
  ).toBeOnTheScreen();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled(),
  );
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PUT"),
  ).toBe(false);
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
  await user.press(screen.getByRole("tab", { name: "Inactives" }));
  expect(await screen.findByText("National 2")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Désactiver la division" }),
  ).not.toBeOnTheScreen();
});

it("filters division names within the selected activity catalogue without exposing lifecycle commands on cards", async () => {
  // Given
  const user = await renderEditor("divisions");
  await screen.findByRole("button", { name: "National 2" });

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
  const user = await renderEditor("divisions");
  await screen.findByRole("button", { name: "National 2" });
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
    await screen.findByRole("button", { name: "Inactive" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "National 2" }),
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
  const permissionRead = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) =>
    String(url).endsWith("/accounts/me")
      ? permissionRead.promise
      : respond(url, options),
  );
  await user.press(
    await screen.findByRole("button", { name: "Relire les permissions" }),
  );
  await user.press(screen.getByText("Modifier la classification"));
  jest.spyOn(Alert, "alert");
  await user.press(await screen.findByRole("button", { name: "Enregistrer" }));
  const confirmation = jest
    .mocked(Alert.alert)
    .mock.lastCall?.[2]?.find((action) => action.text === "Confirmer")?.onPress;
  if (!confirmation)
    throw new Error("Missing native classification confirmation");

  // When
  await act(async () =>
    permissionRead.resolve(
      json(
        {
          type: "urn:blockout:problem:unavailable",
          title: "Unavailable",
          status: 503,
        },
        503,
      ),
    ),
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

/** Uses the real F05 generation so a previous session cannot retain action feedback in this fixture. */
function ActionFeedbackScope({ children }: PropsWithChildren) {
  const { generation } = useAccountSession();
  return (
    <ActionFeedbackProvider scopeKey={generation}>
      {children}
    </ActionFeedbackProvider>
  );
}
