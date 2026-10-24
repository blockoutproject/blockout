import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { Alert, Pressable, Text } from "react-native";
import { Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ComponentType } from "react";
import RootLayout from "../../../app/_layout";
import OperationsLayout from "../../../app/(operations)/_layout";
import PresentationRoute from "../../../app/(operations)/administration/presentation/[kind]/[id]";
import { PresentationEntry } from "../entry";
import { useCurrentAccount } from "../../accounts/current-account";
import { AccessGateScreen } from "../../access/screens/access-gate-screen";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { applicationAccessResponse as mockAccess } from "../../../shared/api/test-support/application-access";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { PresentationScreen } from "../screens/presentation-screen";
import type { PresentationTarget } from "../api/presentation";

jest.mock(
  "react-native-safe-area-context",
  () =>
    jest.requireActual("react-native-safe-area-context/src/jest/mock").default,
);
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
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
jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    String(url).endsWith("/application-access")
      ? Promise.resolve(
          Response.json({
            ...mockAccess(),
            maintenance: {
              ...mockAccess().maintenance,
              active: mockMaintenance,
            },
          }),
        )
      : mockFetch(url, options),
}));
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: () => mockContext },
  SaveFormat: { PNG: "png" },
}));
jest.mock("expo-file-system", () => ({ File: jest.fn(() => mockFile) }));

const mockContext = {
  resize: jest.fn(),
  renderAsync: jest.fn(),
  release: jest.fn(),
};
const mockImage = { saveAsync: jest.fn(), release: jest.fn() };
const mockFile = new Blob([new Uint8Array([137, 80, 78, 71])], {
  type: "image/png",
});
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const resourceId = "00000000-0000-4000-8000-000000000196";
const account = {
  accountId: "00000000-0000-4000-8000-000000000001",
  username: "Operator",
  email: "operator@example.invalid",
  principalCreatedAt: null,
  hasPhoto: false,
  permissions: { manageSportingPresentation: true },
};
const names = {
  sourceName: "Source name",
  effectiveName: "Current name",
  manualName: "Current name",
  effectiveShortName: "Short",
  manualShortName: null,
};
const logo = { effectiveUrl: null, manualUrl: null, automaticUrl: null };
const initial = { id: resourceId, kind: "team", revision: "r1", names, logo };
let client = createQueryClient();
let stored: unknown = initial;
let permissions: unknown = account.permissions;
let mockMaintenance = false;
const environment = { ...process.env };

beforeEach(() => {
  client = createQueryClient();
  stored = initial;
  permissions = account.permissions;
  mockMaintenance = false;
  Object.assign(process.env, {
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|operator"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockContext.renderAsync.mockReset().mockResolvedValue(mockImage);
  mockImage.saveAsync
    .mockReset()
    .mockResolvedValue({ uri: "file:///prepared.png", width: 120, height: 60 });
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockReset()
    .mockResolvedValue({ canceled: true, assets: null });
  mockFetch
    .mockReset()
    .mockImplementation(async (url) =>
      json(
        String(url).endsWith("/accounts/me")
          ? { ...account, permissions }
          : stored,
      ),
    );
});
afterEach(() => {
  client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Real form, Query, identity and access owners; only native credentials/images and HTTP are controlled. */
async function renderEditor(kind: PresentationTarget["kind"] = "team") {
  await render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ApplicationAccessProvider>
          <AccountSessionProvider>
            <PresentationScreen target={{ kind, id: resourceId }} />
            <SessionAction />
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}
/** Exercises the existing F05 lifecycle rather than replacing session state. */
function SessionAction() {
  const session = useAccountSession();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quitter la session"
      onPress={() => void session.clearCredentials()}
    >
      <Text>Quitter</Text>
    </Pressable>
  );
}
/** Safe synthetic replies enter the actual generated transport validation. */
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type":
        status >= 400 ? "application/problem+json" : "application/json",
    },
  });
}
/** User typing stays visible at each scenario; only the repetitive native input gesture is named. */
async function edit(label: string, value: string) {
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText(label));
  if (value) await user.type(screen.getByLabelText(label), value);
}

