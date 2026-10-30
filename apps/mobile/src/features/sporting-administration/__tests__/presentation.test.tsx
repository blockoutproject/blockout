import { useLayoutEffect } from "react";
import { nativeAlertAction } from "../../../shared/native/test-support/native-alert";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import {
  QueryClientProvider,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  cleanup,
  act,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { Alert, Pressable, Text } from "react-native";
import { Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ComponentType, PropsWithChildren, ReactNode } from "react";
import { useDivisions } from "../api/classification";
import { getListDivisionsQueryKey } from "../../../../.generated/mobile";
import RootLayout from "../../../app/_layout";
import OnboardingRoute from "../../../app/onboarding";
import OperationsLayout from "../../../app/(operations)/_layout";
import PresentationRoute from "../../../app/(operations)/administration/presentation/[kind]/[id]";
import DivisionCreationRoute from "../../../app/(operations)/administration/divisions/new";
import DivisionRoute from "../../../app/(operations)/administration/divisions/[id]";
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
import { completeDiscovery } from "../../onboarding/discovery-state";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { PresentationScreen } from "../screens/presentation-screen";

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
jest.mock("expo-file-system", () => ({
  File: jest.fn(),
  Paths: {
    cache: { uri: "file:///cache/" },
    normalize: jest.requireActual("expo-file-system").Paths.normalize,
  },
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

const mockContext = {
  resize: jest.fn(),
  renderAsync: jest.fn(),
  release: jest.fn(),
};
const mockImage = { saveAsync: jest.fn(), release: jest.fn() };
const mockFile = Object.assign(
  new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }),
  { uri: "file:///prepared.png", exists: true, delete: jest.fn() },
);
const mockPickedFile = {
  exists: true,
  size: mockFile.size,
  type: "image/png",
  copy: jest.fn(),
  delete: jest.fn(),
};
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
let client: QueryClient;
let publicClient = createQueryClient();
let stored: unknown = initial;
let permissions: unknown = account.permissions;
let mockMaintenance = false;
const environment = { ...process.env };

// Presentation routes start after common discovery has been explicitly completed.
/** Synthetic baseline HTTP peer; each scenario owns its changed network outcome. */
async function respond(
  url: RequestInfo | URL,
  _options?: RequestInit,
): Promise<Response> {
  return json(
    String(url).endsWith("/accounts/me") ? { ...account, permissions } : stored,
  );
}
beforeEach(async () => {
  jest
    .mocked(File)
    .mockReset()
    .mockImplementation(
      (...parts) =>
        (parts.length === 2 || parts[0] === "file:///prepared.png"
          ? mockFile
          : mockPickedFile) as unknown as File,
    );
  mockFile.exists = true;
  mockFile.delete.mockReset().mockImplementation(() => {
    mockFile.exists = false;
  });
  mockPickedFile.exists = true;
  mockPickedFile.copy.mockReset();
  mockPickedFile.delete.mockReset().mockImplementation(() => {
    mockPickedFile.exists = false;
  });
  await completeDiscovery();
  publicClient = createQueryClient();
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
  mockFetch.mockReset().mockImplementation(respond);
});
afterEach(async () => {
  await cleanup();
  client?.clear();
  publicClient.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Selects the real private lifetime client and disables read retries only for these failure scenarios. */
function PrivateQueries({ children }: PropsWithChildren) {
  const current = useQueryClient();
  useLayoutEffect(() => {
    client = current;
    current.setQueryDefaults([], { retry: false });
  }, [current]);
  return children;
}

/** Real form, Query, identity and access owners; only native credentials/images and HTTP are controlled. */
async function renderEditor(
  kind: "club" | "team" | "pool" | "division" | "division-creation" = "team",
  peers?: ReactNode,
) {
  await renderRouter({
    _layout: () => <Stack />,
    index: () => (
      <QueryClientProvider client={publicClient}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <PrivateQueries>
                <AccountFeedbackProvider>
                  {peers}
                  <PresentationScreen
                    target={
                      kind === "division-creation"
                        ? { kind }
                        : { kind, id: resourceId }
                    }
                  />
                  <SessionAction />
                </AccountFeedbackProvider>
              </PrivateQueries>
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  });
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

it("saves independent names and a nonsquare logo in one generated multipart PATCH", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(screen.getByLabelText("Nom complet personnalisé"), "Chosen");
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: "file:///cache/ImagePicker/selected.png",
        width: 120,
        height: 60,
        type: "image",
      },
    ],
  });
  await user.press(screen.getByRole("button", { name: "Choisir un logo" }));
  await screen.findByRole("button", { name: "Aperçu : Logo" });
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PATCH")
      stored = {
        ...initial,
        revision: "r2",
        names: { ...names, manualName: "Chosen", effectiveName: "Chosen" },
      };
    return respond(url, options);
  });

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await waitFor(() =>
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen(),
  );
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
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.press(
    screen.getByRole("button", { name: "Rétablir le logo automatique" }),
  );

  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PATCH")
      stored = {
        ...initial,
        revision: "r2",
        names: { ...names, manualName: null, effectiveName: names.sourceName },
        logo,
      };
    return respond(url, options);
  });

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
  const user = userEvent.setup();
  await renderEditor("pool");
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom court personnalisé"));
  await user.type(
    screen.getByLabelText("Nom court personnalisé"),
    "Custom short",
  );

  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PUT")
      stored = {
        id: resourceId,
        revision: "r2",
        names: {
          ...names,
          manualShortName: "Custom short",
          effectiveShortName: "Custom short",
        },
      };
    return respond(url, options);
  });

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await waitFor(() =>
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen(),
  );
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
  const user = userEvent.setup();
  await renderEditor("club");
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom personnalisé"));
  await user.type(screen.getByLabelText("Nom personnalisé"), "Club chosen");

  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PATCH")
      stored = {
        ...initial,
        kind: "club",
        revision: "r2",
        names: {
          ...names,
          manualName: "Club chosen",
          effectiveName: "Club chosen",
        },
      };
    return respond(url, options);
  });

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await waitFor(() =>
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen(),
  );
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
  const user = userEvent.setup();
  await renderEditor("division");
  await screen.findByDisplayValue("Division");
  await user.clear(screen.getByLabelText("Couleur HEX"));
  await user.type(screen.getByLabelText("Couleur HEX"), "invalid");

  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PATCH")
      stored = {
        id: resourceId,
        revision: "r2",
        name: "Division",
        color: "#abcdef",
        gradient: ["#111111", "#222222", "#333333"],
        logo,
        active: false,
      };
    return respond(url, options);
  });

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await screen.findByText("Utilisez une couleur au format #RRGGBB.");
  expect(mockFetch.mock.calls.some(([, o]) => o?.method === "PATCH")).toBe(
    false,
  );

  // When
  await user.clear(screen.getByLabelText("Couleur HEX"));
  await user.type(screen.getByLabelText("Couleur HEX"), "#abcdef");
  await user.clear(screen.getByLabelText("Départ"));
  await user.type(screen.getByLabelText("Départ"), "#111111");
  await user.clear(screen.getByLabelText("Milieu"));
  await user.type(screen.getByLabelText("Milieu"), "#222222");
  await user.clear(screen.getByLabelText("Fin"));
  await user.type(screen.getByLabelText("Fin"), "#333333");
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await waitFor(() =>
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen(),
  );
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
    const user = userEvent.setup();
    await renderEditor();
    await screen.findByDisplayValue("Current name");
    await user.clear(screen.getByLabelText("Nom complet personnalisé"));
    await user.type(
      screen.getByLabelText("Nom complet personnalisé"),
      "My draft",
    );
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
    stored = {
      ...initial,
      revision: "r3",
      names: {
        ...names,
        manualName: "My draft",
        effectiveName: "My draft",
        manualShortName: "New short",
        effectiveShortName: "New short",
      },
    };
    mockFetch.mockImplementation(respond);
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));

    // Then
    await waitFor(() =>
      expect(
        screen.queryByText("Modifications non enregistrées"),
      ).not.toBeOnTheScreen(),
    );
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
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "My draft",
  );
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
    "Une erreur est survenue. Veuillez réessayer plus tard.",
  );
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
});

