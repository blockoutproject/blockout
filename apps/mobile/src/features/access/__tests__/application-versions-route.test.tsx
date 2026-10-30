import { nativeAlertAction } from "../../../shared/native/test-support/native-alert";
import {
  cleanup,
  act,
  screen,
  waitFor,
  userEvent,
  fireEvent,
} from "@testing-library/react-native";
import { Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Alert, Text, Pressable } from "react-native";
import type { ComponentType } from "react";
import { AccessGateScreen } from "../screens/access-gate-screen";
import NotFoundRoute from "../../../app/+not-found";
import OperationsLayout from "../../../app/(operations)/_layout";
import AdministrationRoute from "../../../app/(operations)/administration";
import RootLayout from "../../../app/_layout";
import OnboardingRoute from "../../../app/onboarding";
import { completeDiscovery } from "../../onboarding/discovery-state";
import ApplicationVersionsRoute from "../../../app/(operations)/administration/application-versions";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { useCurrentAccount } from "../../accounts/current-account";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";

// Native manifest projection of the documented expo-router plugin option in app.config.ts.
jest.mock("expo-constants", () => {
  const actual = jest.requireActual("expo-constants");
  return {
    ...actual,
    __esModule: true,
    default: {
      ...actual.default,
      expoConfig: {
        ...actual.default.expoConfig,
        extra: {
          ...actual.default.expoConfig?.extra,
          router: { sitemap: false },
        },
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
  default: jest.requireActual("../../pro/test-support/native-purchases")
    .mockPurchases,
}));
jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
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
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|operator180"));
  mockAuth0.webAuth.mockReset();
  mockFetch.mockReset();
});
afterEach(async () => {
  await cleanup();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Mounts the production root around route probes; Expo owns deep-link fallback and history. */
async function openRoute(path: string) {
  return renderRouter(
    {
      _layout: () => <RootLayout />,
      onboarding: OnboardingRoute,
      "(ordinary)/_layout": () => <Stack />,
      "(operations)/_layout": () => (
        <>
          <OperationsLayout />
          <PermissionRefresh />
        </>
      ),
      access: AccessGateScreen,
      "+not-found": NotFoundRoute,
      "(ordinary)/index": () => <Text>Ordinary home</Text>,
      "(ordinary)/support": () => <Text>Support route</Text>,
      "(ordinary)/legal": () => <Text>Legal route</Text>,

      "(operations)/administration/index": AdministrationRoute,
      "(operations)/administration/application-versions":
        ApplicationVersionsRoute,
      "(operations)/administration/maintenance": () => (
        <Text>Maintenance editor</Text>
      ),
    },
    { initialUrl: path },
  );
}

/** Allows a current account read while the real protected editor is mounted. */
function PermissionRefresh() {
  const account = useCurrentAccount();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Relire les permissions"
      onPress={() => void account.refetch()}
    >
      <Text>Relire les permissions</Text>
    </Pressable>
  );
}

/** Canonical HTTP demonstrations; no real identity or store availability is established. */
function accessResponses(
  permissions: Record<string, boolean>,
  outdated = false,
) {
  const access = applicationAccessResponse();
  access.maintenance = {
    revision: 2,
    active: true,
    message: "Maintenance demo",
    imageUrl: null,
  };
  access.versions.revision = 3;
  access.versions.ios = {
    minimumVersion: outdated ? "2.10.0" : "2.0.0",
    storeUrl: "https://apps.apple.com/fr/app/blockout/id123456789",
  };
  access.versions.android = {
    ...access.versions.ios,
    storeUrl:
      "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout",
  };
  const serve = async (url: RequestInfo | URL) =>
    Response.json(
      String(url).endsWith("/application-access")
        ? access
        : String(url).endsWith("/accounts/me")
          ? {
              accountId: "00000000-0000-4000-8000-000000000185",
              username: "Operator_185",
              email: "operator@example.invalid",
              principalCreatedAt: null,
              hasPhoto: false,
              permissions,
            }
          : access.versions,
    );
  return serve;
}

it("admits the current versions manager during maintenance without personal bypass or maintenance rights", async () => {
  // Given
  mockFetch.mockImplementation(
    accessResponses({ manageApplicationVersions: true }),
  );

  // When
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () => router.push("/administration/application-versions"));

  // Then
  expect(await screen.findByLabelText("Message commun")).toBeOnTheScreen();
  expect(screen.queryByText("Ordinary home")).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) =>
      String(url).endsWith("/administration/maintenance"),
    ),
  ).toBe(false);
});
it("refuses version editing when only maintenance management and personal bypass are granted", async () => {
  // Given
  mockFetch.mockImplementation(
    accessResponses({ manageMaintenance: true, bypassMaintenance: true }),
  );

  // When
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () => router.push("/administration/application-versions"));

  // Then
  await screen.findByText("Administration technique");
  expect(screen.queryByLabelText("Message commun")).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) =>
      String(url).endsWith("/administration/application-versions"),
    ),
  ).toBe(false);
});
it("refuses an outdated versions manager without a minimum-version exception", async () => {
  // Given
  mockFetch.mockImplementation(
    accessResponses(
      { manageApplicationVersions: true, bypassMaintenance: true },
      true,
    ),
  );

  // When
  await openRoute("/administration/application-versions");

  // Then
  await screen.findByText("Blockout est en maintenance");
  expect(screen.queryByLabelText("Message commun")).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) =>
      String(url).endsWith("/administration/application-versions"),
    ),
  ).toBe(false);
});
it("preserves a dirty draft when departure is cancelled, and leaves only after explicit discard", async () => {
  // Given
  mockFetch.mockImplementation(
    accessResponses({ manageApplicationVersions: true }),
  );
  await openRoute("/access");
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  );
  await user.press(
    await screen.findByRole("link", { name: "Versions minimales" }),
  );
  const message = await screen.findByLabelText("Message commun");
  await user.type(message, "Mon brouillon");

  // When
  await user.press(screen.getByRole("button", { name: "Retour" }));

  // Then
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      "Abandonner les modifications ?",
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({
        cancelable: true,
        onDismiss: expect.any(Function),
      }),
    ),
  );

  // When
  await act(async () => nativeAlertAction("Continuer la saisie")());

  // Then
  expect(screen.getByLabelText("Message commun")).toHaveDisplayValue(
    "Mon brouillon",
  );

  // When
  await user.press(screen.getByRole("button", { name: "Retour" }));
  await act(async () => nativeAlertAction("Abandonner")());

  // Then
  expect(
    await screen.findByRole("link", { name: "Versions minimales" }),
  ).toBeOnTheScreen();
  expect(mockFetch.mock.calls.some(([, o]) => o?.method === "PATCH")).toBe(
    false,
  );
});