it("saves independent names and a nonsquare logo in one generated multipart PATCH", async () => {
  // Given
  const user = await renderEditor();
  await screen.findByDisplayValue("Current name");
  await edit("Nom complet personnalisé", "Chosen");
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      { uri: "file:///selected.png", width: 120, height: 60, type: "image" },
    ],
  });
  await user.press(screen.getByRole("button", { name: "Choisir un logo" }));
  await screen.findByRole("button", { name: "Aperçu : Logo" });
  mockFetch.mockResolvedValue(
    json({
      ...initial,
      revision: "r2",
      names: { ...names, manualName: "Chosen", effectiveName: "Chosen" },
    }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await screen.findByText("Présentation enregistrée.");
  const writes = mockFetch.mock.calls.filter(
    ([, options]) => options?.method === "PATCH",
  );
  expect(writes).toHaveLength(1);
  const body = writes[0][1]?.body;
  expect(body).toBeInstanceOf(FormData);
  const parts = Array.from((body as FormData).entries());
  expect(parts.map(([key]) => key)).toEqual(["metadata", "image"]);
  expect(JSON.parse(await (parts[0][1] as Blob).text())).toEqual({
    revision: "r1",
    manualName: "Chosen",
    manualShortName: null,
    logoAction: "replace",
  });
  expect(await (parts[1][1] as Blob).arrayBuffer()).toEqual(
    await mockFile.arrayBuffer(),
  );
});

it("restores automatic artwork and clears only the selected name customization atomically", async () => {
  // Given
  stored = {
    ...initial,
    logo: {
      ...logo,
      manualUrl: `/teams/${resourceId}/logo`,
      effectiveUrl: `/teams/${resourceId}/logo`,
    },
  };
  const user = await renderEditor();
  await screen.findByDisplayValue("Current name");
  await edit("Nom complet personnalisé", "");
  await user.press(
    screen.getByRole("button", { name: "Rétablir le logo automatique" }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await waitFor(() =>
    expect(mockFetch.mock.calls.some(([, o]) => o?.method === "PATCH")).toBe(
      true,
    ),
  );
  const body = mockFetch.mock.calls.find(([, o]) => o?.method === "PATCH")?.[1]
    ?.body as FormData;
  expect(Array.from(body.keys())).toEqual(["metadata"]);
  expect(JSON.parse(await (body.get("metadata") as Blob).text())).toEqual({
    revision: "r1",
    manualName: null,
    manualShortName: null,
    logoAction: "automatic",
  });
});

it("edits pool names with complete JSON and no logo or contacts", async () => {
  // Given
  stored = { id: resourceId, revision: "r1", names };
  const user = await renderEditor("pool");
  await screen.findByDisplayValue("Current name");
  await edit("Nom court personnalisé", "Custom short");

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await screen.findByText("Présentation enregistrée.");
  const write = mockFetch.mock.calls.find(([, o]) => o?.method === "PUT");
  expect(JSON.parse(String(write?.[1]?.body))).toEqual({
    revision: "r1",
    manualName: "Current name",
    manualShortName: "Custom short",
  });
  expect(screen.queryByText("Photo ou logo")).not.toBeOnTheScreen();
  expect(screen.queryByLabelText("Adresse e-mail")).not.toBeOnTheScreen();
});

it("saves club presentation without a short-name field", async () => {
  // Given
  stored = { ...initial, kind: "club" };
  const user = await renderEditor("club");
  await screen.findByDisplayValue("Current name");
  await edit("Nom personnalisé", "Club chosen");

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await screen.findByText("Présentation enregistrée.");
  const body = mockFetch.mock.calls.find(([, o]) => o?.method === "PATCH")?.[1]
    ?.body as FormData;
  expect(JSON.parse(await (body.get("metadata") as Blob).text())).toEqual({
    revision: "r1",
    manualName: "Club chosen",
    logoAction: "keep",
  });
  expect(
    screen.queryByLabelText("Nom court personnalisé"),
  ).not.toBeOnTheScreen();
});

it("validates and saves division colors, gradient and name without touching activity", async () => {
  // Given
  stored = {
    id: resourceId,
    revision: "r1",
    name: "Division",
    color: "#123456",
    gradient: null,
    logo,
    active: false,
  };
  const user = await renderEditor("division");
  await screen.findByDisplayValue("Division");
  await edit("Couleur", "invalid");

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await screen.findByText("Utilisez une couleur au format #RRGGBB.");
  expect(mockFetch.mock.calls.some(([, o]) => o?.method === "PATCH")).toBe(
    false,
  );

  // When
  await edit("Couleur", "#abcdef");
  await edit("Dégradé 1", "#111111");
  await edit("Dégradé 2", "#222222");
  await edit("Dégradé 3", "#333333");
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await screen.findByText("Présentation enregistrée.");
  const body = mockFetch.mock.calls.find(([, o]) => o?.method === "PATCH")?.[1]
    ?.body as FormData;
  expect(JSON.parse(await (body.get("metadata") as Blob).text())).toEqual({
    revision: "r1",
    name: "Division",
    color: "#abcdef",
    gradient: ["#111111", "#222222", "#333333"],
    logoAction: "keep",
  });
});

it.each(["conflict", "network", "schema"])(
  "preserves dirty fields after %s and requires a successful read before explicit retry",
  async (outcome) => {
    // Given
    const user = await renderEditor();
    await screen.findByDisplayValue("Current name");
    await edit("Nom complet personnalisé", "My draft");
    mockFetch.mockImplementation(async (_url, options) => {
      if (options?.method === "PATCH") {
        if (outcome === "network") throw new TypeError("Lost response");
        if (outcome === "schema") return json({ revision: "r2" });
        return json(
          {
            type: "urn:blockout:problem:stale-revision",
            title: "Conflict",
            status: 409,
          },
          409,
        );
      }
      return json({
        ...initial,
        revision: "r2",
        names: {
          ...names,
          manualName: "Other editor",
          manualShortName: "New short",
        },
      });
    });

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));

    // Then
    await screen.findByRole("button", { name: "Relire la présentation" });
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
    expect(
      screen.getByLabelText("Nom complet personnalisé"),
    ).toHaveDisplayValue("My draft");

    // When
    await user.press(
      screen.getByRole("button", { name: "Relire la présentation" }),
    );

    // Then
    await screen.findByText(
      "Présentation relue. Vérifiez votre brouillon avant de l’enregistrer à nouveau.",
    );
    expect(
      screen.getByLabelText("Nom complet personnalisé"),
    ).toHaveDisplayValue("My draft");
    expect(screen.getByLabelText("Nom court personnalisé")).toHaveDisplayValue(
      "New short",
    );
    expect(
      mockFetch.mock.calls.filter(([, o]) => o?.method === "PATCH"),
    ).toHaveLength(1);

    // When
    mockFetch.mockResolvedValue(json({ ...initial, revision: "r3" }));
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));

    // Then
    await screen.findByText("Présentation enregistrée.");
    const writes = mockFetch.mock.calls.filter(
      ([, o]) => o?.method === "PATCH",
    );
    expect(
      JSON.parse(
        await ((writes[1][1]?.body as FormData).get("metadata") as Blob).text(),
      ),
    ).toEqual({
      revision: "r2",
      manualName: "My draft",
      manualShortName: "New short",
      logoAction: "keep",
    });
  },
);