it("refreshes the displayed logo, retaining technical failures but removing refused artwork until a successful read", async () => {
  // Given
  stored = {
    ...initial,
    logo: { ...logo, effectiveUrl: `/teams/${resourceId}/logo` },
  };
  const previousReader = Object.getOwnPropertyDescriptor(
    globalThis,
    "FileReader",
  );
  /** Controls only native binary decoding; the actual generated transport and Query owners remain mounted. */
  class LogoReader {
    result = "data:image/png;base64,sporting-logo";
    onload?: () => void;
    /** Makes an accepted binary response observable in the semantic image preview. */
    readAsDataURL() {
      this.onload?.();
    }
  }
  Object.defineProperty(globalThis, "FileReader", {
    configurable: true,
    value: LogoReader,
  });
  let logoStatus = 200;
  mockFetch.mockImplementation(async (url, options) => {
    if (!String(url).includes(`/teams/${resourceId}/logo`))
      return respond(url, options);
    return logoStatus === 200
      ? new Response(mockFile, { headers: { "Content-Type": "image/png" } })
      : json({ title: "Logo unavailable", status: logoStatus }, logoStatus);
  });
  try {
    const user = userEvent.setup();
    await renderEditor();
    await screen.findByRole("button", { name: "Aperçu : Logo" });
    await user.clear(screen.getByLabelText("Nom complet personnalisé"));
    await user.type(
      screen.getByLabelText("Nom complet personnalisé"),
      "Local name",
    );

    // When
    logoStatus = 503;
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then
    await screen.findByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    });
    expect(
      screen.getByRole("button", { name: "Aperçu : Logo" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
    expect(screen.getByDisplayValue("Local name")).toBeOnTheScreen();

    // When
    logoStatus = 403;
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then
    await screen.findByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    });
    expect(screen.queryByText("Une erreur est survenue")).toBeNull();
    expect(screen.queryByRole("button", { name: "Aperçu : Logo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
    expect(screen.getByDisplayValue("Local name")).toBeEnabled();

    // When
    logoStatus = 503;
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
    await waitFor(() => expect(client.isFetching()).toBe(0));

    // Then
    expect(screen.queryByText("Une erreur est survenue")).toBeNull();
    expect(screen.queryByRole("button", { name: "Aperçu : Logo" })).toBeNull();

    // When
    logoStatus = 200;
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

    // Then
    expect(
      await screen.findByRole("button", { name: "Aperçu : Logo" }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Une erreur est survenue")).toBeNull();

    // When
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///picker.png", width: 120, height: 60 }],
    });
    await user.press(
      screen.getByRole("button", { name: "Changer le logo : Logo" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
    );
    logoStatus = 403;
    mockFetch.mockClear();
    await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
    await waitFor(() => expect(client.isFetching()).toBe(0));

    // Then
    expect(
      screen.getByRole("button", { name: "Aperçu : Logo" }),
    ).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Local name")).toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.some(([url]) =>
        String(url).includes(`/teams/${resourceId}/logo`),
      ),
    ).toBe(false);
  } finally {
    if (previousReader)
      Object.defineProperty(globalThis, "FileReader", previousReader);
    else Reflect.deleteProperty(globalThis, "FileReader");
  }
});

it("retains input and shows the invalid-image field refusal", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "My draft",
  );
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PATCH"
      ? Promise.resolve(
          json(
            {
              type: "urn:blockout:problem:invalid-image",
              title: "Invalid image",
              status: 422,
            },
            422,
          ),
        )
      : respond(url, options),
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
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
  );
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
  await screen.findByText("Une erreur est survenue");
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).includes("/presentation")),
  ).toBe(false);
});