it("drops a protected-route draft and ignores its obsolete discard confirmation", async () => {
  // Given
  const permissions = { manageApplicationVersions: true };
  const serve = accessResponses(permissions);
  mockFetch.mockImplementation(serve);
  await openRoute("/access");
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  );
  await user.press(
    await screen.findByRole("link", { name: "Versions minimales" }),
  );
  await user.type(
    await screen.findByLabelText("Message commun"),
    "Mon brouillon",
  );
  await user.press(screen.getByRole("button", { name: "Retour" }));
  const discard = nativeAlertAction("Abandonner");

  // When
  permissions.manageApplicationVersions = false;
  await user.press(
    screen.getByRole("button", { name: "Relire les permissions" }),
  );
  await screen.findByRole("header", { name: "Blockout est en maintenance" });
  permissions.manageApplicationVersions = true;
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await user.press(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  );
  await user.press(
    await screen.findByRole("link", { name: "Versions minimales" }),
  );
  await screen.findByLabelText("Message commun");
  await act(async () => discard());

  // Then
  expect(screen.getByLabelText("Message commun")).toHaveDisplayValue("");
  expect(
    screen.queryByText("Modifications non enregistrées"),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PATCH"),
  ).toBe(false);
});
it("keeps a fresh protected-route draft usable when an abandoned save fails later", async () => {
  // Given
  const permissions = { manageApplicationVersions: true };
  const serve = accessResponses(permissions);
  const save = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PATCH" ? save.promise : serve(url),
  );
  await openRoute("/access");
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  );
  await user.press(
    await screen.findByRole("link", { name: "Versions minimales" }),
  );
  await user.type(
    await screen.findByLabelText("Message commun"),
    "First draft",
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Appliquer")());
  await screen.findByRole("button", { name: "Enregistrer", busy: true });

  // When
  permissions.manageApplicationVersions = false;
  await user.press(
    screen.getByRole("button", { name: "Relire les permissions" }),
  );
  await screen.findByRole("header", { name: "Blockout est en maintenance" });
  permissions.manageApplicationVersions = true;
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await user.press(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  );
  await user.press(
    await screen.findByRole("link", { name: "Versions minimales" }),
  );
  const message = await screen.findByLabelText("Message commun");
  expect(message).toHaveDisplayValue("");
  await user.type(message, "Fresh draft");
  await act(async () => save.reject(new TypeError("Lost response")));

  // Then
  expect(screen.getByLabelText("Message commun")).toHaveDisplayValue(
    "Fresh draft",
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
  );
  expect(
    screen.queryByRole("button", { name: "Relire les réglages" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
  ).toHaveLength(1);
});
it("invalidates a native confirmation when its protected route is removed", async () => {
  // Given
  const permissions = { manageApplicationVersions: true };
  mockFetch.mockImplementation(accessResponses(permissions));
  await openRoute("/access");
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  );
  await user.press(
    await screen.findByRole("link", { name: "Versions minimales" }),
  );
  await user.type(
    await screen.findByLabelText("Message commun"),
    "Unconfirmed draft",
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  const confirm = nativeAlertAction("Appliquer");

  // When
  permissions.manageApplicationVersions = false;
  await user.press(
    screen.getByRole("button", { name: "Relire les permissions" }),
  );
  await screen.findByRole("header", { name: "Blockout est en maintenance" });
  await act(async () => confirm());

  // Then
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PATCH"),
  ).toBe(false);
});