it("keeps a dirty draft and the editing revision during background refetch", async () => {
  // Given
  const user = await renderEditor();
  await screen.findByDisplayValue("Current name");
  await edit("Nom complet personnalisé", "My draft");
  stored = {
    ...initial,
    revision: "r2",
    names: { ...names, manualName: "Concurrent" },
  };

  // When
  await act(async () =>
    client.refetchQueries({
      predicate: ({ queryKey }) =>
        JSON.stringify(queryKey).includes("/presentation"),
    }),
  );

  // Then
  expect(screen.getByLabelText("Nom complet personnalisé")).toHaveDisplayValue(
    "My draft",
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled(),
  );

  // When
  mockFetch.mockRejectedValue(new TypeError("Unavailable"));
  await user.press(
    screen.getByRole("button", { name: "Relire la présentation" }),
  );

  // Then
  await screen.findByText(
    "La relecture a échoué. Votre brouillon est conservé.",
  );
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
});

it("retains input and shows the invalid-image field refusal", async () => {
  // Given
  const user = await renderEditor();
  await screen.findByDisplayValue("Current name");
  await edit("Nom complet personnalisé", "My draft");
  mockFetch.mockResolvedValue(
    json(
      {
        type: "urn:blockout:problem:invalid-image",
        title: "Invalid image",
        status: 422,
      },
      422,
    ),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await screen.findByText(
    "Ce logo ne peut pas être enregistré. Choisissez une autre image.",
  );
  expect(screen.getByLabelText("Nom complet personnalisé")).toHaveDisplayValue(
    "My draft",
  );
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
});

it.each([
  { manageSportingClassification: true },
  { manageDivisionLifecycle: true },
  { moderateStreamLinks: true },
])("does not admit another action's permission %j", async (other) => {
  // Given
  permissions = other;

  // When
  await renderEditor();

  // Then
  await screen.findByText("Cette action nécessite une permission dédiée.");
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).includes("/presentation")),
  ).toBe(false);
});

