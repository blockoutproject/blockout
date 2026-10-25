import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Alert, Pressable, Text } from "react-native";
import { Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ComponentType } from "react";
import RootLayout from "../../../app/_layout";
import OperationsLayout from "../../../app/(operations)/_layout";
import ClassificationRoute from "../../../app/(operations)/administration/classification/[kind]/[id]";
import DivisionsRoute from "../../../app/(operations)/administration/divisions/index";
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
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));
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
  mockFetch.mockReset().mockImplementation(async (url) =>
    json(
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
                {
                  ...division,
                  id: inactiveId,
                  name: "Inactive",
                  active: false,
                },
              ],
            }
          : stored,
    ),
  );
});
afterEach(() => {
  client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});
/** Uses real session, access, Query and theme owners; only device credentials and HTTP are controlled. */
async function renderEditor(kind: "pack" | "pool" | "divisions" = "pool") {
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            {kind === "divisions" ? (
              <DivisionsScreen />
            ) : (
              <ClassificationScreen target={{ kind, id }} />
            )}
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
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
  await screen.findByRole("radio", { name: "Hériter du pack" });
  // When
  await user.press(
    screen.getByRole("radio", { name: "Classification propre" }),
  );
  await user.press(screen.getByRole("radio", { name: "National 2" }));
  await user.press(screen.getByRole("radio", { name: "4x4" }));
  await user.press(screen.getByRole("radio", { name: "Mixte" }));
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
});
it("retains dirty choices and displays conflicting scopes without applying a subset", async () => {
  // Given
  jest.spyOn(Alert, "alert");
  const initialFetch = mockFetch.getMockImplementation()!;
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
  await screen.findByRole("radio", { name: "Classification propre" });
  // When
  await user.press(
    screen.getByRole("radio", { name: "Classification propre" }),
  );
  await user.press(screen.getByRole("radio", { name: "National 2" }));
  await user.press(screen.getByRole("radio", { name: "2x2" }));
  await user.press(screen.getByRole("radio", { name: "Masculin" }));
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await confirm();
  // Then
  expect(await screen.findByText(new RegExp(inactiveId))).toBeOnTheScreen();
  expect(
    screen.getByRole("radio", { name: "2x2", checked: true }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
});
it("requires a successful current-state read after an uncertain write and preserves the draft", async () => {
  // Given
  stored.setting = classification;
  jest.spyOn(Alert, "alert");
  const initialFetch = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT"
      ? Promise.reject(new TypeError("Lost response"))
      : initialFetch(url, options),
  );
  const user = await renderEditor();
  await screen.findByRole("radio", { name: "4x4" });
  // When
  await user.press(screen.getByRole("radio", { name: "4x4" }));
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await confirm();
  await screen.findByRole("button", { name: "Relire la classification" });
  stored = { ...stored, revision: "r2" };
  await user.press(
    screen.getByRole("button", { name: "Relire la classification" }),
  );
  // Then
  expect(
    screen.getByRole("radio", { name: "4x4", checked: true }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
});
it("uses an independent explicit activity command with the division revision", async () => {
  // Given
  jest.spyOn(Alert, "alert");
  const user = await renderEditor("divisions");
  // When
  await user.press(
    await screen.findByRole("button", { name: "Désactiver National 2" }),
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
  jest.spyOn(Alert, "alert");
  const user = await renderEditor();
  await screen.findByRole("radio", { name: "Classification propre" });

  // When
  await user.press(
    screen.getByRole("radio", { name: "Classification propre" }),
  );
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
  const initialFetch = mockFetch.getMockImplementation()!;
  let failedRead = false;
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT" ||
    (failedRead && String(url).includes("/classification"))
      ? Promise.reject(new TypeError("Unavailable"))
      : initialFetch(url, options),
  );
  const user = await renderEditor();
  await screen.findByRole("radio", { name: "4x4" });

  // When
  await user.press(screen.getByRole("radio", { name: "4x4" }));
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await confirm();
  await screen.findByRole("button", { name: "Relire la classification" });
  failedRead = true;
  await user.press(
    screen.getByRole("button", { name: "Relire la classification" }),
  );

  // Then
  await screen.findByText(
    "La relecture a échoué. Votre brouillon est conservé.",
  );
  expect(
    screen.getByRole("radio", { name: "4x4", checked: true }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
});

it("reconciles uncertain deactivation before offering explicit reactivation", async () => {
  // Given
  jest.spyOn(Alert, "alert");
  const initialFetch = mockFetch.getMockImplementation()!;
  let deactivationSent = false;
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PUT") {
      deactivationSent = true;
      return Promise.reject(new TypeError("Lost response"));
    }
    return deactivationSent && String(url).includes("/divisions?")
      ? Promise.resolve(
          json({ items: [{ ...division, revision: "d2", active: false }] }),
        )
      : initialFetch(url, options);
  });
  const user = await renderEditor("divisions");

  // When
  await user.press(
    await screen.findByRole("button", { name: "Désactiver National 2" }),
  );
  await confirm();
  await user.press(
    await screen.findByRole("button", { name: "Relire National 2" }),
  );

  // Then
  expect(
    await screen.findByRole("button", { name: "Réactiver National 2" }),
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
      "(operations)/administration/index": () => (
        <AdministrationScreen admitted />
      ),
      "(operations)/administration/classification/[kind]/[id]":
        ClassificationRoute,
      "(operations)/administration/divisions/index": DivisionsRoute,
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
  const initialFetch = mockFetch.getMockImplementation()!;
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
  await user.press(await screen.findByRole("radio", { name: "4x4" }));
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
    expect(screen.queryByRole("radio", { name: "4x4" })).not.toBeOnTheScreen(),
  );
  mockFetch.mockImplementation(initialFetch);
  await user.press(
    await screen.findByRole("button", { name: "Relire les permissions" }),
  );
  await user.press(await screen.findByText("Modifier la classification"));

  // Then
  expect(
    await screen.findByRole("radio", { name: "4x4", checked: true }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Relire la classification" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
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
