import { act, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Stack, router, usePathname } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ComponentType } from "react";
import { Text } from "react-native";
import RootLayout from "../../../app/_layout";
import OperationsLayout from "../../../app/(operations)/_layout";
import AdministrationRoute from "../../../app/(operations)/administration";
import CollectionLayout from "../../../app/(operations)/collection/_layout";
import CollectionRoute from "../../../app/(operations)/collection";
import SeasonRoute from "../../../app/(operations)/collection/[seasonId]";
import ProviderRoute from "../../../app/(operations)/collection/[seasonId]/[provider]";
import SourceRoute from "../../../app/(operations)/collection/[seasonId]/sources/[sourceId]";
import NotFoundRoute from "../../../app/+not-found";
import { AccessGateScreen } from "../../access/screens/access-gate-screen";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";

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
  fetch: (url: RequestInfo | URL) => mockFetch(url),
}));
const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL]>();
const environment = { ...process.env };
const seasonId = "00000000-0000-4000-8000-000000000179";
const season = {
  id: seasonId,
  label: "2026/2027",
  startYear: 2026,
  revision: 5,
  state: "active",
};

beforeEach(() => {
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
});
afterEach(() => {
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** The public router hook exposes navigation location without inspecting navigation internals. */
function RouteLocation() {
  return <Text accessibilityLabel="Route courante">{usePathname()}</Text>;
}

/** Real production root, operational groups and preparation routes; Expo owns protection and history. */
async function openRoute(path: string) {
  return renderRouter(
    {
      _layout: () => (
        <>
          <RootLayout />
          <RouteLocation />
        </>
      ),
      "(ordinary)/_layout": () => <Stack />,
      "(ordinary)/index": () => <Text>Ordinary home</Text>,
      "(operations)/_layout": OperationsLayout,
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
      "(operations)/collection/[seasonId]/[provider]": ProviderRoute,
      "(operations)/collection/[seasonId]/sources/[sourceId]/index":
        SourceRoute,
      access: AccessGateScreen,
      "+not-found": NotFoundRoute,
    },
    { initialUrl: path },
  );
}

/** Synthetic HTTP peer qualifies admission/navigation only, without a real Auth0 or backend permission operation. */
function responses(
  permissions: Record<string, boolean | undefined>,
  outdated = false,
) {
  const access = applicationAccessResponse();
  access.maintenance = {
    revision: 2,
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
  mockFetch.mockImplementation(async (url) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("/application-access")) return Response.json(access);
    if (path.endsWith("/accounts/me"))
      return Response.json({
        accountId: "00000000-0000-4000-8000-000000000181",
        username: "Operator_179",
        email: "operator@example.invalid",
        principalCreatedAt: null,
        hasPhoto: false,
        permissions,
      });
    if (path.endsWith("/source-bindings")) return Response.json({ items: [] });
    if (path.endsWith(`/collection-seasons/${seasonId}`))
      return Response.json(season);
    if (path.endsWith("/collection-seasons"))
      return Response.json({ items: [season] });
    throw new Error(`Unexpected controlled request ${path}`);
  });
}

it("opens preparation from the administration entry during maintenance with collection permission alone", async () => {
  // Given
  responses({ manageCollection: true });
  const user = userEvent.setup();
  await openRoute("/access");
  await user.press(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  );

  // When
  await user.press(await screen.findByRole("link", { name: "Collectes" }));

  // Then
  expect(
    await screen.findByRole("button", { name: "2026/2027, Active" }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Route courante")).toHaveTextContent(
    "/collection",
  );
  expect(screen.queryByText("Ordinary home")).not.toBeOnTheScreen();
});

it("navigates through canonical season/provider preparation without a dashboard", async () => {
  // Given
  responses({ manageCollection: true });
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () => router.push("/collection"));

  // When
  await user.press(
    await screen.findByRole("button", { name: "2026/2027, Active" }),
  );
  await user.press(
    await screen.findByRole("button", {
      name: "LNV, Les trois championnats professionnels",
    }),
  );

  // Then
  expect(
    await screen.findByText("Aucun championnat découvert"),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Route courante")).toHaveTextContent(
    `/collection/${seasonId}/lnv`,
  );
});

it.each([{ manageMaintenance: true }, { bypassMaintenance: true }])(
  "refuses a collection deep link with unrelated rights %j",
  async (permissions) => {
    // Given
    responses(permissions);
    await openRoute("/access");
    await screen.findByRole("link", { name: "Accès administrateur" });

    // When
    await act(async () => router.push(`/collection/${seasonId}/lnv`));

    // Then
    await waitFor(() =>
      expect(screen.getByLabelText("Route courante")).not.toHaveTextContent(
        `/collection/${seasonId}/lnv`,
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
  responses({ manageCollection: true }, true);
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