it("retains a read-only draft when the current action grant is withdrawn", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "My draft",
  );
  permissions = { manageCollection: true };

  // When
  await act(async () =>
    client.refetchQueries({
      predicate: ({ queryKey }) =>
        JSON.stringify(queryKey).includes("/accounts/me"),
    }),
  );

  // Then
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled(),
  );
  expect(screen.queryByText("Une erreur est survenue")).toBeNull();
  expect(screen.getByLabelText("Nom complet personnalisé")).toHaveDisplayValue(
    "My draft",
  );
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
});

it("ignores a held native selection after the session is invalidated", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  const selection = Promise.withResolvers<ImagePicker.ImagePickerResult>();
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockReturnValue(selection.promise);
  await user.press(screen.getByRole("button", { name: "Choisir un logo" }));

  // When
  await user.press(screen.getByRole("button", { name: "Quitter la session" }));
  await act(async () =>
    selection.resolve({
      canceled: false,
      assets: [
        {
          uri: "file:///cache/ImagePicker/old.png",
          width: 120,
          height: 60,
          type: "image",
        },
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
      onboarding: OnboardingRoute,
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
      "(operations)/_layout": () => (
        <>
          <OperationsLayout />
          <PermissionRefresh />
        </>
      ),
      "(operations)/administration/classification/[kind]/[id]": () => (
        <Text>Classification route</Text>
      ),
      "(operations)/administration/classification-selection": () => (
        <Text>Selection route</Text>
      ),
      "(operations)/administration/divisions/[id]": DivisionRoute,
      "(operations)/administration/divisions/index": () => (
        <Text>Divisions route</Text>
      ),
      "(operations)/administration/divisions/new": DivisionCreationRoute,
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

it("opens the delivered administration entry for a presentation-only account during maintenance", async () => {
  // Given
  mockMaintenance = true;
  const user = userEvent.setup();

  // When
  await openRoutes("/access");
  await screen.findByRole("header", { name: "Blockout est en maintenance" });
  await screen.findByText("Presentation authority available");
  await user.press(
    await screen.findByRole("link", { name: "Accès administrateur" }),
  );

  // Then
  await screen.findByText("Administration route");
  expect(screen).toHavePathname("/administration");
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
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(screen.getByLabelText("Nom complet personnalisé"), "Unsaved");
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      { uri: "file:///cache/ImagePicker/source.png", width: 120, height: 60 },
    ],
  });
  await user.press(screen.getByRole("button", { name: "Choisir un logo" }));
  await screen.findByRole("button", { name: "Aperçu : Logo" });
  await act(async () => router.back());

  // Then
  expect(Alert.alert).toHaveBeenCalledWith(
    "Abandonner les modifications ?",
    expect.any(String),
    expect.any(Array),
    expect.objectContaining({
      cancelable: true,
      onDismiss: expect.any(Function),
    }),
  );
  expect(screen.getByLabelText("Nom complet personnalisé")).toHaveDisplayValue(
    "Unsaved",
  );

  // When
  await act(async () => nativeAlertAction("Abandonner")());

  // Then
  await screen.findByText("Modifier la présentation");
  expect(mockFile.delete).toHaveBeenCalledTimes(1);
  expect(mockPickedFile.delete).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PATCH"),
  ).toBe(false);
});

it("drops the draft and releases its logo when revoked grants remove the protected route", async () => {
  // Given
  const user = userEvent.setup();
  await openRoutes();
  await user.press(await screen.findByText("Modifier la présentation"));
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "Local draft",
  );
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      { uri: "file:///cache/ImagePicker/source.png", width: 120, height: 60 },
    ],
  });
  await user.press(screen.getByRole("button", { name: "Choisir un logo" }));
  await screen.findByRole("button", { name: "Aperçu : Logo" });

  // When
  permissions = {};
  await user.press(
    await screen.findByRole("button", { name: "Relire les permissions" }),
  );

  // Then
  await waitFor(() =>
    expect(
      screen.queryByLabelText("Nom complet personnalisé"),
    ).not.toBeOnTheScreen(),
  );
  expect(mockFile.delete).toHaveBeenCalledTimes(1);

  // When
  permissions = account.permissions;
  await user.press(
    await screen.findByRole("button", { name: "Relire les permissions" }),
  );
  await user.press(await screen.findByText("Modifier la présentation"));

  // Then
  expect(
    await screen.findByLabelText("Nom complet personnalisé"),
  ).toHaveDisplayValue("Current name");
  expect(
    screen.queryByRole("button", { name: "Aperçu : Logo" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByText("Modifications non enregistrées"),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PATCH"),
  ).toBe(false);
});

