import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Stack, router, usePathname } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ComponentType } from "react";
import { Alert, Text } from "react-native";
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
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const environment = { ...process.env };
const seasonId = "00000000-0000-4000-8000-000000000179";
const season = {
  id: seasonId,
  label: "2026/2027",
  startYear: 2026,
  revision: 5,
  state: "active",
};
const sourceId = "00000000-0000-4000-8000-000000000180";
const candidateUrl =
  "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=137";
const source = {
  id: sourceId,
  seasonId,
  provider: "lnv",
  organizerReference: "137",
  label: "D1 masculine",
  revision: 2,
  candidateUrl,
  acceptedUrl: null,
  locked: false,
  validation: "qualified",
  validatedAt: null,
  seasonEvidence: "2026/2027",
  reason: null,
  launched: false,
};

// These route scenarios start after common discovery has been explicitly completed.
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
beforeEach(async () => {
  await AsyncStorage.setItem("blockout:v2-discovery-complete", "true");
});

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
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
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
  const serve = async (url: RequestInfo | URL) => {
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
    if (path.endsWith(`/source-bindings/${sourceId}`))
      return Response.json(source);
    if (path.endsWith(`/collection-seasons/${seasonId}`))
      return Response.json(season);
    if (path.endsWith("/collection-seasons"))
      return Response.json({ items: [season] });
    throw new Error(`Unexpected controlled request ${path}`);
  };
  mockFetch.mockImplementation(serve);
  return serve;
}

it.each(["candidate", "addition"])(
  "retains the same-session %s draft and required reread when a permission failure interrupts recovery",
  async (kind) => {
    // Given
    const serve = responses({ manageCollection: true });
    const user = userEvent.setup();
    await openRoute("/access");
    await screen.findByRole("link", { name: "Accès administrateur" });
    const pending = Promise.withResolvers<Response>();
    mockFetch.mockImplementation((url, options) =>
      options?.method === "PUT" || options?.method === "POST"
        ? Promise.resolve(
            Response.json(
              {
                type: "urn:blockout:problem:stale-revision",
                title: "Conflict",
                status: 409,
              },
              { status: 409 },
            ),
          )
        : String(url).endsWith("/accounts/me")
          ? pending.promise
          : serve(url),
    );
    await user.press(screen.getByRole("button", { name: "Réessayer" }));
    const path =
      kind === "candidate"
        ? `/collection/${seasonId}/sources/${sourceId}`
        : `/collection/${seasonId}/lnv`;
    await act(async () => router.push(path));
    if (kind === "candidate") {
      await user.press(
        await screen.findByRole("button", { name: "Modifier le lien" }),
      );
      await user.clear(screen.getByLabelText("URL officielle"));
    } else {
      await user.press(
        await screen.findByRole("button", { name: "Ajouter une source" }),
      );
      await user.type(
        screen.getByLabelText("Référence de l’organisateur ou du championnat"),
        "137",
      );
    }
    const draft = `${candidateUrl}&PID=192`;
    await user.type(screen.getByLabelText("URL officielle"), draft);
    const save =
      kind === "candidate" ? "Enregistrer le lien" : "Enregistrer la source";
    await user.press(screen.getByRole("button", { name: save }));
    await screen.findByText(
      "Le résultat doit être vérifié avant une nouvelle action.",
    );
    const pendingRead = Promise.withResolvers<Response>();
    const resource =
      kind === "candidate"
        ? `/source-bindings/${sourceId}`
        : "/source-bindings";
    mockFetch.mockImplementation((url) =>
      String(url).endsWith("/accounts/me")
        ? pending.promise
        : String(url).endsWith(resource)
          ? pendingRead.promise
          : serve(url),
    );
    await user.press(screen.getByRole("button", { name: "Relire l’état" }));
    await screen.findByRole("button", { name: "Relire l’état", busy: true });

    // When
    await act(async () =>
      pending.resolve(
        Response.json(
          {
            type: "urn:blockout:problem:unavailable",
            title: "Unavailable",
            status: 503,
          },
          { status: 503 },
        ),
      ),
    );
    await screen.findByRole("header", { name: "Blockout est en maintenance" });
    await act(async () =>
      pendingRead.resolve(
        Response.json(kind === "candidate" ? source : { items: [] }),
      ),
    );
    mockFetch.mockImplementation(serve);
    await user.press(screen.getByRole("button", { name: "Réessayer" }));
    await screen.findByRole("link", { name: "Accès administrateur" });
    await act(async () => router.push(path));

    // Then
    expect(await screen.findByLabelText("URL officielle")).toHaveDisplayValue(
      draft,
    );
    expect(screen.getByRole("button", { name: save })).toBeDisabled();
  },
);

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

it("keeps a resumed candidate locked while its original save remains pending", async () => {
  // Given
  const serve = responses({ manageCollection: true });
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  const permissions = Promise.withResolvers<Response>();
  const save = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT"
      ? save.promise
      : String(url).endsWith("/accounts/me")
        ? permissions.promise
        : serve(url),
  );
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  const path = `/collection/${seasonId}/sources/${sourceId}`;
  await act(async () => router.push(path));
  await user.press(
    await screen.findByRole("button", { name: "Modifier le lien" }),
  );
  await user.clear(screen.getByLabelText("URL officielle"));
  const draft = `${candidateUrl}&PID=192`;
  await user.type(screen.getByLabelText("URL officielle"), draft);
  await user.press(screen.getByRole("button", { name: "Enregistrer le lien" }));
  await screen.findByRole("button", {
    name: "Enregistrer le lien",
    busy: true,
  });
  await act(async () =>
    permissions.resolve(
      Response.json(
        {
          type: "urn:blockout:problem:unavailable",
          title: "Unavailable",
          status: 503,
        },
        { status: 503 },
      ),
    ),
  );
  await screen.findByRole("header", { name: "Blockout est en maintenance" });
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT" ? save.promise : serve(url),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () => router.push(path));

  // Then
  expect(await screen.findByLabelText("URL officielle")).toHaveDisplayValue(
    draft,
  );
  expect(
    screen.getByRole("button", { name: "Enregistrer le lien", busy: true }),
  ).toBeDisabled();

  // When
  await act(async () =>
    save.resolve(
      Response.json({
        ...source,
        revision: 3,
        candidateUrl: draft,
        validation: "unvalidated",
        seasonEvidence: null,
      }),
    ),
  );

  // Then
  expect(
    await screen.findByText(
      "Lien enregistré. La source doit être validée à nouveau.",
    ),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
});

