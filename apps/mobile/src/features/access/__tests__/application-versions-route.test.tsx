import { act, screen, waitFor, userEvent } from "@testing-library/react-native";
import { Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Alert, Text } from "react-native";
import type { ComponentType } from "react";
import { AccessGateScreen } from "../screens/access-gate-screen";
import NotFoundRoute from "../../../app/+not-found";
import OperationsLayout from "../../../app/(operations)/_layout";
import AdministrationRoute from "../../../app/(operations)/administration";
import RootLayout from "../../../app/_layout";
import ApplicationVersionsRoute from "../../../app/(operations)/administration/application-versions";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
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

beforeEach(() => {
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
afterEach(() => {
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Mounts the production root around route probes; Expo owns deep-link fallback and history. */
async function openRoute(path: string) {
  return renderRouter(
    {
      _layout: () => <RootLayout />,
      "(ordinary)/_layout": () => <Stack />,
      "(operations)/_layout": OperationsLayout,
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

/** Canonical HTTP demonstrations; no real identity or store availability is established. */
function responses(permissions: Record<string, boolean>, outdated = false) {
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
  mockFetch.mockImplementation(serve);
  return serve;
}
it("admits the current versions manager during maintenance without personal bypass or maintenance rights", async () => {
  // Given
  responses({ manageApplicationVersions: true });

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
  responses({ manageMaintenance: true, bypassMaintenance: true });

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
  responses({ manageApplicationVersions: true, bypassMaintenance: true }, true);

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
  responses({ manageApplicationVersions: true });
  await openRoute("/access");
  const user = userEvent.setup();
  await user.press(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  );
  await user.press(await screen.findByText("Versions minimales"));
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
    ),
  );

  // When
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.lastCall?.[2]?.find((a) => a.text === "Continuer la saisie")
      ?.onPress?.(),
  );

  // Then
  expect(screen.getByLabelText("Message commun")).toHaveDisplayValue(
    "Mon brouillon",
  );

  // When
  await user.press(screen.getByRole("button", { name: "Retour" }));
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.lastCall?.[2]?.find((a) => a.text === "Abandonner")
      ?.onPress?.(),
  );

  // Then
  expect(await screen.findByText("Versions minimales")).toBeOnTheScreen();
  expect(mockFetch.mock.calls.some(([, o]) => o?.method === "PATCH")).toBe(
    false,
  );
});

it("retains the same-session draft when a pending permission refresh removes the operational route", async () => {
  // Given
  const serve = responses({ manageApplicationVersions: true });
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  const user = userEvent.setup();
  const pending = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url) =>
    String(url).endsWith("/accounts/me") ? pending.promise : serve(url),
  );
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await user.press(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  );
  await user.press(await screen.findByText("Versions minimales"));
  await user.type(
    await screen.findByLabelText("Message commun"),
    "Mon brouillon",
  );

  // When
  await act(async () =>
    pending.resolve(
      Response.json(
        {
          type: "urn:blockout:problem:unavailable",
          title: "Unavailable",
          status: 503,
        },
        {
          status: 503,
          headers: { "Content-Type": "application/problem+json" },
        },
      ),
    ),
  );

  // Then
  await screen.findByRole("header", { name: "Blockout est en maintenance" });
  expect(screen.queryByLabelText("Message commun")).not.toBeOnTheScreen();

  // When
  mockFetch.mockImplementation(serve);
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await user.press(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  );
  await user.press(await screen.findByText("Versions minimales"));

  // Then
  expect(await screen.findByLabelText("Message commun")).toHaveDisplayValue(
    "Mon brouillon",
  );
  expect(screen.getByText("Modifications non enregistrées")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Appliquer les modifications" }),
  ).toBeEnabled();
  expect(mockFetch.mock.calls.some(([, o]) => o?.method === "PATCH")).toBe(
    false,
  );
});