it("rejects an invalid generated response before it replaces the accepted cache or dirty draft", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "My draft",
  );
  const query = client.getQueryCache().findAll({
    predicate: ({ queryKey }) =>
      JSON.stringify(queryKey).includes("/presentation"),
  })[0];
  mockFetch.mockImplementation(async () =>
    json({ ...initial, logo: { ...logo, effectiveUrl: 42 } }),
  );

  // When
  await act(async () =>
    client.refetchQueries({ queryKey: query?.queryKey, exact: true }),
  );

  // Then
  await waitFor(() => expect(query?.state.status).toBe("error"));
  expect(query?.state.data).toEqual(initial);
  expect(screen.getByLabelText("Nom complet personnalisé")).toHaveDisplayValue(
    "My draft",
  );
});

it("rejects a delayed save result after the session has ended", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "My draft",
  );
  const saveResponse = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((_url, options) =>
    options?.method === "PATCH"
      ? saveResponse.promise
      : Promise.resolve(json(initial)),
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
    ).toHaveLength(1),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Quitter la session" }));
  await act(async () =>
    saveResponse.resolve(json({ ...initial, revision: "r2" })),
  );

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

it("creates an active division through the existing atomic presentation form with the lifecycle grant alone", async () => {
  // Given
  permissions = { manageDivisionLifecycle: true };
  stored = { items: [] };
  jest.spyOn(Alert, "alert");
  const initialFetch = respond;
  const created = {
    id: resourceId,
    revision: "d1",
    name: "National 2",
    color: "#123456",
    gradient: null,
    logo,
    active: true,
  };
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "POST") {
      stored = { items: [created] };
      return Promise.resolve(json(created, 201));
    }
    return initialFetch(url, options);
  });
  const user = userEvent.setup();
  await renderEditor("division-creation");
  await screen.findByLabelText("Nom de la division");
  await user.clear(screen.getByLabelText("Nom de la division"));
  await user.type(screen.getByLabelText("Nom de la division"), "National 2");
  await user.clear(screen.getByLabelText("Couleur HEX"));
  await user.type(screen.getByLabelText("Couleur HEX"), "#123456");

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "POST"),
  ).toBe(false);
  const confirm = nativeAlertAction("Créer la division");
  await act(async () => {
    confirm();
  });

  // Then
  await screen.findByRole("button", { name: "Voir les divisions" });
  const request = mockFetch.mock.calls.find(
    ([, options]) => options?.method === "POST",
  )?.[1];
  expect(request?.body).toBeInstanceOf(FormData);
  const metadata = (request?.body as FormData).get("metadata") as Blob;
  expect(metadata.type).toBe("application/json");
  expect(JSON.parse(await metadata.text())).toEqual({
    name: "National 2",
    color: "#123456",
    gradient: null,
    logoAction: "keep",
  });
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).includes("/activity")),
  ).toBe(false);
});

it("preserves a proposed division name when the server reports an existing name", async () => {
  // Given
  permissions = { manageDivisionLifecycle: true };
  stored = { items: [] };
  jest.spyOn(Alert, "alert");
  mockFetch.mockImplementation((url, options) =>
    options?.method === "POST"
      ? Promise.resolve(
          json(
            {
              type: "urn:blockout:problem:conflict",
              title: "Conflict",
              status: 409,
            },
            409,
          ),
        )
      : respond(url, options),
  );
  const user = userEvent.setup();
  await renderEditor("division-creation");
  await user.clear(await screen.findByLabelText("Nom de la division"));
  await user.type(screen.getByLabelText("Nom de la division"), "National 2");
  await user.clear(screen.getByLabelText("Couleur HEX"));
  await user.type(screen.getByLabelText("Couleur HEX"), "#123456");

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Créer la division")());

  // Then
  await screen.findByText("Ce nom de division est déjà utilisé.");
  expect(screen.getByLabelText("Nom de la division")).toHaveDisplayValue(
    "National 2",
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
  );
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
});