it("retains the exact failed launch selection when admission removes and later restores its provider route", async () => {
  // Given
  const serve = responses({ manageCollection: true });
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  const permissions = Promise.withResolvers<Response>();
  let expanded = false;
  let writes = 0;
  const peer = async (url: RequestInfo | URL, options?: RequestInit) => {
    const path = new URL(String(url)).pathname;
    if (options?.method === "POST") {
      writes++;
      return writes === 1
        ? Response.json(
            {
              type: "urn:blockout:problem:stale-revision",
              title: "Conflict",
              status: 409,
            },
            { status: 409 },
          )
        : Response.json({ ...season, revision: 7 });
    }
    if (path.endsWith("/source-bindings"))
      return Response.json({
        items: expanded
          ? [
              source,
              {
                ...source,
                id: "00000000-0000-4000-8000-000000000183",
                label: "D2 masculine",
              },
            ]
          : [source],
      });
    if (expanded && path.endsWith(`/collection-seasons/${seasonId}`))
      return Response.json({ ...season, revision: 6 });
    return serve(url);
  };
  mockFetch.mockImplementation((url, options) =>
    String(url).endsWith("/accounts/me")
      ? permissions.promise
      : peer(url, options),
  );
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  const path = `/collection/${seasonId}/lnv`;
  await act(async () => router.push(path));
  await user.press(
    await screen.findByRole("button", { name: "Lancer les sources prêtes" }),
  );
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.lastCall?.[2]?.find((choice) => choice.text === "Lancer")
      ?.onPress?.(),
  );
  await screen.findByText(
    "Le résultat doit être vérifié avant une nouvelle action.",
  );

  // When
  await act(async () =>
    permissions.resolve(
      Response.json(
        {
          type: "urn:blockout:problem:unavailable",
          title: "Unavailable",
          status: 503,
        },
        { status: 503 },
      ),
    ),
  );
  await screen.findByRole("header", { name: "Blockout est en maintenance" });
  expanded = true;
  mockFetch.mockImplementation(peer);
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await screen.findByRole("link", { name: "Accès administrateur" });
  await act(async () => router.push(path));
  await user.press(
    await screen.findByRole("button", { name: "Relire l’état" }),
  );
  await screen.findByText(
    "État relu. Vérifiez votre saisie avant une nouvelle action.",
  );
  await user.press(
    screen.getByRole("button", { name: "Lancer les sources prêtes" }),
  );
  await act(async () =>
    jest
      .mocked(Alert.alert)
      .mock.lastCall?.[2]?.find((choice) => choice.text === "Lancer")
      ?.onPress?.(),
  );

  // Then
  await screen.findByText("Sources sélectionnées lancées.");
  const calls = mockFetch.mock.calls.filter(
    ([, options]) => options?.method === "POST",
  );
  expect(calls).toHaveLength(2);
  expect(JSON.parse(String(calls[1][1]?.body))).toEqual({
    revision: 6,
    sourceBindingIds: [sourceId],
  });
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

it("does not send a prepared command when a newer minimum blocks the client during credential retrieval", async () => {
  // Given
  const serve = responses({ manageCollection: true });
  const user = userEvent.setup();
  await openRoute("/access");
  await screen.findByRole("link", { name: "Accès administrateur" });
  const check = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) =>
    String(url).endsWith("/application-access")
      ? check.promise
      : options?.method === "PUT"
        ? Promise.resolve(Response.json(source))
        : serve(url),
  );
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await act(async () =>
    router.push(`/collection/${seasonId}/sources/${sourceId}`),
  );
  await user.press(
    await screen.findByRole("button", { name: "Modifier le lien" }),
  );
  await user.clear(screen.getByLabelText("URL officielle"));
  await user.type(
    screen.getByLabelText("URL officielle"),
    `${candidateUrl}&PID=192`,
  );
  const credentials =
    Promise.withResolvers<ReturnType<typeof credentialsFor>>();
  mockAuth0.getCredentials.mockImplementationOnce(() => credentials.promise);
  await user.press(screen.getByRole("button", { name: "Enregistrer le lien" }));
  await screen.findByRole("button", {
    name: "Enregistrer le lien",
    busy: true,
  });
  const access = applicationAccessResponse();
  access.maintenance = {
    revision: 2,
    active: true,
    message: "Maintenance demo",
    imageUrl: null,
  };
  access.versions.revision = 1;
  access.versions.ios = {
    minimumVersion: "3.0.0",
    storeUrl: "https://apps.apple.com/fr/app/blockout/id123456789",
  };
  access.versions.android = {
    minimumVersion: "3.0.0",
    storeUrl:
      "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout",
  };

  // When
  await act(async () => check.resolve(Response.json(access)));
  await screen.findByRole("header", { name: "Blockout est en maintenance" });
  await act(async () =>
    credentials.resolve(credentialsFor("auth0|operator179")),
  );

  // Then
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PUT"),
  ).toBe(false);
  expect(screen.queryByLabelText("URL officielle")).not.toBeOnTheScreen();
});