it("retains a read-only draft when the current action grant is withdrawn", async () => {
  // Given
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  await edit("Nom complet personnalisé", "My draft");
  permissions = { manageCollection: true };

  // When
  await act(async () =>
    client.refetchQueries({
      predicate: ({ queryKey }) =>
        JSON.stringify(queryKey).includes("/accounts/me"),
    }),
  );

  // Then
  await screen.findByText("Cette action nécessite une permission dédiée.");
  expect(screen.getByLabelText("Nom complet personnalisé")).toHaveDisplayValue(
    "My draft",
  );
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
});

it("ignores a held native selection after the session is invalidated", async () => {
  // Given
  const user = await renderEditor();
  await screen.findByDisplayValue("Current name");
  let finish!: (value: ImagePicker.ImagePickerResult) => void;
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  await user.press(screen.getByRole("button", { name: "Choisir un logo" }));

  // When
  await user.press(screen.getByRole("button", { name: "Quitter la session" }));
  await act(async () =>
    finish({
      canceled: false,
      assets: [
        { uri: "file:///old.png", width: 120, height: 60, type: "image" },
      ],
    }),
  );

  // Then
  await waitFor(() =>
    expect(
      screen.queryByLabelText("Nom complet personnalisé"),
    ).not.toBeOnTheScreen(),
  );
  expect(mockFetch.mock.calls.some(([, o]) => o?.method === "PATCH")).toBe(
    false,
  );
});

/** Mounts the real root/protected route; other destinations are explicit unrelated route probes. */
async function openRoutes(initialUrl = "/") {
  return renderRouter(
    {
      _layout: () => <RootLayout />,
      access: AccessProbe,
      "(ordinary)/_layout": () => (
        <Stack screenOptions={{ headerShown: false }} />
      ),
      "(ordinary)/index": () => (
        <>
          <PresentationEntry target={{ kind: "team", id: resourceId }} />
          <PermissionRefresh />
        </>
      ),
      "(operations)/_layout": OperationsLayout,
      "(operations)/administration/index": () => (
        <Text>Administration route</Text>
      ),
      "(operations)/administration/maintenance": () => (
        <Text>Maintenance route</Text>
      ),
      "(operations)/administration/application-versions": () => (
        <Text>Versions route</Text>
      ),
      "(operations)/collection": () => <Text>Collection route</Text>,
      "(operations)/administration/presentation/[kind]/[id]": PresentationRoute,
    },
    { initialUrl },
  );
}
/** Exposes completion of the real account read so routing assertions cannot pass before grants resolve. */
function AccessProbe() {
  const account = useCurrentAccount();
  return (
    <>
      <AccessGateScreen />
      <Text>
        {account.isSuccess &&
        account.data.permissions.manageSportingPresentation
          ? "Presentation authority available"
          : "Authority pending"}
      </Text>
    </>
  );
}

it("does not advertise an unusable technical administration entry to a presentation-only account during maintenance", async () => {
  // Given
  mockMaintenance = true;

  // When
  await openRoutes("/access");

  // Then
  await screen.findByRole("header", { name: "Blockout est en maintenance" });
  await screen.findByText("Presentation authority available");
  expect(
    screen.queryByRole("link", { name: "Accès administrateur" }),
  ).not.toBeOnTheScreen();
});

it("keeps a presentation-only original-target editor admitted during maintenance", async () => {
  // Given
  mockMaintenance = true;

  // When
  await openRoutes("/access");
  await screen.findByText("Presentation authority available");
  await act(async () =>
    router.push(`/administration/presentation/team/${resourceId}`),
  );

  // Then
  await screen.findByDisplayValue("Current name");
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
});
/** Starts an ordinary current-account refresh through its real owner. */
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

it("enters the real protected route with only the presentation grant and confirms dirty departure", async () => {
  // Given
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const user = userEvent.setup();
  await openRoutes();

  // When
  await user.press(await screen.findByText("Modifier la présentation"));

  // Then
  await screen.findByDisplayValue("Current name");
  expect(screen).toHavePathname(
    `/administration/presentation/team/${resourceId}`,
  );

  // When
  await edit("Nom complet personnalisé", "Unsaved");
  await act(async () => router.back());

  // Then
  expect(Alert.alert).toHaveBeenCalledWith(
    "Abandonner les modifications ?",
    expect.any(String),
    expect.any(Array),
  );
  expect(screen.getByLabelText("Nom complet personnalisé")).toHaveDisplayValue(
    "Unsaved",
  );

  // When
  const actions = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2];
  await act(async () =>
    actions?.find((action) => action.text === "Abandonner")?.onPress?.(),
  );

  // Then
  await screen.findByText("Modifier la présentation");
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PATCH"),
  ).toBe(false);
});

