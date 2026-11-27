import { useLayoutEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { nativeAlertAction } from "@/shared/native/test-support/native-alert";
import {
  cleanup,
  act,
  screen,
  waitFor,
  userEvent,
  fireEvent,
} from "@testing-library/react-native";
import { Link, Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Alert, Text, Pressable } from "react-native";
import type { ComponentType } from "react";
import { AccessGateScreen } from "../screens/access-gate-screen";
import NotFoundRoute from "@/app/+not-found";
import OperationsLayout from "@/app/(operations)/_layout";
import AdministrationRoute from "@/app/(operations)/administration";
import MaintenanceRoute from "@/app/(operations)/administration/maintenance";
import RootLayout from "@/app/_layout";
import RecoveryLayout from "@/app/(recovery)/_layout";
import OnboardingRoute from "@/app/onboarding";
import { completeDiscovery } from "@/features/onboarding/discovery-state";
import ApplicationVersionsRoute from "@/app/(operations)/administration/application-versions";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
import { useCurrentAccount } from "@/features/accounts/current-account";
import { applicationAccessResponse } from "@/shared/api/test-support/application-access";

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

/** Mounts real public/operational root guards; unrelated ordinary business destinations remain route probes. */
async function openRoute(path: string) {
  return renderRouter(
    {
      _layout: () => <RootLayout />,
      onboarding: OnboardingRoute,
      "(ordinary)/_layout": () => <Stack />,
      "(recovery)/_layout": RecoveryLayout,
      "(operations)/_layout": () => (
        <>
          <OperationsLayout />
          <PermissionRefresh />
        </>
      ),
      access: AccessGateScreen,
      "+not-found": NotFoundRoute,
      "(ordinary)/index": () => <Text>Ordinary home</Text>,
      "(ordinary)/profile": () => (
        <Link href="/administration/application-versions">
          Versions minimales
        </Link>
      ),
      "(recovery)/support": () => <Text>Support route</Text>,
      "(ordinary)/legal": () => <Text>Legal route</Text>,

      "(operations)/collection": () => null,
      "(operations)/administration/classification/[kind]/[id]": () => null,
      "(operations)/administration/mapping/index": () => null,
      "(operations)/administration/mapping/[packId]": () => null,
      "(operations)/administration/mapping/filters": () => null,
      "(operations)/administration/divisions/index": () => null,
      "(operations)/administration/divisions/[id]": () => null,
      "(operations)/administration/divisions/new": () => null,
      "(operations)/administration/presentation/[kind]/[id]": () => null,
      "(operations)/administration/index": AdministrationRoute,
      "(operations)/administration/application-versions":
        ApplicationVersionsRoute,
      "(operations)/administration/maintenance": MaintenanceRoute,
    },
    { initialUrl: path },
  );
}

/** Refreshes the real account while the editor is mounted and keeps fixture mutations free of detached GC timers. */
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
      <Text>Relire les permissions</Text>
    </Pressable>
  );
}

/** Canonical HTTP demonstrations; no real identity or store availability is established. */
function accessResponses(
  permissions: Record<string, boolean>,
  outdated = false,
  maintenanceActive = true,
) {
  const access = applicationAccessResponse();
  access.maintenance = {
    active: maintenanceActive,
    message: "Maintenance demo",
    imageUrl: null,
  };
  access.versions.ios = {
    minimumVersion: outdated ? "2.10.0" : "2.0.0",
    storeUrl: "https://apps.apple.com/fr/app/blockout/id123456789",
  };
  access.versions.android = {
    ...access.versions.ios,
    storeUrl:
      "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout",
  };
  const serve = async (url: RequestInfo | URL) => {
    if (String(url).endsWith("/application-access")) {
      return Response.json(access);
    }
    if (String(url).endsWith("/accounts/me")) {
      return Response.json({
        accountId: "00000000-0000-4000-8000-000000000185",
        username: "Operator_185",
        email: "operator@example.invalid",
        hasPhoto: false,
        permissions,
      });
    }
    if (String(url).endsWith("/administration/maintenance")) {
      return Response.json(access.maintenance);
    }
    return Response.json(access.versions);
  };
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
it.each([
  {
    title: "Maintenance",
    field: "Message de maintenance",
    endpoint: "maintenance",
    initialUrl: "/access",
    returnPath: "/administration",
  },
  {
    title: "Versions minimales",
    field: "Message commun",
    endpoint: "application-versions",
    initialUrl: "/profile",
    returnPath: "/profile",
  },
  {
    title: "Versions minimales",
    field: "Message commun",
    endpoint: "application-versions",
    initialUrl: "/administration/application-versions",
    returnPath: "/administration",
  },
])(
  "returns from an acknowledged $title save opened at $initialUrl with the shared success notice",
  async ({ title, field, endpoint, initialUrl, returnPath }) => {
    // Given
    const restricted = initialUrl === "/access";
    const serve = accessResponses(
      endpoint === "maintenance"
        ? { manageMaintenance: true }
        : { manageApplicationVersions: true },
      false,
      restricted,
    );
    const save = Promise.withResolvers<Response>();
    const reread = Promise.withResolvers<Response>();
    let submitted = false;
    mockFetch.mockImplementation((url, options) => {
      if (options?.method === "PATCH") {
        submitted = true;
        return save.promise;
      }
      if (submitted && String(url).endsWith(`/administration/${endpoint}`)) {
        return reread.promise;
      }
      return serve(url);
    });
    await openRoute(initialUrl);
    const user = userEvent.setup();
    if (restricted) {
      await user.press(
        await screen.findByRole("link", { name: "Accès administrateur" }),
      );
    }
    if (initialUrl !== `/administration/${endpoint}`) {
      await user.press(await screen.findByRole("link", { name: title }));
    }
    const message = await screen.findByLabelText(field);
    await user.clear(message);
    await user.type(message, "Enregistré");

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await screen.findByRole("button", { name: "Enregistrer", busy: true });
    expect(
      screen.queryByText("Modifications enregistrées."),
    ).not.toBeOnTheScreen();
    const response = await serve(
      `https://api.example.invalid/administration/${endpoint}`,
    );
    await act(async () => save.resolve(response));

    // Then
    expect(
      await screen.findByText("Modifications enregistrées."),
    ).toBeOnTheScreen();
    expect(await screen.findByRole("link", { name: title })).toBeOnTheScreen();
    expect(screen.queryByLabelText(field)).not.toBeOnTheScreen();
    expect(screen).toHavePathname(returnPath);
    expect(Alert.alert).not.toHaveBeenCalled();
    const writes = mockFetch.mock.calls.filter(
      ([, options]) => options?.method === "PATCH",
    );
    expect(writes).toEqual([
      [
        expect.stringMatching(new RegExp(`/administration/${endpoint}$`)),
        expect.objectContaining({
          body: JSON.stringify({ message: "Enregistré" }),
        }),
      ],
    ]);
  },
);

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
it.each(["acknowledgement", "lost response"] as const)(
  "keeps a fresh protected-route draft usable after an abandoned save's late %s",
  async (result) => {
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
    await act(async () => {
      if (result === "acknowledgement") {
        save.resolve(
          await serve(
            "https://api.example.invalid/administration/application-versions",
          ),
        );
      } else {
        save.reject(new TypeError("Lost response"));
      }
    });

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
    expect(
      screen.queryByText("Modifications enregistrées."),
    ).not.toBeOnTheScreen();
  },
);