it("keeps lifecycle independent at the end of the division editor for a lifecycle-only operator", async () => {
  // Given
  permissions = { manageDivisionLifecycle: true };
  const division = {
    id: resourceId,
    revision: "d1",
    name: "National 2",
    color: "#123456",
    gradient: null,
    logo,
    active: true,
  };
  stored = division;
  const user = userEvent.setup();
  await renderEditor("division");
  jest.spyOn(Alert, "alert");

  // When
  await user.press(
    await screen.findByRole("button", { name: "Désactiver la division" }),
  );
  const confirmation = nativeAlertAction("Désactiver");
  mockFetch.mockImplementation(async () =>
    json({ ...division, revision: "d2", active: false }),
  );
  await act(async () => {
    confirmation();
  });

  // Then
  await screen.findByRole("button", { name: "Réactiver la division" });
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PATCH"),
  ).toBe(false);
  expect(mockFetch).toHaveBeenCalledWith(
    expect.stringContaining(`/divisions/${resourceId}/activity`),
    expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ revision: "d1", active: false }),
    }),
  );
  expect(
    screen.queryByRole("button", { name: "Enregistrer" }),
  ).not.toBeOnTheScreen();
});

it("preserves unsaved presentation values while an independent activity response advances the division revision", async () => {
  // Given
  permissions = {
    manageSportingPresentation: true,
    manageDivisionLifecycle: true,
  };
  const division = {
    id: resourceId,
    revision: "d1",
    name: "Division",
    color: "#123456",
    gradient: null,
    logo,
    active: true,
  };
  stored = division;
  const originalFetch = respond;
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PUT") {
      stored = { ...division, revision: "d2", active: false };
      return Promise.resolve(json(stored));
    }
    return originalFetch(url, options);
  });
  jest.spyOn(Alert, "alert");
  const user = userEvent.setup();
  await renderEditor("division");
  await screen.findByDisplayValue("Division");
  await user.clear(screen.getByLabelText("Nom de la division"));
  await user.type(
    screen.getByLabelText("Nom de la division"),
    "Unsaved presentation",
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Désactiver la division" }),
  );
  const confirmation = nativeAlertAction("Désactiver");
  await act(async () => {
    confirmation();
  });
  await screen.findByRole("button", { name: "Réactiver la division" });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await waitFor(() =>
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen(),
  );
  const body = mockFetch.mock.calls.find(
    ([, options]) => options?.method === "PATCH",
  )?.[1]?.body as FormData;
  expect(JSON.parse(await (body.get("metadata") as Blob).text())).toMatchObject(
    { revision: "d2", name: "Unsaved presentation" },
  );
  expect(
    screen.queryByRole("button", { name: "Désactiver la division" }),
  ).not.toBeOnTheScreen();
});

it("restores automatic division paint without sending a separate color or lifecycle command", async () => {
  // Given
  stored = {
    id: resourceId,
    revision: "d1",
    name: "Division",
    color: "#123456",
    gradient: ["#111111", "#222222", "#333333"],
    logo,
    active: false,
  };
  const user = userEvent.setup();
  await renderEditor("division");

  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PATCH")
      stored = {
        id: resourceId,
        revision: "d2",
        name: "Division",
        color: "#123456",
        gradient: null,
        logo,
        active: false,
      };
    return respond(url, options);
  });

  // When
  await user.press(
    await screen.findByRole("button", {
      name: "Revenir au dégradé automatique",
    }),
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await waitFor(() =>
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen(),
  );
  const body = mockFetch.mock.calls.find(
    ([, options]) => options?.method === "PATCH",
  )?.[1]?.body as FormData;
  expect(JSON.parse(await (body.get("metadata") as Blob).text())).toMatchObject(
    { revision: "d1", color: "#123456", gradient: null },
  );
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PUT"),
  ).toBe(false);
});

it("preserves an empty invalid gradient stop when another stop changes", async () => {
  // Given
  stored = {
    id: resourceId,
    revision: "d1",
    name: "Division",
    color: "#123456",
    gradient: ["#111111", "#222222", "#333333"],
    logo,
    active: true,
  };
  const user = userEvent.setup();
  await renderEditor("division");
  await screen.findByDisplayValue("Division");

  // When
  await user.clear(screen.getByLabelText("Départ"));
  await user.clear(screen.getByLabelText("Milieu"));
  await user.type(screen.getByLabelText("Milieu"), "#ABCDEF");
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  expect(screen.getByLabelText("Départ")).toHaveDisplayValue("");
  expect(
    await screen.findByText(
      "Renseignez les trois couleurs au format #RRGGBB ou laissez-les toutes vides.",
    ),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PATCH"),
  ).toBe(false);
});