it("retains the draft and uncertain outcome when a failed permission refresh removes the actual route", async () => {
  // Given
  const user = userEvent.setup();
  await openRoutes();
  await screen.findByText("Modifier la présentation");
  const permissionRead = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) => {
    if (String(url).endsWith("/accounts/me")) return permissionRead.promise;
    if (options?.method === "PATCH")
      return Promise.reject(new TypeError("Lost response"));
    return Promise.resolve(json(initial));
  });
  await user.press(
    screen.getByRole("button", { name: "Relire les permissions" }),
  );
  await user.press(screen.getByText("Modifier la présentation"));
  await screen.findByDisplayValue("Current name");
  await edit("Nom complet personnalisé", "Retained draft");
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await screen.findByRole("button", { name: "Relire la présentation" });

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
      screen.queryByLabelText("Nom complet personnalisé"),
    ).not.toBeOnTheScreen(),
  );
  mockFetch.mockImplementation(async (url) =>
    json(String(url).endsWith("/accounts/me") ? account : initial),
  );
  await user.press(
    await screen.findByRole("button", { name: "Relire les permissions" }),
  );
  await user.press(await screen.findByText("Modifier la présentation"));

  // Then
  expect(
    await screen.findByLabelText("Nom complet personnalisé"),
  ).toHaveDisplayValue("Retained draft");
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Relire la présentation" }),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
  ).toHaveLength(1);
});

it("keeps an outstanding save busy across protected-route removal and records its later uncertainty", async () => {
  // Given
  const user = userEvent.setup();
  await openRoutes();
  await screen.findByText("Modifier la présentation");
  const permissionRead = Promise.withResolvers<Response>();
  const saveResponse = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) => {
    if (String(url).endsWith("/accounts/me")) return permissionRead.promise;
    if (options?.method === "PATCH") return saveResponse.promise;
    return Promise.resolve(json(initial));
  });
  await user.press(
    screen.getByRole("button", { name: "Relire les permissions" }),
  );
  await user.press(screen.getByText("Modifier la présentation"));
  await screen.findByDisplayValue("Current name");
  await edit("Nom complet personnalisé", "Pending draft");
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
    ).toHaveLength(1),
  );

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
      screen.queryByLabelText("Nom complet personnalisé"),
    ).not.toBeOnTheScreen(),
  );
  mockFetch.mockImplementation(async (url) =>
    json(String(url).endsWith("/accounts/me") ? account : initial),
  );
  await user.press(
    await screen.findByRole("button", { name: "Relire les permissions" }),
  );
  await user.press(await screen.findByText("Modifier la présentation"));

  // Then
  expect(
    await screen.findByLabelText("Nom complet personnalisé"),
  ).toHaveDisplayValue("Pending draft");
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();

  // When
  await act(async () => saveResponse.reject(new TypeError("Lost response")));

  // Then
  await screen.findByRole("button", { name: "Relire la présentation" });
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
  ).toHaveLength(1);
});

it("rejects an invalid generated response before it replaces the accepted cache or dirty draft", async () => {
  // Given
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  await edit("Nom complet personnalisé", "My draft");
  const query = client.getQueryCache().findAll({
    predicate: ({ queryKey }) =>
      JSON.stringify(queryKey).includes("/presentation"),
  })[0];
  mockFetch.mockResolvedValue(
    json({ ...initial, logo: { ...logo, effectiveUrl: 42 } }),
  );

  // When
  await act(async () =>
    client.refetchQueries({ queryKey: query?.queryKey, exact: true }),
  );

  // Then
  await waitFor(() => expect(query?.state.status).toBe("error"));
  expect(query?.state.data).toEqual({ kind: "team", data: initial });
  expect(screen.getByLabelText("Nom complet personnalisé")).toHaveDisplayValue(
    "My draft",
  );
});

it("rejects a delayed save result after the session has ended", async () => {
  // Given
  const user = await renderEditor();
  await screen.findByDisplayValue("Current name");
  await edit("Nom complet personnalisé", "My draft");
  let finish!: (response: Response) => void;
  mockFetch.mockImplementation((_url, options) =>
    options?.method === "PATCH"
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : Promise.resolve(json(initial)),
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await waitFor(() => expect(finish).toBeDefined());

  // When
  await user.press(screen.getByRole("button", { name: "Quitter la session" }));
  await act(async () => finish(json({ ...initial, revision: "r2" })));

  // Then
  await waitFor(() =>
    expect(
      screen.queryByLabelText("Nom complet personnalisé"),
    ).not.toBeOnTheScreen(),
  );
  expect(screen.queryByText("Présentation enregistrée.")).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
  ).toHaveLength(1);
});