it("deletes a removed logo copy after the picker loan was released", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      { uri: "file:///cache/ImagePicker/source.png", width: 120, height: 60 },
    ],
  });
  await user.press(screen.getByRole("button", { name: "Choisir un logo" }));
  await screen.findByRole("button", { name: "Aperçu : Logo" });

  // When
  await user.press(
    screen.getByRole("button", { name: "Rétablir le logo automatique : Logo" }),
  );

  // Then
  expect(mockFile.delete).toHaveBeenCalledTimes(1);
  expect(mockPickedFile.delete).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByRole("button", { name: "Aperçu : Logo" }),
  ).not.toBeOnTheScreen();
});

it("keeps a sent logo until upload settlement after session invalidation", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      { uri: "file:///cache/ImagePicker/source.png", width: 120, height: 60 },
    ],
  });
  await user.press(screen.getByRole("button", { name: "Choisir un logo" }));
  await screen.findByRole("button", { name: "Aperçu : Logo" });
  const response = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PATCH" ? response.promise : respond(url, options),
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.some(([, options]) => options?.method === "PATCH"),
    ).toBe(true),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Quitter la session" }));

  // Then
  expect(mockFile.delete).not.toHaveBeenCalled();

  // When
  await act(async () => response.resolve(json(initial)));

  // Then
  await waitFor(() => expect(mockFile.delete).toHaveBeenCalledTimes(1));
  expect(mockPickedFile.delete).toHaveBeenCalledTimes(1);
});

it("deletes a prepared logo completed after its form unmounts", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: "file:///cache/ImagePicker/source.heic",
        mimeType: "image/heic",
        width: 120,
        height: 60,
      },
    ],
  });
  const output = Promise.withResolvers<{
    uri: string;
    width: number;
    height: number;
  }>();
  mockImage.saveAsync.mockReturnValue(output.promise);
  await user.press(screen.getByRole("button", { name: "Choisir un logo" }));
  await waitFor(() => expect(mockImage.saveAsync).toHaveBeenCalledTimes(1));

  // When
  await screen.unmount();
  await act(async () =>
    output.resolve({ uri: "file:///prepared.png", width: 120, height: 60 }),
  );

  // Then
  expect(mockFile.delete).toHaveBeenCalledTimes(1);
  expect(mockPickedFile.delete).toHaveBeenCalledTimes(1);
});

it.each(["division-creation", "division"] as const)(
  "ignores the retained %s confirmation after protected-route removal and readmission",
  async (kind) => {
    // Given
    permissions = { manageDivisionLifecycle: true };
    stored =
      kind === "division-creation"
        ? { items: [] }
        : {
            id: resourceId,
            revision: "d1",
            name: "National 2",
            color: "#123456",
            gradient: null,
            logo,
            active: true,
          };
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const user = userEvent.setup();
    await openRoutes();
    await screen.findByRole("button", { name: "Relire les permissions" });
    const path =
      kind === "division-creation"
        ? "/administration/divisions/new"
        : `/administration/divisions/${resourceId}`;
    await act(async () => router.push(path));
    if (kind === "division-creation") {
      await screen.findByLabelText("Nom de la division");
      await user.clear(screen.getByLabelText("Nom de la division"));
      await user.type(
        screen.getByLabelText("Nom de la division"),
        "National 2",
      );
      await user.clear(screen.getByLabelText("Couleur HEX"));
      await user.type(screen.getByLabelText("Couleur HEX"), "#123456");
      await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    } else
      await user.press(
        await screen.findByRole("button", { name: "Désactiver la division" }),
      );
    const confirm = nativeAlertAction(
      kind === "division-creation" ? "Créer la division" : "Désactiver",
    );

    // When
    permissions = {};
    await user.press(
      await screen.findByRole("button", { name: "Relire les permissions" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByLabelText("Nom de la division"),
      ).not.toBeOnTheScreen(),
    );
    permissions = { manageDivisionLifecycle: true };
    await user.press(
      await screen.findByRole("button", { name: "Relire les permissions" }),
    );
    await act(async () => router.push(path));
    await screen.findByLabelText("Nom de la division");
    await act(async () => confirm());

    // Then
    expect(
      mockFetch.mock.calls.filter(([, options]) =>
        ["POST", "PUT"].includes(options?.method ?? ""),
      ),
    ).toHaveLength(0);
  },
);

it("releases only the replaced logo copy while the new draft remains usable", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  const replacement = Object.assign(
    new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" }),
    { uri: "file:///replacement.png", exists: true, delete: jest.fn() },
  );
  replacement.delete.mockImplementation(() => {
    replacement.exists = false;
  });
  jest.mocked(File).mockImplementation((...parts) => {
    if (
      parts.length === 1 &&
      String(parts[0]).startsWith("file:///cache/ImagePicker/")
    )
      return mockPickedFile as unknown as File;
    return (mockPickedFile.copy.mock.calls.length === 0
      ? mockFile
      : replacement) as unknown as File;
  });
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockImplementation(async () => {
      // Each native selection delivers a fresh loan, even when the picker reuses its cache URI.
      mockPickedFile.exists = true;
      return {
        canceled: false,
        assets: [
          {
            uri: "file:///cache/ImagePicker/source.png",
            width: 120,
            height: 60,
          },
        ],
      };
    });
  await user.press(screen.getByRole("button", { name: "Choisir un logo" }));
  await screen.findByRole("button", { name: "Aperçu : Logo" });

  // When
  await user.press(
    screen.getByRole("button", { name: "Changer le logo : Logo" }),
  );

  // Then
  await waitFor(() => expect(mockFile.delete).toHaveBeenCalledTimes(1));
  expect(replacement.delete).not.toHaveBeenCalled();
  expect(mockPickedFile.delete).toHaveBeenCalledTimes(2);
  expect(
    screen.getByRole("button", { name: "Aperçu : Logo" }),
  ).toBeOnTheScreen();
});

/** A second real consumer makes the shared list and its creation invalidation visible. */
function DivisionListObserver() {
  const { query, authority } = useDivisions();
  return (
    <>
      <Text>{`Known divisions: ${query.data?.items.map((item) => item.name).join(", ") ?? "loading"}`}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh divisions"
        onPress={() => void query.refetch()}
      >
        <Text>Refresh divisions</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh permissions"
        onPress={() => void authority.account.refetch()}
      >
        <Text>Refresh permissions</Text>
      </Pressable>
    </>
  );
}

it("shares one raw division list across creation and navigation and refreshes it after creation", async () => {
  // Given
  permissions = { manageDivisionLifecycle: true };
  stored = { items: [] };
  const created = {
    id: resourceId,
    revision: "d1",
    name: "National 2",
    color: "#123456",
    gradient: null,
    logo,
    active: true,
  };
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "POST") {
      stored = { items: [created] };
      return Promise.resolve(json(created, 201));
    }
    return respond(url, options);
  });
  jest.spyOn(Alert, "alert");
  const user = userEvent.setup();
  await renderEditor("division-creation", <DivisionListObserver />);
  await screen.findByLabelText("Nom de la division");
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      String(url).includes("/administration/divisions"),
    ),
  ).toHaveLength(1);
  const listPath = getListDivisionsQueryKey({ includeInactive: true })[0];
  const entries = client
    .getQueryCache()
    .findAll({ predicate: ({ queryKey }) => queryKey.includes(listPath) });
  expect(entries).toHaveLength(1);
  expect(entries[0]?.state.data).toEqual({ items: [] });
  await user.clear(screen.getByLabelText("Nom de la division"));
  await user.type(screen.getByLabelText("Nom de la division"), "National 2");
  await user.clear(screen.getByLabelText("Couleur HEX"));
  await user.type(screen.getByLabelText("Couleur HEX"), "#123456");

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  const confirm = nativeAlertAction("Créer la division");
  await act(async () => {
    confirm();
  });

  // Then
  expect(
    await screen.findByText("Known divisions: National 2"),
  ).toBeOnTheScreen();
  expect(entries[0]?.state.data).toEqual({ items: [created] });
  expect(
    mockFetch.mock.calls.filter(
      ([url, options]) =>
        String(url).includes("/administration/divisions") &&
        options?.method === "GET",
    ),
  ).toHaveLength(2);
});

it("keeps the shared division read authorized when creation loses its separate lifecycle grant", async () => {
  // Given
  permissions = {
    manageDivisionLifecycle: true,
    manageSportingPresentation: true,
  };
  stored = { items: [] };
  const user = userEvent.setup();
  await renderEditor("division-creation", <DivisionListObserver />);
  await screen.findByLabelText("Nom de la division");
  permissions = { manageSportingPresentation: true };

  // When
  await user.press(screen.getByRole("button", { name: "Refresh permissions" }));
  await waitFor(() =>
    expect(screen.getByLabelText("Nom de la division")).toBeDisabled(),
  );
  expect(screen.queryByText("Une erreur est survenue")).toBeNull();
  stored = {
    items: [
      {
        id: resourceId,
        revision: "d1",
        name: "Current division",
        color: "#123456",
        gradient: null,
        logo,
        active: true,
      },
    ],
  };
  await user.press(screen.getByRole("button", { name: "Refresh divisions" }));

  // Then
  expect(
    await screen.findByText("Known divisions: Current division"),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(0);
});

it("keeps a fresh editor usable when an abandoned save fails later", async () => {
  // Given
  const user = userEvent.setup();
  const response = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PATCH" ? response.promise : respond(url, options),
  );
  jest.spyOn(Alert, "alert");
  await openRoutes();
  await user.press(await screen.findByText("Modifier la présentation"));
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "Discarded pending draft",
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await screen.findByRole("button", { name: "Enregistrer", busy: true });

  // When
  await act(async () => router.back());
  await act(async () => nativeAlertAction("Abandonner")());
  await user.press(await screen.findByText("Modifier la présentation"));
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "Fresh draft",
  );
  await act(async () => response.reject(new TypeError("Lost acknowledgement")));

  // Then
  expect(screen.getByLabelText("Nom complet personnalisé")).toHaveDisplayValue(
    "Fresh draft",
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
  );
  expect(
    screen.queryByRole("button", { name: "Relire la présentation" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
  ).toHaveLength(1);
});
it("executes a confirmed division activity once when the native callback is delivered twice", async () => {
  // Given
  permissions = { manageDivisionLifecycle: true };
  const division = {
    id: resourceId,
    revision: "d1",
    name: "Division",
    color: "#123456",
    gradient: null,
    logo,
    active: true,
  };
  stored = division;
  const response = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PUT" ? response.promise : respond(url, options),
  );
  jest.spyOn(Alert, "alert");
  const user = userEvent.setup();
  await renderEditor("division");
  await user.press(
    await screen.findByRole("button", { name: "Désactiver la division" }),
  );
  const confirmation = nativeAlertAction("Désactiver");

  // When
  await act(async () => {
    confirmation();
    confirmation();
  });

  // Then
  await screen.findByRole("button", {
    name: "Désactiver la division",
    busy: true,
  });
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);

  // When
  stored = { ...division, revision: "d2", active: false };
  await act(async () => response.resolve(json(stored)));

  // Then
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Réactiver la division" }),
    ).toBeEnabled(),
  );
});

it("preserves a different opaque revision read during a delayed accepted presentation save", async () => {
  // Given
  const response = Promise.withResolvers<Response>();
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "Accepted draft",
  );
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PATCH" ? response.promise : respond(url, options),
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await screen.findByRole("button", { name: "Enregistrer", busy: true });

  // When — revisions are opaque; the distinct accepted read must not be ordered lexically.
  stored = {
    ...initial,
    revision: "a-concurrent",
    names: { ...names, manualName: "Concurrent", effectiveName: "Concurrent" },
  };
  await act(async () =>
    client.refetchQueries({
      predicate: ({ queryKey }) =>
        queryKey.some(
          (part) => typeof part === "string" && part.endsWith("/presentation"),
        ),
    }),
  );
  await act(async () =>
    response.resolve(
      json({
        ...initial,
        revision: "z-accepted",
        names: {
          ...names,
          manualName: "Accepted draft",
          effectiveName: "Accepted draft",
        },
      }),
    ),
  );

  // Then
  await screen.findByRole("button", { name: "Relire la présentation" });
  expect(
    client.getQueryCache().findAll({
      predicate: ({ queryKey }) =>
        queryKey.some(
          (part) => typeof part === "string" && part.endsWith("/presentation"),
        ),
    })[0]?.state.data,
  ).toMatchObject({ revision: "a-concurrent" });
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Relire la présentation" }),
    ).toBeEnabled(),
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Relire la présentation" }),
  );

  // Then
  expect(await screen.findByDisplayValue("Concurrent")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
  ).toHaveLength(1);
});

it("preserves a fresh local creation draft when an abandoned creation succeeds later", async () => {
  // Given
  permissions = { manageDivisionLifecycle: true };
  stored = { items: [] };
  const creation = Promise.withResolvers<Response>();
  const created = {
    id: resourceId,
    revision: "d1",
    name: "Original division",
    color: "#123456",
    gradient: null,
    logo,
    active: true,
  };
  mockFetch.mockImplementation((url, options) =>
    options?.method === "POST" ? creation.promise : respond(url, options),
  );
  jest.spyOn(Alert, "alert");
  const user = userEvent.setup();
  await openRoutes();
  await screen.findByRole("button", { name: "Relire les permissions" });
  await act(async () => router.push("/administration/divisions/new"));
  await user.clear(await screen.findByLabelText("Nom de la division"));
  await user.type(
    screen.getByLabelText("Nom de la division"),
    "Original division",
  );
  await user.clear(screen.getByLabelText("Couleur HEX"));
  await user.type(screen.getByLabelText("Couleur HEX"), "#123456");
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Créer la division")());
  await screen.findByRole("button", { name: "Enregistrer", busy: true });

  // When
  await act(async () => router.back());
  await act(async () => nativeAlertAction("Abandonner")());
  await act(async () => router.push("/administration/divisions/new"));
  await user.clear(await screen.findByLabelText("Nom de la division"));
  await user.type(
    screen.getByLabelText("Nom de la division"),
    "Replacement division",
  );
  await user.clear(screen.getByLabelText("Couleur HEX"));
  await user.type(screen.getByLabelText("Couleur HEX"), "#654321");
  stored = { items: [created] };
  await act(async () => creation.resolve(json(created, 201)));

  // Then
  expect(screen.getByLabelText("Nom de la division")).toHaveDisplayValue(
    "Replacement division",
  );
  expect(screen.getByLabelText("Couleur HEX")).toHaveDisplayValue("#654321");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
  );
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
});
