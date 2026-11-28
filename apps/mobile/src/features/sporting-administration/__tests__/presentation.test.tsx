import { useLayoutEffect } from "react";
import { nativeAlertAction } from "@/shared/native/test-support/native-alert";
import {
  nativeImageChoiceAction,
  nativeImageChoiceLabels,
} from "@/shared/native/test-support/native-image-choices";
import { AccountFeedbackProvider } from "@/features/accounts/test-support/account-feedback-provider";
import { TECHNICAL_ERROR } from "@/shared/components/error-copy";
import { accountResponse } from "@/features/accounts/test-support/account-response";
import type {
  AccountPermissionsResponse,
  ClubContactsResponse,
  DivisionListResponse,
  DivisionResponse,
  PoolPresentationResponse,
  SportingPresentationResponse,
} from "../../../../.generated/schemas/index.zod";
import {
  QueryClientProvider,
  useQuery,
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
import { ActionSheetIOS, Alert, Pressable, Text } from "react-native";
import { Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import type { ComponentType, PropsWithChildren, ReactNode } from "react";
import { useDivisions, useSportingAuthority } from "../api/classification";
import { createSportingAdministrationQueries } from "../api/sporting-administration-queries";
import {
  getGetClubContactsQueryKey,
  getGetTeamPresentationQueryKey,
  getGetTeamLogoQueryKey,
  getGetMyAccountQueryKey,
  getGetDivisionQueryKey,
  getGetDivisionLogoQueryKey,
  getListDivisionsQueryKey,
} from "../../../../.generated/mobile";
import RootLayout from "@/app/_layout";
import OnboardingRoute from "@/app/onboarding";
import OperationsLayout from "@/app/(operations)/_layout";
import PresentationRoute from "@/app/(operations)/administration/presentation/[kind]/[id]";
import DivisionCreationRoute from "@/app/(operations)/administration/divisions/new";
import DivisionRoute from "@/app/(operations)/administration/divisions/[id]";
import { PresentationEntry } from "../entry";
import { useCurrentAccount } from "@/features/accounts/current-account";
import { AccessGateScreen } from "@/features/access/screens/access-gate-screen";
import { createQueryClient } from "@/shared/query/query-client";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { applicationAccessResponse as mockAccess } from "@/shared/api/test-support/application-access";
import { ApplicationAccessProvider } from "@/features/access/queries/use-application-access";
import {
  AccountSessionProvider,
  useAccountSession,
} from "@/features/accounts/session/account-session-provider";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import { completeDiscovery } from "@/features/onboarding/discovery-state";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
import { PresentationScreen } from "../screens/presentation-screen";
import { CreateDivisionScreen } from "../screens/create-division-screen";

jest.mock(
  "react-native-safe-area-context",
  () => jest.requireActual("react-native-safe-area-context/jest/mock").default,
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
jest.mock("expo-image-picker", () => ({
  ...jest.requireActual("expo-image-picker"),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock("expo-file-system", () => ({
  File: jest.fn(),
  // Root layout cleanup observes an empty native document cache in these editor scenarios.
  Directory: jest.fn(() => ({ exists: false })),
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
const account = accountResponse({
  accountId: "00000000-0000-4000-8000-000000000001",
  username: "Operator",
  email: "operator@example.invalid",
  permissions: { manageSportingPresentation: true },
});
const names = {
  sourceName: "Source name",
  effectiveName: "Current name",
  manualName: "Current name",
  effectiveShortName: "Short",
  manualShortName: null,
};
const logo = { effectiveUrl: null, manualUrl: null, automaticUrl: null };
const sourceOnly = { mode: "source", manualValue: null } as const;
const clubContacts: ClubContactsResponse = {
  clubId: resourceId,
  address: {
    ...sourceOnly,
    effectiveValue: "18 avenue des Sports",
    sourceValue: "18 avenue des Sports",
  },
  city: { ...sourceOnly, effectiveValue: "Niort", sourceValue: "Niort" },
  postalCode: { ...sourceOnly, effectiveValue: "79100", sourceValue: "79100" },
  email: {
    ...sourceOnly,
    effectiveValue: "contact@example.invalid",
    sourceValue: "contact@example.invalid",
  },
  phone: { ...sourceOnly, effectiveValue: null, sourceValue: null },
  website: {
    ...sourceOnly,
    effectiveValue: "https://example.invalid",
    sourceValue: "https://example.invalid",
  },
};
const initial: SportingPresentationResponse = {
  id: resourceId,
  kind: "team",

  names,
  logo,
};
let client: QueryClient;
let publicClient = createQueryClient();
let stored:
  | SportingPresentationResponse
  | PoolPresentationResponse
  | DivisionResponse
  | DivisionListResponse = initial;
let permissions: AccountPermissionsResponse = account.permissions;
let mockMaintenance = false;
const environment = { ...process.env };

// Presentation routes start after common discovery has been explicitly completed.
/** Synthetic baseline HTTP peer; each scenario owns its changed network outcome. */
async function respond(
  url: RequestInfo | URL,
  _options?: RequestInit,
): Promise<Response> {
  if (String(url).endsWith("/contacts")) {
    return json(clubContacts);
  }
  return json(
    String(url).endsWith("/accounts/me") ? { ...account, permissions } : stored,
  );
}

beforeEach(async () => {
  jest
    .spyOn(ActionSheetIOS, "showActionSheetWithOptions")
    .mockImplementation(() => {});
  jest.spyOn(ActionSheetIOS, "dismissActionSheet").mockImplementation(() => {});
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

/** Selects the real private client with one-shot reads and no detached mutation GC timers in these scenarios. */
function PrivateQueries({ children }: Readonly<PropsWithChildren>) {
  const current = useQueryClient();
  useLayoutEffect(() => {
    client = current;
    current.setQueryDefaults([], { retry: false });
    current.setMutationDefaults([], { gcTime: Infinity });
  }, [current]);
  return children;
}

/** Real form, Query, identity and access owners; only native credentials/images and HTTP are controlled. */
async function renderEditor(
  kind: "club" | "team" | "pool" | "division" | "division-creation" = "team",
  peers?: ReactNode,
) {
  await renderRouter({
    _layout: () => (
      <QueryClientProvider client={publicClient}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <PrivateQueries>
                <AccountFeedbackProvider>
                  <Stack />
                  <SessionAction />
                </AccountFeedbackProvider>
              </PrivateQueries>
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>
    ),
    index: () => (
      <>
        {peers}
        {kind === "division-creation" ? (
          <CreateDivisionScreen />
        ) : (
          <PresentationScreen target={{ kind, id: resourceId }} />
        )}
      </>
    ),
  });
}

/** Exposes real session commands and current grants while native image choices are pending. */
function SessionAction() {
  const session = useAccountSession();
  const account = useCurrentAccount();
  return (
    <>
      <Text>
        {account.data?.permissions.manageSportingPresentation
          ? "Présentation autorisée"
          : "Présentation non autorisée"}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quitter la session"
        onPress={() => void session.clearCredentials()}
      >
        <Text>Quitter</Text>
      </Pressable>
    </>
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

it("initializes the fields and logo together when the first presentation arrives after mount", async () => {
  // Given
  const read = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, request) =>
    String(url).endsWith(`/teams/${resourceId}/presentation`)
      ? read.promise
      : respond(url, request),
  );
  await renderEditor();
  await screen.findByText("Présentation autorisée");
  expect(
    screen.queryByLabelText("Nom complet personnalisé"),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Ajouter un logo" }),
  ).not.toBeOnTheScreen();

  // When
  await act(() => read.resolve(json(initial)));

  // Then
  expect(await screen.findByDisplayValue("Current name")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Ajouter un logo" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  expect(
    screen.queryByText("Modifications non enregistrées"),
  ).not.toBeOnTheScreen();
});

it("starts a fresh draft and releases its logo when the business account changes under the same principal", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "Old draft",
  );
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      { uri: "file:///cache/ImagePicker/selected.png", width: 120, height: 60 },
    ],
  });
  await user.press(screen.getByRole("button", { name: "Ajouter un logo" }));
  await act(nativeImageChoiceAction("Choisir un logo"));
  await screen.findByRole("image", { name: "Miniature : Logo" });
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/accounts/me")
      ? json({ ...account, accountId: "00000000-0000-4000-8000-000000000002" })
      : respond(url),
  );

  // When
  await act(() =>
    client.refetchQueries({ queryKey: getGetMyAccountQueryKey(), exact: true }),
  );

  // Then
  expect(await screen.findByDisplayValue("Current name")).toBeOnTheScreen();
  expect(screen.queryByDisplayValue("Old draft")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("image", { name: "Miniature : Logo" }),
  ).not.toBeOnTheScreen();
  expect(mockFile.delete).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.every(([, request]) => request?.method === "GET"),
  ).toBe(true);
});

it.each([
  { scenario: "both names automatic", manualName: null },
  { scenario: "a new full name", manualName: "Chosen" },
])("saves a team logo with $scenario", async ({ manualName }) => {
  // Given
  const automaticNames = {
    ...names,
    manualName: null,
    effectiveName: names.sourceName,
    effectiveShortName: names.sourceName,
  };
  stored = { ...initial, names: automaticNames };
  const user = userEvent.setup();
  await renderEditor();
  const fullName = await screen.findByLabelText("Nom complet personnalisé");
  const shortName = screen.getByLabelText("Nom court personnalisé");
  expect(fullName).toHaveDisplayValue(names.sourceName);
  expect(shortName).toHaveDisplayValue(names.sourceName);
  expect(screen.getAllByHintText(names.sourceName)).toEqual([
    fullName,
    shortName,
  ]);
  if (manualName) {
    await user.clear(fullName);
    await user.type(fullName, manualName);
  }
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
  await user.press(screen.getByRole("button", { name: "Ajouter un logo" }));
  await act(nativeImageChoiceAction("Choisir un logo"));
  await screen.findByRole("image", { name: "Miniature : Logo" });
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PATCH") {
      stored = {
        ...initial,

        names: {
          ...automaticNames,
          manualName,
          effectiveName: manualName ?? names.sourceName,
        },
      };
    }
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
    manualName,
    manualShortName: null,
    logoAction: "replace",
  });
  expect(await (parts[1][1] as Blob).arrayBuffer()).toEqual(
    await mockFile.arrayBuffer(),
  );
});

it("restores known customized artwork without decoded bytes and clears only the selected name customization atomically", async () => {
  // Given
  const shortName = "VDR";
  const customizedNames = {
    ...names,
    manualShortName: shortName,
    effectiveShortName: shortName,
  };
  stored = {
    ...initial,
    names: customizedNames,
    logo: {
      ...logo,
      manualUrl: `/teams/${resourceId}/logo`,
      effectiveUrl: `/teams/${resourceId}/logo`,
    },
  };
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  expect(screen.getByLabelText("Nom court personnalisé")).toHaveDisplayValue(
    shortName,
  );
  expect(
    screen.queryByRole("image", { name: "Miniature : Logo" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.press(screen.getByRole("button", { name: "Modifier le logo" }));
  await act(nativeImageChoiceAction("Rétablir le logo automatique"));

  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PATCH") {
      stored = {
        ...initial,

        names: {
          ...customizedNames,
          manualName: null,
          effectiveName: names.sourceName,
        },
        logo,
      };
    }
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
    manualName: null,
    manualShortName: shortName,
    logoAction: "automatic",
  });
  expect(await screen.findByDisplayValue(names.sourceName)).toBeOnTheScreen();
  expect(screen.getByLabelText("Nom court personnalisé")).toHaveDisplayValue(
    shortName,
  );
});

it("keeps the accepted values behind the form read-error card when the following presentation read fails", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor();
  await user.clear(await screen.findByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "Accepted name",
  );
  let writes = 0;
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PATCH") {
      writes += 1;
      return Promise.resolve(
        json({
          ...initial,

          names: {
            ...names,
            manualName: "Accepted name",
            effectiveName: "Accepted name",
          },
        }),
      );
    }
    return String(url).endsWith("/presentation")
      ? Promise.resolve(json({ status: 503 }, 503))
      : respond(url, options);
  });

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await waitFor(() => expect(client.isFetching()).toBe(0));
  const queryKey = getGetTeamPresentationQueryKey(resourceId);
  await waitFor(() =>
    expect(client.getQueryState(queryKey)?.error).toMatchObject({
      status: 503,
    }),
  );
  expect(client.getQueryData(queryKey)).toMatchObject({
    names: { manualName: "Accepted name", effectiveName: "Accepted name" },
  });
  await screen.findByRole("button", { name: "Réessayer" });
  expect(screen.queryByDisplayValue("Accepted name")).not.toBeOnTheScreen();
  expect(
    screen.getByDisplayValue("Accepted name", { includeHiddenElements: true }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText("Modifications non enregistrées"),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Relire la présentation" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Enregistrer" }),
  ).not.toBeOnTheScreen();

  // When: Retry is a read and restores the already accepted form defaults.
  stored = {
    ...initial,

    names: {
      ...names,
      manualName: "Accepted name",
      effectiveName: "Accepted name",
    },
  };
  const saveAndFailRead = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PATCH"
      ? saveAndFailRead(url, options)
      : respond(url, options),
  );
  await user.press(screen.getByRole("button", { name: "Réessayer" }));
  await screen.findByRole("button", { name: "Enregistrer" });
  expect(writes).toBe(1);
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await waitFor(() => expect(writes).toBe(2));
  const secondWrite = mockFetch.mock.calls.filter(
    ([, options]) => options?.method === "PATCH",
  )[1][1];
  expect(
    JSON.parse(
      await ((secondWrite?.body as FormData).get("metadata") as Blob).text(),
    ),
  ).toMatchObject({ manualName: "Accepted name", logoAction: "keep" });
});

it("keeps inherited artwork editable while its read is pending without offering customization removal", async () => {
  // Given: the effective logo belongs to the automatic source, with no manual override.
  stored = {
    ...initial,
    logo: {
      ...logo,
      effectiveUrl: `/teams/${resourceId}/logo`,
      automaticUrl: `/teams/${resourceId}/logo`,
    },
  };
  const read = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, request) =>
    String(url).includes(`/teams/${resourceId}/logo`)
      ? read.promise
      : respond(url, request),
  );
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  expect(
    screen.getByRole("button", { name: "Modifier le logo" }),
  ).toBeEnabled();
  expect(screen.getByLabelText("Nom complet personnalisé")).toHaveProp(
    "editable",
    true,
  );

  // When
  await user.press(screen.getByRole("button", { name: "Modifier le logo" }));

  // Then
  expect(nativeImageChoiceLabels()).toEqual(["Choisir un logo", "Annuler"]);

  // When
  await act(nativeImageChoiceAction("Annuler"));
  await act(() => read.resolve(new Response(null, { status: 503 })));

  // Then: dismissal and a late media failure change neither the owner nor the draft.
  expect(await screen.findByDisplayValue("Current name")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Modifier le logo" }),
  ).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([, request]) => request?.method === "PATCH"),
  ).toBe(false);
});

it("clears a pool's custom short name without changing its automatic full name", async () => {
  // Given
  const poolNames = {
    ...names,
    effectiveName: names.sourceName,
    manualName: null,
    effectiveShortName: "Custom short",
    manualShortName: "Custom short",
  };
  stored = { id: resourceId, names: poolNames };
  const user = userEvent.setup();
  await renderEditor("pool");
  const fullName = await screen.findByLabelText("Nom complet personnalisé");
  const shortName = screen.getByLabelText("Nom court personnalisé");
  expect(fullName).toHaveDisplayValue(names.sourceName);
  expect(shortName).toHaveDisplayValue("Custom short");
  expect(screen.getAllByHintText(names.sourceName)).toEqual([
    fullName,
    shortName,
  ]);

  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PUT") {
      stored = {
        id: resourceId,

        names: {
          ...poolNames,
          manualShortName: null,
          effectiveShortName: names.sourceName,
        },
      };
    }
    return respond(url, options);
  });

  // When
  await user.clear(shortName);
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await waitFor(() =>
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen(),
  );
  const write = mockFetch.mock.calls.find(([, o]) => o?.method === "PUT");
  expect(JSON.parse(String(write?.[1]?.body))).toEqual({
    manualName: null,
    manualShortName: null,
  });
  expect(fullName).toHaveDisplayValue(names.sourceName);
  expect(shortName).toHaveDisplayValue(names.sourceName);
  expect(
    screen.queryByRole("button", { name: /Ajouter un logo|Modifier le logo/ }),
  ).not.toBeOnTheScreen();
  expect(screen.queryByLabelText("Adresse e-mail")).not.toBeOnTheScreen();
});

it("saves club presentation without a short-name field", async () => {
  // Given
  stored = { ...initial, kind: "club" };
  const user = userEvent.setup();
  await renderEditor("club");
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "Club chosen",
  );

  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PATCH") {
      stored = {
        ...initial,
        kind: "club",

        names: {
          ...names,
          manualName: "Club chosen",
          effectiveName: "Club chosen",
        },
      };
    }
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
    manualName: "Club chosen",
    logoAction: "keep",
  });
  expect(
    screen.queryByLabelText("Nom court personnalisé"),
  ).not.toBeOnTheScreen();
});

it("saves only edited contact fields and preloads the club's current name", async () => {
  // Given
  stored = {
    ...initial,
    kind: "club",
    names: { ...names, manualName: null, effectiveName: "Source name" },
  };
  let observedContacts: ClubContactsResponse = {
    ...clubContacts,
    city: {
      ...clubContacts.city,
      mode: "manual",
      manualValue: "Bessines",
      effectiveValue: "Bessines",
    },
  };
  mockFetch.mockImplementation((url, options) => {
    if (String(url).endsWith("/contacts")) {
      if (options?.method === "PATCH") {
        observedContacts = {
          ...observedContacts,
          postalCode: {
            mode: "manual",
            manualValue: "79000",
            effectiveValue: "79000",
            sourceValue: "79100",
          },
          email: {
            ...clubContacts.email,
            mode: "hidden",
            effectiveValue: null,
          },
        };
      }
      return Promise.resolve(json(observedContacts));
    }
    return respond(url, options);
  });
  const user = userEvent.setup();

  // When
  await renderEditor("club");

  // Then: the editor shows the accepted values before any write.
  const postalCode = await screen.findByLabelText("Code postal");
  const city = screen.getByLabelText("Commune");
  expect(screen.getByLabelText("Nom complet personnalisé")).toHaveDisplayValue(
    "Source name",
  );
  expect(screen.getByLabelText("Adresse")).toHaveDisplayValue(
    "18 avenue des Sports",
  );
  expect(city).toHaveDisplayValue("Bessines");
  expect(screen.getByLabelText("Téléphone")).toHaveDisplayValue("");
  expect(screen.getByLabelText("Site web")).toHaveDisplayValue(
    "https://example.invalid",
  );
  expect(postalCode).toHaveDisplayValue("79100");

  // When: the operator returns to the accepted manual town.
  await user.clear(city);
  await user.type(city, "Bessines");

  // Then
  expect(
    screen.queryByText("Modifications non enregistrées"),
  ).not.toBeOnTheScreen();

  // When
  await user.clear(postalCode);
  await user.type(postalCode, "79000");
  await user.clear(screen.getByLabelText("Adresse e-mail"));
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
  expect(String(writes[0]?.[0])).toMatch(/\/contacts$/);
  expect(JSON.parse(String(writes[0]?.[1]?.body))).toEqual({
    postalCode: { mode: "manual", value: "79000" },
    email: { mode: "hidden" },
  });
  expect(screen.getByLabelText("Code postal")).toHaveDisplayValue("79000");
  expect(screen.getByText("79100")).toBeOnTheScreen();
});

it("keeps only unacknowledged contact edits for retry after saving the club name", async () => {
  // Given
  stored = { ...initial, kind: "club" };
  let contactAttempts = 0;
  const acceptedContacts: ClubContactsResponse = {
    ...clubContacts,
    postalCode: {
      mode: "manual",
      manualValue: "79000",
      effectiveValue: "79000",
      sourceValue: "79100",
    },
  };
  mockFetch.mockImplementation((url, options) => {
    const path = String(url);
    if (path.endsWith("/contacts")) {
      if (options?.method === "PATCH" && ++contactAttempts === 1) {
        return Promise.resolve(
          json({ title: "Unavailable", status: 503 }, 503),
        );
      }
      return Promise.resolve(
        json(contactAttempts > 1 ? acceptedContacts : clubContacts),
      );
    }
    if (path.endsWith("/presentation") && options?.method === "PATCH") {
      stored = {
        ...initial,
        kind: "club",
        names: { ...names, manualName: "New name", effectiveName: "New name" },
      };
    }
    return respond(url, options);
  });
  const user = userEvent.setup();
  await renderEditor("club");
  const clubName = await screen.findByLabelText("Nom complet personnalisé");
  const postalCode = screen.getByLabelText("Code postal");
  await user.clear(clubName);
  await user.type(clubName, "New name");
  await user.clear(postalCode);
  await user.type(postalCode, "79000");

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await screen.findByText(
    "La présentation a été enregistrée. L’enregistrement des coordonnées n’a pas pu être confirmé.",
  );
  expect(screen.getByLabelText("Nom complet personnalisé")).toHaveDisplayValue(
    "New name",
  );
  expect(screen.getByLabelText("Code postal")).toHaveDisplayValue("79000");

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
  expect(
    writes.filter(([url]) => String(url).endsWith("/presentation")),
  ).toHaveLength(1);
  const contactWrites = writes.filter(([url]) =>
    String(url).endsWith("/contacts"),
  );
  expect(contactWrites).toHaveLength(2);
  expect(JSON.parse(String(contactWrites[1]?.[1]?.body))).toEqual({
    postalCode: { mode: "manual", value: "79000" },
  });
});

it("shows the failed contact read while presentation is pending and retries only contacts", async () => {
  // Given
  stored = { ...initial, kind: "club" };
  const presentationRead = Promise.withResolvers<Response>();
  let contactsAvailable = false;
  mockFetch.mockImplementation((url, options) => {
    const path = String(url);
    if (path.endsWith("/presentation")) {
      return presentationRead.promise;
    }
    if (path.endsWith("/contacts") && !contactsAvailable) {
      return Promise.resolve(json({ title: "Unavailable", status: 503 }, 503));
    }
    return respond(url, options);
  });
  const user = userEvent.setup();
  await renderEditor("club");
  const retry = await screen.findByRole("button", { name: "Réessayer" });

  // When
  contactsAvailable = true;
  mockFetch.mockClear();
  await user.press(retry);

  // Then
  await waitFor(() => {
    expect(
      screen.queryByRole("button", { name: "Réessayer" }),
    ).not.toBeOnTheScreen();
  });
  expect(mockFetch.mock.calls.map(([url]) => String(url))).toEqual([
    expect.stringMatching(/\/contacts$/),
  ]);
  expect(screen.queryByLabelText("Code postal")).not.toBeOnTheScreen();

  // When
  await act(() => presentationRead.resolve(json(stored)));

  // Then
  expect(await screen.findByLabelText("Code postal")).toHaveDisplayValue(
    "79100",
  );
});

it("retains source and absence choices through a failed contact read and retry", async () => {
  // Given
  stored = { ...initial, kind: "club" };
  let readUnavailable = false;
  let observedContacts: ClubContactsResponse = {
    ...clubContacts,
    postalCode: {
      mode: "manual",
      manualValue: "79000",
      effectiveValue: "79000",
      sourceValue: "79100",
    },
  };
  mockFetch.mockImplementation((url, options) => {
    if (!String(url).endsWith("/contacts")) {
      return respond(url, options);
    }
    if (options?.method === "PATCH") {
      observedContacts = {
        ...observedContacts,
        postalCode: {
          ...sourceOnly,
          sourceValue: observedContacts.postalCode.sourceValue,
          effectiveValue: observedContacts.postalCode.sourceValue,
        },
        phone: { ...clubContacts.phone, mode: "hidden" },
      };
    } else if (readUnavailable) {
      return Promise.resolve(json({ type: "about:blank", status: 503 }, 503));
    }
    return Promise.resolve(json(observedContacts));
  });
  const user = userEvent.setup();
  await renderEditor("club");
  await screen.findByDisplayValue("79000");

  // When
  await user.press(
    screen.getByRole("button", { name: "Reprendre FFvolley pour Code postal" }),
  );
  await user.press(
    screen.getByRole("button", { name: "Laisser vide pour Téléphone" }),
  );
  readUnavailable = true;
  await act(async () =>
    client.refetchQueries({
      queryKey: [...getGetClubContactsQueryKey(resourceId), account.accountId],
      exact: true,
    }),
  );

  // Then: only the read failure is visible until the operator retries.
  const retry = await screen.findByRole("button", { name: "Réessayer" });
  expect(screen.queryByLabelText("Code postal")).not.toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Nom complet personnalisé"),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Enregistrer" }),
  ).not.toBeOnTheScreen();

  // When: a newer observation arrives while the correction still applies on the server.
  readUnavailable = false;
  observedContacts = {
    ...observedContacts,
    postalCode: { ...observedContacts.postalCode, sourceValue: "79200" },
  };
  await user.press(retry);

  // Then
  expect(await screen.findByLabelText("Code postal")).toHaveDisplayValue(
    "79200",
  );
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
  ).toHaveLength(0);

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then: the draft retains both intents and the server resolves its current source.
  await waitFor(() =>
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen(),
  );
  expect(screen.getByLabelText("Code postal")).toHaveDisplayValue("79200");
  const writes = mockFetch.mock.calls.filter(
    ([, options]) => options?.method === "PATCH",
  );
  expect(writes).toHaveLength(1);
  expect(String(writes[0]?.[0])).toMatch(/\/contacts$/);
  expect(JSON.parse(String(writes[0]?.[1]?.body))).toEqual({
    postalCode: { mode: "source" },
    phone: { mode: "hidden" },
  });
});

it("keeps acknowledged contact changes saved while a refused read masks the editor", async () => {
  // Given
  stored = { ...initial, kind: "club" };
  const pendingSave = Promise.withResolvers<Response>();
  const accepted: ClubContactsResponse = {
    ...clubContacts,
    postalCode: {
      mode: "manual",
      effectiveValue: "79000",
      manualValue: "79000",
      sourceValue: "79100",
    },
  };
  let blockedRead = false;
  let current = clubContacts;
  mockFetch.mockImplementation((url, options) => {
    if (!String(url).endsWith("/contacts")) {
      return respond(url, options);
    }
    if (options?.method === "PATCH") {
      return pendingSave.promise;
    }
    return Promise.resolve(
      blockedRead ? json({ status: 403 }, 403) : json(current),
    );
  });
  const user = userEvent.setup();
  await renderEditor("club");
  await user.clear(await screen.findByLabelText("Code postal"));
  await user.type(screen.getByLabelText("Code postal"), "79000");

  // When: a refused read withdraws the contacts while the write is pending.
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
    ).toHaveLength(1),
  );
  const queryKey = [
    ...getGetClubContactsQueryKey(resourceId),
    account.accountId,
  ];
  blockedRead = true;
  await act(async () => client.refetchQueries({ queryKey, exact: true }));
  await screen.findByRole("button", { name: "Réessayer" });
  await act(async () => pendingSave.resolve(json(accepted)));

  // Then: the acknowledgement does not readmit the refused data or reveal the editor.
  expect(client.getQueryData(queryKey)).toBeNull();
  expect(screen.queryByLabelText("Code postal")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Enregistrer" }),
  ).not.toBeOnTheScreen();

  // When: a currently authorized read sees another operator's later correction.
  blockedRead = false;
  current = {
    ...accepted,
    postalCode: {
      ...accepted.postalCode,
      effectiveValue: "79200",
      manualValue: "79200",
    },
  };
  await user.press(await screen.findByRole("button", { name: "Réessayer" }));

  // Then: the earlier acknowledged draft is clean, and no write is replayed.
  expect(await screen.findByLabelText("Code postal")).toHaveDisplayValue(
    "79200",
  );
  expect(
    screen.queryByText("Modifications non enregistrées"),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
  ).toHaveLength(1);
});

it("validates and saves division edits after cancelling logo selection", async () => {
  // Given
  stored = {
    id: resourceId,

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
    if (options?.method === "PATCH") {
      stored = {
        id: resourceId,

        name: "Division",
        color: "#abcdef",
        gradient: ["#111111", "#222222", "#333333"],
        logo,
        active: false,
      };
    }
    return respond(url, options);
  });

  // When: the picker returns its default cancellation.
  await user.press(screen.getByRole("button", { name: "Ajouter un logo" }));
  await act(nativeImageChoiceAction("Choisir un logo"));

  // Then
  expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
    expect.objectContaining({
      allowsEditing: true,
      aspect: [1, 1],
      allowsMultipleSelection: false,
    }),
  );
  expect(screen.getByLabelText("Couleur HEX")).toHaveDisplayValue("invalid");

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
    name: "Division",
    color: "#abcdef",
    gradient: ["#111111", "#222222", "#333333"],
    logoAction: "keep",
  });
});

it.each(["network", "schema"])(
  "allows an explicit save with retained input after a %s failure and a newer read",
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
        if (outcome === "network") {
          throw new TypeError("Lost response");
        }
        if (outcome === "schema") {
          return json({});
        }
      }
      return json({
        ...initial,

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
    await screen.findByText(TECHNICAL_ERROR);
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(
      screen.queryByRole("button", { name: "Relire la présentation" }),
    ).not.toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
    expect(
      screen.getByLabelText("Nom complet personnalisé"),
    ).toHaveDisplayValue("My draft");

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));

    // Then: a new write is explicit and keeps the original target and draft.
    await waitFor(() =>
      expect(
        mockFetch.mock.calls.filter(([, o]) => o?.method === "PATCH"),
      ).toHaveLength(2),
    );
    const body = mockFetch.mock.calls.filter(
      ([, options]) => options?.method === "PATCH",
    )[1][1]?.body as FormData;
    expect(JSON.parse(await (body.get("metadata") as Blob).text())).toEqual({
      manualName: "My draft",
      manualShortName: null,
      logoAction: "keep",
    });
    expect(screen.getByDisplayValue("My draft")).toBeOnTheScreen();
  },
);

it("keeps an unknown conflict as an ordinary failure with an editable draft", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "My draft",
  );
  mockFetch.mockImplementation(async (url, options) =>
    options?.method === "PATCH"
      ? json(
          {
            type: "urn:blockout:problem:conflict",
            title: "Conflict",
            status: 409,
          },
          409,
        )
      : respond(url, options),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  expect(await screen.findByText(TECHNICAL_ERROR)).toBeOnTheScreen();
  expect(screen.getByDisplayValue("My draft")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Relire la présentation" }),
  ).not.toBeOnTheScreen();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
  );
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
  ).toHaveLength(1);
});

it.each(["pending", "failed"] as const)(
  "retains its draft through a %s settlement read and only resends after a visible explicit save",
  async (phase) => {
    // Given
    const user = userEvent.setup();
    await renderEditor();
    await screen.findByDisplayValue("Current name");
    await user.clear(screen.getByLabelText("Nom complet personnalisé"));
    await user.type(
      screen.getByLabelText("Nom complet personnalisé"),
      "My draft",
    );
    const refresh = Promise.withResolvers<void>();
    let writes = 0;
    mockFetch.mockImplementation(async (url, options) => {
      if (options?.method === "PATCH") {
        writes++;
        throw new TypeError("Lost save response");
      }
      if (writes > 0 && String(url).endsWith("/presentation")) {
        await refresh.promise;
        return json(
          { type: "urn:blockout:problem:unavailable", status: 503 },
          503,
        );
      }
      return respond(url, options);
    });

    // When
    try {
      await user.press(screen.getByRole("button", { name: "Enregistrer" }));
      await screen.findByText(TECHNICAL_ERROR);
      if (phase === "failed") {
        refresh.resolve();
        await waitFor(() => expect(client.isFetching()).toBe(0));
      }

      // Then
      if (phase === "failed") {
        await screen.findByRole("button", { name: "Réessayer" });
        expect(
          screen.queryByRole("button", { name: "Enregistrer" }),
        ).not.toBeOnTheScreen();
        expect(
          screen.getByDisplayValue("My draft", { includeHiddenElements: true }),
        ).toBeOnTheScreen();
        const failedSave = mockFetch.getMockImplementation()!;
        mockFetch.mockImplementation((url, options) =>
          options?.method === "PATCH"
            ? failedSave(url, options)
            : respond(url, options),
        );
        await user.press(screen.getByRole("button", { name: "Réessayer" }));
        await screen.findByRole("button", { name: "Enregistrer" });
        expect(writes).toBe(1);
      }
      expect(screen.getByDisplayValue("My draft")).toBeOnTheScreen();
      expect(screen.getByLabelText("Nom complet personnalisé")).toHaveProp(
        "editable",
        true,
      );
      expect(
        screen.queryByRole("button", { name: "Relire la présentation" }),
      ).not.toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
      expect(writes).toBe(1);

      // When: only this new press sends the retained draft again.
      await user.press(screen.getByRole("button", { name: "Enregistrer" }));

      // Then
      await waitFor(() => expect(writes).toBe(2));
      expect(screen.getByDisplayValue("My draft")).toBeOnTheScreen();
      const latest = mockFetch.mock.calls
        .filter(([, options]) => options?.method === "PATCH")
        .at(-1);
      expect(
        JSON.parse(
          await (
            (latest?.[1]?.body as FormData).get("metadata") as Blob
          ).text(),
        ),
      ).toMatchObject({ manualName: "My draft" });
    } finally {
      refresh.resolve();
      await waitFor(() => expect(client.isFetching()).toBe(0));
    }
  },
);

it("shows the current presentation error without restoring refused data or losing the draft", async () => {
  // Given: the retained form owns the draft; real Query and HTTP decoding own its refusal.
  const user = userEvent.setup();
  await renderEditor();
  await user.clear(await screen.findByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "My draft",
  );
  let status = 403;
  const queryKey = getGetTeamPresentationQueryKey(resourceId);
  mockFetch.mockImplementation((url, options) =>
    String(url).endsWith("/presentation") && status !== 200
      ? Promise.resolve(json({ type: "about:blank", status }, status))
      : respond(url, options),
  );

  // When
  await act(async () => client.refetchQueries({ queryKey, exact: true }));
  await screen.findByRole("button", { name: "Réessayer" });
  expect(
    screen.queryByRole("button", { name: "Enregistrer" }),
  ).not.toBeOnTheScreen();
  status = 503;
  await act(async () => client.refetchQueries({ queryKey, exact: true }));

  // Then: a technical error cannot restore the resource's withdrawn authority.
  expect(client.getQueryState(queryKey)?.error).toMatchObject({
    kind: "http",
    status: 503,
  });
  expect(client.getQueryData(queryKey)).toBeNull();
  expect(
    await screen.findByRole("button", { name: "Réessayer" }),
  ).toBeEnabled();
  await screen.findByRole("button", { name: "Réessayer" });
  expect(
    screen.queryByRole("button", { name: "Enregistrer" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.getByDisplayValue("My draft", { includeHiddenElements: true }),
  ).toBeOnTheScreen();

  // When: cancellation of a delayed read keeps Query's current error and the same draft.
  const delayed = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) =>
    String(url).endsWith("/presentation")
      ? delayed.promise
      : respond(url, options),
  );
  let reading: Promise<void> | undefined;
  await act(async () => {
    reading = client.refetchQueries({ queryKey, exact: true });
  });
  await waitFor(() =>
    expect(client.getQueryState(queryKey)?.fetchStatus).toBe("fetching"),
  );
  await act(async () => {
    await client.cancelQueries({ queryKey, exact: true });
    delayed.resolve(json({ status: 503 }, 503));
    await reading;
  });

  // Then
  expect(client.getQueryState(queryKey)?.error).toMatchObject({
    kind: "http",
    status: 503,
  });
  expect(client.getQueryData(queryKey)).toBeNull();
  expect(
    screen.getByDisplayValue("My draft", { includeHiddenElements: true }),
  ).toBeOnTheScreen();

  // When: a successful current read restores authority without replacing dirty input.
  mockFetch.mockImplementation(respond);
  await act(async () => client.refetchQueries({ queryKey, exact: true }));

  // Then
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
  );
  expect(screen.getByDisplayValue("My draft")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
  ).toHaveLength(0);
});

it("keeps withdrawn data and its current error while an earlier accepted save invalidates the read", async () => {
  // Given
  const user = userEvent.setup();
  const save = Promise.withResolvers<Response>();
  const pendingRead = Promise.withResolvers<Response>();
  await renderEditor();
  await user.clear(await screen.findByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "Submitted draft",
  );
  let status = 200;
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PATCH") {
      return save.promise;
    }
    if (String(url).endsWith("/presentation")) {
      if (status === 0) {
        return pendingRead.promise;
      }
      if (status !== 200) {
        return Promise.resolve(json({ status }, status));
      }
    }
    return respond(url, options);
  });
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  const queryKey = getGetTeamPresentationQueryKey(resourceId);
  status = 403;
  await act(async () => client.refetchQueries({ queryKey, exact: true }));
  status = 503;
  await act(async () => client.refetchQueries({ queryKey, exact: true }));

  // When
  status = 0;
  await act(async () =>
    save.resolve(
      json({
        ...initial,

        names: { ...names, manualName: "Submitted draft" },
      }),
    ),
  );
  await waitFor(() =>
    expect(client.getQueryState(queryKey)?.fetchStatus).toBe("fetching"),
  );

  // Then
  expect(client.getQueryData(queryKey)).toBeNull();
  expect(client.getQueryState(queryKey)?.error).toMatchObject({ status: 503 });
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Enregistrer" }),
  ).not.toBeOnTheScreen();

  await act(async () => {
    await client.cancelQueries({ queryKey, exact: true });
    pendingRead.resolve(json({ status: 503 }, 503));
  });
});

it("keeps a dirty draft and prepared logo during background refetch", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "My draft",
  );
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      { uri: "file:///cache/ImagePicker/selected.png", width: 120, height: 60 },
    ],
  });
  await user.press(screen.getByRole("button", { name: "Ajouter un logo" }));
  await act(nativeImageChoiceAction("Choisir un logo"));
  await screen.findByRole("image", { name: "Miniature : Logo" });
  stored = {
    ...initial,

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
  expect(
    screen.getByRole("image", { name: "Miniature : Logo" }),
  ).toBeOnTheScreen();
  expect(mockFile.delete).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Relire la présentation" }),
  ).not.toBeOnTheScreen();

  // When
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PATCH"
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
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then: ordinary refusal preserves the draft and its prepared file for a later send.
  await screen.findByText(TECHNICAL_ERROR);
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  const body = mockFetch.mock.calls.find(
    ([, options]) => options?.method === "PATCH",
  )?.[1]?.body as FormData;
  expect(JSON.parse(await (body.get("metadata") as Blob).text())).toMatchObject(
    { manualName: "My draft", logoAction: "replace" },
  );
  expect(await (body.get("image") as Blob).arrayBuffer()).toEqual(
    await mockFile.arrayBuffer(),
  );
  expect(screen.getByDisplayValue("My draft")).toBeOnTheScreen();
  expect(mockFile.delete).not.toHaveBeenCalled();
});

it("keeps optional logo failure at its fallback after explicit refresh while preserving the editable draft", async () => {
  // Given: presentation is authorized and usable while its optional first logo read fails silently.
  stored = {
    ...initial,
    logo: { ...logo, effectiveUrl: `/teams/${resourceId}/logo` },
  };
  mockFetch.mockImplementation(async (url, request) =>
    String(url).includes(`/teams/${resourceId}/logo`)
      ? json({ title: "Logo unavailable", status: 503 }, 503)
      : respond(url, request),
  );
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByRole("image", { name: "Logo indisponible" });
  expect(screen.queryByText(TECHNICAL_ERROR)).not.toBeOnTheScreen();
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "Refresh draft",
  );
  mockFetch.mockClear();

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await waitFor(() =>
    expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy(),
  );
  expect(
    screen.getByRole("image", { name: "Logo indisponible" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText(TECHNICAL_ERROR)).not.toBeOnTheScreen();
  expect(screen.getByDisplayValue("Refresh draft")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      String(url).includes(`/teams/${resourceId}/logo`),
    ),
  ).toHaveLength(1);
  expect(
    mockFetch.mock.calls.every(([, request]) => request?.method === "GET"),
  ).toBe(true);
});

it.each([403, 404])(
  "refreshes the displayed logo, retaining technical failures but removing refused artwork (HTTP %i) until a successful read",
  async (refusedStatus) => {
    // Given
    stored = {
      ...initial,
      logo: { ...logo, effectiveUrl: `/teams/${resourceId}/logo` },
    };
    const previousReader = Object.getOwnPropertyDescriptor(
      globalThis,
      "FileReader",
    );

    /** Controls only binary-to-URI conversion; the actual generated transport and Query owners remain mounted. */
    class LogoReader {
      result = "data:image/png;base64,sporting-logo";
      onload?: () => void;

      /** Makes an accepted binary response observable in the semantic thumbnail. */
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
      if (!String(url).includes(`/teams/${resourceId}/logo`)) {
        return respond(url, options);
      }
      return logoStatus === 200
        ? new Response(mockFile, { headers: { "Content-Type": "image/png" } })
        : json({ title: "Logo unavailable", status: logoStatus }, logoStatus);
    });
    try {
      const user = userEvent.setup();
      await renderEditor();
      await screen.findByRole("image", { name: "Miniature : Logo" });
      await user.clear(screen.getByLabelText("Nom complet personnalisé"));
      await user.type(
        screen.getByLabelText("Nom complet personnalisé"),
        "Local name",
      );

      // When
      logoStatus = 503;
      await fireEvent(
        screen.getByLabelText("Actualiser les données"),
        "refresh",
      );

      // Then
      await waitFor(() =>
        expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy(),
      );
      expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
      expect(
        screen.getByRole("image", { name: "Miniature : Logo" }),
      ).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
      expect(screen.getByDisplayValue("Local name")).toBeOnTheScreen();

      // When
      logoStatus = refusedStatus;
      await fireEvent(
        screen.getByLabelText("Actualiser les données"),
        "refresh",
      );

      // Then
      await waitFor(() =>
        expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy(),
      );
      expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
      expect(screen.queryByText("Une erreur est survenue")).toBeNull();
      await waitFor(() =>
        expect(
          screen.queryByRole("image", { name: "Miniature : Logo" }),
        ).not.toBeOnTheScreen(),
      );
      expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
      expect(screen.getByDisplayValue("Local name")).toBeEnabled();

      // When
      logoStatus = 503;
      await fireEvent(
        screen.getByLabelText("Actualiser les données"),
        "refresh",
      );
      await waitFor(() => expect(client.isFetching()).toBe(0));

      // Then
      expect(screen.queryByText("Une erreur est survenue")).toBeNull();
      const logoQueryKey = [
        ...getGetTeamLogoQueryKey(resourceId, { selection: "effective" }),
      ];
      expect(client.getQueryData(logoQueryKey)).toBeNull();
      expect(client.getQueryState(logoQueryKey)?.error).toMatchObject({
        status: 503,
      });
      await waitFor(() =>
        expect(
          screen.queryByRole("image", { name: "Miniature : Logo" }),
        ).not.toBeOnTheScreen(),
      );

      // When
      logoStatus = 200;
      await fireEvent(
        screen.getByLabelText("Actualiser les données"),
        "refresh",
      );

      // Then
      expect(
        await screen.findByRole("image", { name: "Miniature : Logo" }),
      ).toBeOnTheScreen();
      expect(screen.queryByText("Une erreur est survenue")).toBeNull();

      // When
      jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
        canceled: false,
        assets: [{ uri: "file:///picker.png", width: 120, height: 60 }],
      });
      await user.press(
        screen.getByRole("button", { name: "Modifier le logo" }),
      );
      await act(nativeImageChoiceAction("Choisir un logo"));
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Enregistrer" }),
        ).toBeEnabled(),
      );
      logoStatus = refusedStatus;
      mockFetch.mockClear();
      await fireEvent(
        screen.getByLabelText("Actualiser les données"),
        "refresh",
      );
      await waitFor(() => expect(client.isFetching()).toBe(0));

      // Then
      expect(
        screen.getByRole("image", { name: "Miniature : Logo" }),
      ).toBeOnTheScreen();
      expect(screen.getByDisplayValue("Local name")).toBeOnTheScreen();
      expect(
        mockFetch.mock.calls.some(([url]) =>
          String(url).includes(`/teams/${resourceId}/logo`),
        ),
      ).toBe(false);
    } finally {
      if (previousReader) {
        Object.defineProperty(globalThis, "FileReader", previousReader);
      } else {
        Reflect.deleteProperty(globalThis, "FileReader");
      }
    }
  },
);

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

it("shows accepted division bytes after releasing the submitted creation logo", async () => {
  // Given: the picker, owned files and binary conversion are controlled native boundaries.
  permissions = { manageDivisionLifecycle: true };
  const created = {
    id: resourceId,

    name: "Division with logo",
    color: "#245FD8",
    gradient: null,
    logo: {
      ...logo,
      manualUrl: `/divisions/${resourceId}/logo`,
      effectiveUrl: `/divisions/${resourceId}/logo`,
    },
    active: true,
  };
  const previousReader = Object.getOwnPropertyDescriptor(
    globalThis,
    "FileReader",
  );

  class LogoReader {
    result = "data:image/png;base64,accepted-division-logo";
    onload?: () => void;

    readAsDataURL() {
      this.onload?.();
    }
  }

  Object.defineProperty(globalThis, "FileReader", {
    configurable: true,
    value: LogoReader,
  });
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "POST") {
      return Promise.resolve(json(created, 201));
    }
    if (String(url).endsWith(`/divisions/${resourceId}/logo`)) {
      return Promise.resolve(
        new Response(mockFile, { headers: { "Content-Type": "image/png" } }),
      );
    }
    return respond(url, options);
  });
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///picker.png", width: 120, height: 120 }],
  });
  try {
    const user = userEvent.setup();
    await renderEditor("division-creation");
    await user.type(
      await screen.findByLabelText("Nom de la division"),
      created.name,
    );
    await user.press(screen.getByRole("button", { name: "Ajouter un logo" }));
    await act(nativeImageChoiceAction("Choisir un logo"));
    await screen.findByRole("image", { name: "Miniature : Logo" });
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        allowsEditing: true,
        aspect: [1, 1],
        allowsMultipleSelection: false,
      }),
    );
    expect(
      mockFetch.mock.calls.some(([, request]) => request?.method === "POST"),
    ).toBe(false);

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));

    // Then
    await screen.findByRole("button", { name: "Voir les divisions" });
    await waitFor(() => expect(mockFile.delete).toHaveBeenCalledTimes(1));
    const logoQueryKey = getGetDivisionLogoQueryKey(resourceId);
    await waitFor(() =>
      expect(client.getQueryData(logoQueryKey)).toBe(
        "data:image/png;base64,accepted-division-logo",
      ),
    );
    expect(
      await screen.findByRole("image", { name: "Miniature : Logo" }),
    ).toBeOnTheScreen();
    expect(client.getQueryData(getGetDivisionQueryKey(resourceId))).toEqual(
      created,
    );
  } finally {
    if (previousReader) {
      Object.defineProperty(globalThis, "FileReader", previousReader);
    } else {
      Reflect.deleteProperty(globalThis, "FileReader");
    }
  }
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

it("hides the retained draft and drops a held native selection when the current action grant is withdrawn", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  await user.clear(screen.getByLabelText("Nom complet personnalisé"));
  await user.type(
    screen.getByLabelText("Nom complet personnalisé"),
    "My draft",
  );
  const selection = Promise.withResolvers<ImagePicker.ImagePickerResult>();
  jest
    .mocked(ImagePicker.launchImageLibraryAsync)
    .mockReturnValue(selection.promise);
  await user.press(screen.getByRole("button", { name: "Ajouter un logo" }));
  await act(nativeImageChoiceAction("Choisir un logo"));
  permissions = { manageCollection: true };

  // When
  await act(async () =>
    client.refetchQueries({
      predicate: ({ queryKey }) =>
        JSON.stringify(queryKey).includes("/accounts/me"),
    }),
  );

  await screen.findByText("Présentation non autorisée");
  await act(() =>
    selection.resolve({
      canceled: false,
      assets: [
        { uri: "file:///cache/ImagePicker/late.png", width: 120, height: 60 },
      ],
    }),
  );

  // Then
  await screen.findByRole("alert", { name: "Une erreur est survenue" });
  expect(
    screen.queryByRole("button", { name: "Enregistrer" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.getByLabelText("Nom complet personnalisé", {
      includeHiddenElements: true,
    }),
  ).toHaveDisplayValue("My draft");
  expect(
    screen.queryByRole("image", { name: "Miniature : Logo" }),
  ).not.toBeOnTheScreen();
  expect(mockPickedFile.delete).toHaveBeenCalledTimes(1);
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
  await user.press(screen.getByRole("button", { name: "Ajouter un logo" }));
  await act(nativeImageChoiceAction("Choisir un logo"));

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

/** Mounts real root/operational layouts with every declared route; unrelated destinations remain probes. */
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
      "(operations)/administration/mapping/index": () => null,
      "(operations)/administration/mapping/[packId]": () => null,
      "(operations)/administration/mapping/filters": () => null,
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
        account.data?.permissions.manageSportingPresentation
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
  await user.press(
    await screen.findByRole("button", { name: "Modifier l’équipe" }),
  );

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
  await user.press(screen.getByRole("button", { name: "Ajouter un logo" }));
  await act(nativeImageChoiceAction("Choisir un logo"));
  await screen.findByRole("image", { name: "Miniature : Logo" });
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
  await screen.findByRole("button", { name: "Modifier l’équipe" });
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
  await user.press(
    await screen.findByRole("button", { name: "Modifier l’équipe" }),
  );
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
  await user.press(screen.getByRole("button", { name: "Ajouter un logo" }));
  await act(nativeImageChoiceAction("Choisir un logo"));
  await screen.findByRole("image", { name: "Miniature : Logo" });

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
  await user.press(
    await screen.findByRole("button", { name: "Modifier l’équipe" }),
  );

  // Then
  expect(
    await screen.findByLabelText("Nom complet personnalisé"),
  ).toHaveDisplayValue("Current name");
  expect(
    screen.queryByRole("image", { name: "Miniature : Logo" }),
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
  await act(async () => saveResponse.resolve(json({ ...initial })));

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

it("opens without a catalogue read and directly creates an active division with a stable accepted baseline", async () => {
  // Given
  permissions = { manageDivisionLifecycle: true };
  stored = { items: [] };
  jest.spyOn(Alert, "alert");
  const initialFetch = respond;
  const created = {
    id: resourceId,

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
  expect(
    mockFetch.mock.calls.filter(([url]) =>
      String(url).includes("/administration/divisions"),
    ),
  ).toHaveLength(0);
  await user.clear(screen.getByLabelText("Nom de la division"));
  await user.type(screen.getByLabelText("Nom de la division"), "National 2");
  await user.clear(screen.getByLabelText("Couleur HEX"));
  await user.type(screen.getByLabelText("Couleur HEX"), "#123456");

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  await screen.findByRole("button", { name: "Voir les divisions" });
  expect(screen.getByLabelText("Nom de la division")).toHaveDisplayValue(
    "National 2",
  );
  expect(screen.getByLabelText("Couleur HEX")).toHaveDisplayValue("#123456");
  expect(Alert.alert).not.toHaveBeenCalled();
  const divisionRequests = mockFetch.mock.calls.filter(([url]) =>
    new URL(String(url)).pathname.startsWith("/administration/divisions"),
  );
  expect(divisionRequests).toEqual([
    [
      "https://api.example.invalid/administration/divisions",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
    ],
  ]);
  const metadata = (divisionRequests[0][1]?.body as FormData).get(
    "metadata",
  ) as Blob;
  expect(metadata.type).toBe("application/json");
  expect(JSON.parse(await metadata.text())).toEqual({
    name: "National 2",
    color: "#123456",
    gradient: null,
    logoAction: "keep",
  });
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
});

it.each([
  {
    status: 409,
    type: "conflict",
    title: "Conflict",
    feedback: "Ce nom de division est déjà utilisé.",
  },
  {
    status: 503,
    type: "unavailable",
    title: "Service Unavailable",
    feedback: TECHNICAL_ERROR,
  },
])(
  "retains creation input after HTTP $status without proposing an unavailable reread",
  async ({ status, type, title, feedback }) => {
    // Given
    permissions = { manageDivisionLifecycle: true };
    stored = { items: [] };
    mockFetch.mockImplementation((url, options) =>
      options?.method === "POST"
        ? Promise.resolve(
            json(
              {
                type: `urn:blockout:problem:${type}`,
                title,
                status,
              },
              status,
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

    // Then
    await screen.findByText(feedback);
    expect(
      screen.queryByRole("button", { name: "Réessayer" }),
    ).not.toBeOnTheScreen();
    expect(screen.getByLabelText("Nom de la division")).toHaveDisplayValue(
      "National 2",
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
    );
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(1);
  },
);

it("keeps lifecycle independent at the end of the division editor for a lifecycle-only operator", async () => {
  // Given
  permissions = { manageDivisionLifecycle: true };
  const division = {
    id: resourceId,

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
    json({ ...division, active: false }),
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
      body: JSON.stringify({ active: false }),
    }),
  );
  expect(
    screen.queryByRole("button", { name: "Enregistrer" }),
  ).not.toBeOnTheScreen();
});

it("suspends lifecycle-only commands after a missing division read until the resource is read successfully", async () => {
  // Given: lifecycle authority remains present independently of presentation permission.
  permissions = { manageDivisionLifecycle: true };
  const division = {
    id: resourceId,

    name: "National 2",
    color: "#123456",
    gradient: null,
    logo,
    active: true,
  };
  stored = division;
  const user = userEvent.setup();
  await renderEditor("division");
  await screen.findByRole("button", { name: "Désactiver la division" });
  jest.spyOn(Alert, "alert");
  let status = 404;
  const queryKey = getGetDivisionQueryKey(resourceId);
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PUT") {
      stored = { ...division, active: false };
      return Promise.resolve(json(stored));
    }
    return String(url).endsWith(`/divisions/${resourceId}`) && status !== 200
      ? Promise.resolve(json({ type: "about:blank", status }, status))
      : respond(url, options);
  });

  // When: target absence is established, then only a technical failure is received.
  await act(async () => client.refetchQueries({ queryKey, exact: true }));
  await screen.findByRole("button", { name: "Réessayer" });
  expect(
    screen.queryByRole("button", { name: "Désactiver la division" }),
  ).not.toBeOnTheScreen();
  status = 503;
  await act(async () => client.refetchQueries({ queryKey, exact: true }));
  expect(
    screen.queryByRole("button", { name: "Désactiver la division" }),
  ).not.toBeOnTheScreen();

  // Then: the retained lifecycle grant cannot authorize this refused target.
  expect(client.getQueryState(queryKey)?.error).toMatchObject({ status: 503 });
  expect(client.getQueryData(queryKey)).toBeNull();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(0);
  expect(Alert.alert).not.toHaveBeenCalled();

  // When: only a successful current resource read restores the ordinary action.
  status = 200;
  await act(async () => client.refetchQueries({ queryKey, exact: true }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Désactiver la division" }),
    ).toBeEnabled(),
  );
  await user.press(
    screen.getByRole("button", { name: "Désactiver la division" }),
  );
  await act(async () => nativeAlertAction("Désactiver")());

  // Then
  await screen.findByRole("button", { name: "Réactiver la division" });
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(1);
  expect(
    screen.queryByRole("button", { name: "Enregistrer" }),
  ).not.toBeOnTheScreen();
});

it("preserves unsaved presentation values while an independent activity response changes division activity", async () => {
  // Given
  permissions = {
    manageSportingPresentation: true,
    manageDivisionLifecycle: true,
  };
  const division = {
    id: resourceId,

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
      stored = { ...division, active: false };
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
    { name: "Unsaved presentation" },
  );
  expect(
    screen.queryByRole("button", { name: "Désactiver la division" }),
  ).not.toBeOnTheScreen();
});

it("restores automatic division paint without sending a separate color or lifecycle command", async () => {
  // Given
  stored = {
    id: resourceId,

    name: "Division",
    color: "#123456",
    gradient: ["#111111", "#222222", "#333333"],
    logo,
    active: false,
  };
  const user = userEvent.setup();
  await renderEditor("division");

  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "PATCH") {
      stored = {
        id: resourceId,

        name: "Division",
        color: "#123456",
        gradient: null,
        logo,
        active: false,
      };
    }
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
    { color: "#123456", gradient: null },
  );
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PUT"),
  ).toBe(false);
});

it("preserves an empty invalid gradient stop when another stop changes", async () => {
  // Given
  stored = {
    id: resourceId,

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
  await user.press(screen.getByRole("button", { name: "Ajouter un logo" }));
  await act(nativeImageChoiceAction("Choisir un logo"));
  await screen.findByRole("image", { name: "Miniature : Logo" });

  // When
  await user.press(screen.getByRole("button", { name: "Modifier le logo" }));
  await act(nativeImageChoiceAction("Rétablir le logo automatique"));

  // Then
  expect(mockFile.delete).toHaveBeenCalledTimes(1);
  expect(mockPickedFile.delete).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByRole("image", { name: "Miniature : Logo" }),
  ).not.toBeOnTheScreen();
});

it.each([
  { kind: "team", method: "PATCH" },
  { kind: "division-creation", method: "POST" },
] as const)(
  "keeps a sent logo until $method settles after logout",
  async ({ kind, method }) => {
    // Given
    const user = userEvent.setup();
    permissions = {
      manageSportingPresentation: true,
      manageDivisionLifecycle: true,
    };
    await renderEditor(kind);
    const originalClient = client;
    const created = {
      id: resourceId,
      name: "New division",
      color: "#245FD8",
      gradient: null,
      logo,
      active: true,
    };
    if (kind === "division-creation") {
      await user.type(
        await screen.findByLabelText("Nom de la division"),
        created.name,
      );
    } else {
      await screen.findByDisplayValue("Current name");
    }
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [
        { uri: "file:///cache/ImagePicker/source.png", width: 120, height: 60 },
      ],
    });
    await user.press(screen.getByRole("button", { name: "Ajouter un logo" }));
    await act(nativeImageChoiceAction("Choisir un logo"));
    await screen.findByRole("image", { name: "Miniature : Logo" });
    const response = Promise.withResolvers<Response>();
    mockFetch.mockImplementation((url, options) =>
      options?.method === method ? response.promise : respond(url, options),
    );
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await screen.findByRole("button", { name: "Enregistrer", busy: true });

    // When
    await user.press(
      screen.getByRole("button", { name: "Quitter la session" }),
    );
    expect(mockFile.delete).not.toHaveBeenCalled();
    await act(async () =>
      response.resolve(
        kind === "division-creation" ? json(created, 201) : json(initial),
      ),
    );

    // Then
    await waitFor(() => expect(mockFile.delete).toHaveBeenCalledTimes(1));
    expect(mockPickedFile.delete).toHaveBeenCalledTimes(1);
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === method),
    ).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: "Voir les divisions" }),
    ).not.toBeOnTheScreen();
    if (kind === "division-creation") {
      expect(
        originalClient.getQueryData(getGetDivisionQueryKey(resourceId)),
      ).toBeUndefined();
    }
  },
);

it("deletes a prepared logo completed after its form unmounts", async () => {
  // Given
  const user = userEvent.setup();
  await renderEditor();
  await screen.findByDisplayValue("Current name");
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: "file:///cache/ImagePicker/source.png",
        mimeType: "image/png",
        width: 120,
        height: 60,
      },
    ],
  });
  const copying = Promise.withResolvers<void>();
  mockPickedFile.copy.mockReturnValue(copying.promise);
  await user.press(screen.getByRole("button", { name: "Ajouter un logo" }));
  await act(nativeImageChoiceAction("Choisir un logo"));
  await waitFor(() => expect(mockPickedFile.copy).toHaveBeenCalledTimes(1));

  // When
  await screen.unmount();
  await act(async () => copying.resolve());

  // Then
  expect(mockFile.delete).toHaveBeenCalledTimes(1);
  expect(mockPickedFile.delete).toHaveBeenCalledTimes(1);
});

it("ignores the retained lifecycle confirmation after protected-route removal and readmission", async () => {
  // Given
  permissions = { manageDivisionLifecycle: true };
  stored = {
    id: resourceId,

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
  const path = `/administration/divisions/${resourceId}`;
  await act(async () => router.push(path));
  await user.press(
    await screen.findByRole("button", { name: "Désactiver la division" }),
  );
  const confirm = nativeAlertAction("Désactiver");

  // When
  permissions = {};
  await user.press(
    await screen.findByRole("button", { name: "Relire les permissions" }),
  );
  await waitFor(() =>
    expect(screen.queryByLabelText("Nom de la division")).not.toBeOnTheScreen(),
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
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
  ).toHaveLength(0);
});

it("drops a lifecycle confirmation when its grant is revoked while editing stays available", async () => {
  // Given
  permissions = {
    manageDivisionLifecycle: true,
    manageSportingPresentation: true,
  };
  stored = {
    id: resourceId,
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
  await act(async () => router.push(`/administration/divisions/${resourceId}`));
  await user.press(
    await screen.findByRole("button", { name: "Désactiver la division" }),
  );
  const confirm = nativeAlertAction("Désactiver");

  // When
  permissions = { manageSportingPresentation: true };
  await user.press(
    screen.getByRole("button", { name: "Relire les permissions" }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Désactiver la division" }),
    ).not.toBeOnTheScreen(),
  );
  await act(async () => confirm());

  // Then
  expect(screen.getByLabelText("Nom de la division")).toHaveDisplayValue(
    "National 2",
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
  );
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PUT"),
  ).toBe(false);
});

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
    ) {
      return mockPickedFile as unknown as File;
    }
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
  await user.press(screen.getByRole("button", { name: "Ajouter un logo" }));
  await act(nativeImageChoiceAction("Choisir un logo"));
  await screen.findByRole("image", { name: "Miniature : Logo" });

  // When
  await user.press(screen.getByRole("button", { name: "Modifier le logo" }));
  await act(nativeImageChoiceAction("Choisir un logo"));

  // Then
  await waitFor(() => expect(mockFile.delete).toHaveBeenCalledTimes(1));
  expect(replacement.delete).not.toHaveBeenCalled();
  expect(mockPickedFile.delete).toHaveBeenCalledTimes(2);
  expect(
    screen.getByRole("image", { name: "Miniature : Logo" }),
  ).toBeOnTheScreen();
});

/** A mounted list makes creation invalidation observable without admitting creation through the catalogue. */
function DivisionListObserver() {
  const { query, authority } = useDivisions();
  return (
    <>
      <Text>{`Known divisions: ${query.data?.items.map((item) => item.name).join(", ") ?? "loading"}`}</Text>
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

/** Holds the exact detail of an existing division alongside the observed catalogue. */
function ExistingDivisionObserver({ id }: Readonly<{ id: string }>) {
  const authority = useSportingAuthority("divisions");
  const { data } = useQuery(
    createSportingAdministrationQueries(authority).division(id),
  );
  return <Text>{data?.name}</Text>;
}

it.each([200, 503])(
  "keeps accepted creation values when the independently observed catalogue refresh returns HTTP %i",
  async (refreshStatus) => {
    // Given
    permissions = { manageDivisionLifecycle: true };
    const created = {
      id: resourceId,

      name: "National 2",
      color: "#123456",
      gradient: null,
      logo,
      active: true,
    };
    const existing = {
      ...created,
      id: "00000000-0000-4000-8000-000000000197",
      name: "Existing division",
    };
    stored = { items: [existing] };
    const cataloguePath = "/administration/divisions";
    const existingPath = `${cataloguePath}/${existing.id}`;
    let accepted = false;
    mockFetch.mockImplementation((url, options) => {
      const { pathname } = new URL(String(url));
      if (pathname === existingPath) {
        return Promise.resolve(json(existing));
      }
      if (options?.method === "POST") {
        accepted = true;
        stored = { items: [existing, created] };
        return Promise.resolve(json(created, 201));
      }
      return accepted && refreshStatus === 503 && pathname === cataloguePath
        ? Promise.resolve(json({ status: 503 }, 503))
        : respond(url, options);
    });
    const user = userEvent.setup();
    await renderEditor(
      "division-creation",
      <>
        <DivisionListObserver />
        <ExistingDivisionObserver id={existing.id} />
      </>,
    );
    await screen.findByLabelText("Nom de la division");
    await screen.findByText(existing.name);
    await screen.findByText("Known divisions: Existing division");
    const catalogueKey = getListDivisionsQueryKey({ includeInactive: true });
    await user.clear(screen.getByLabelText("Nom de la division"));
    await user.type(screen.getByLabelText("Nom de la division"), "National 2");
    await user.clear(screen.getByLabelText("Couleur HEX"));
    await user.type(screen.getByLabelText("Couleur HEX"), "#123456");

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));

    // Then
    await screen.findByRole("button", { name: "Voir les divisions" });
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(client.getQueryData(catalogueKey)).toEqual({
      items: refreshStatus === 200 ? [existing, created] : [existing],
    });
    expect(client.getQueryState(catalogueKey)?.error).toEqual(
      refreshStatus === 200 ? null : expect.objectContaining({ status: 503 }),
    );
    expect(screen.getByLabelText("Nom de la division")).toHaveDisplayValue(
      "National 2",
    );
    expect(screen.getByLabelText("Couleur HEX")).toHaveDisplayValue("#123456");
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen();
    expect(
      mockFetch.mock.calls.filter(
        ([url, options]) =>
          new URL(String(url)).pathname === cataloguePath &&
          options?.method === "GET",
      ),
    ).toHaveLength(2);
    expect(
      mockFetch.mock.calls.filter(
        ([url, options]) =>
          new URL(String(url)).pathname === existingPath &&
          options?.method === "GET",
      ),
    ).toHaveLength(1);
  },
);

it("keeps the newer exact division read when an earlier 201 arrives late", async () => {
  // Given
  permissions = { manageDivisionLifecycle: true };
  const created: DivisionResponse = {
    id: resourceId,
    name: "Initial name",
    color: "#245FD8",
    gradient: null,
    logo,
    active: true,
  };
  const creation = Promise.withResolvers<Response>();
  const detail = Promise.withResolvers<Response>();
  const detailPath = `/administration/divisions/${resourceId}`;
  let creationAcknowledged = false;
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "POST") {
      return creation.promise;
    }
    if (String(url).endsWith(detailPath)) {
      return creationAcknowledged
        ? Promise.resolve(json({ status: 503 }, 503))
        : detail.promise;
    }
    return respond(url, options);
  });
  const user = userEvent.setup();
  await renderEditor(
    "division-creation",
    <ExistingDivisionObserver id={resourceId} />,
  );
  await user.type(
    await screen.findByLabelText("Nom de la division"),
    created.name,
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await screen.findByRole("button", { name: "Enregistrer", busy: true });

  // When the other visit receives the newer division before the original POST response.
  const current = { ...created, name: "Current name" };
  await act(async () => detail.resolve(json(current)));
  await screen.findByText(current.name);
  creationAcknowledged = true;
  await act(async () => creation.resolve(json(created, 201)));

  // Then each visit retains the response for its own operation.
  await screen.findByRole("button", { name: "Voir les divisions" });
  expect(screen.getByLabelText("Nom de la division")).toHaveDisplayValue(
    created.name,
  );
  expect(screen.getByText(current.name)).toBeOnTheScreen();
  expect(client.getQueryData(getGetDivisionQueryKey(resourceId))).toEqual(
    current,
  );
  expect(
    mockFetch.mock.calls.filter(([url]) => String(url).endsWith(detailPath)),
  ).toHaveLength(1);
});

it("keeps catalogue access and the dirty creation draft when a delayed 201 follows grant revocation", async () => {
  // Given
  permissions = {
    manageDivisionLifecycle: true,
    manageSportingPresentation: true,
  };
  stored = { items: [] };
  const created = {
    id: resourceId,
    name: "New division",
    color: "#245FD8",
    gradient: null,
    logo,
    active: true,
  };
  const creation = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) =>
    options?.method === "POST" ? creation.promise : respond(url, options),
  );
  const user = userEvent.setup();
  await renderEditor("division-creation", <DivisionListObserver />);
  await user.type(
    await screen.findByLabelText("Nom de la division"),
    created.name,
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await screen.findByRole("button", { name: "Enregistrer", busy: true });

  // When
  permissions = { manageSportingPresentation: true };
  await user.press(screen.getByRole("button", { name: "Refresh permissions" }));
  await screen.findByRole("alert", { name: "Une erreur est survenue" });
  expect(screen.queryByLabelText("Nom de la division")).not.toBeOnTheScreen();
  stored = { items: [created] };
  await act(async () => creation.resolve(json(created, 201)));

  // Then
  expect(
    await screen.findByText("Known divisions: New division"),
  ).toBeOnTheScreen();
  expect(
    client.getQueryData(getGetDivisionQueryKey(resourceId)),
  ).toBeUndefined();
  permissions = {
    manageSportingPresentation: true,
    manageDivisionLifecycle: true,
  };
  await user.press(screen.getByRole("button", { name: "Refresh permissions" }));
  expect(await screen.findByDisplayValue(created.name)).toBeOnTheScreen();
  expect(screen.getByText("Modifications non enregistrées")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Voir les divisions" }),
  ).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
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
  await user.press(
    await screen.findByRole("button", { name: "Modifier l’équipe" }),
  );
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
  await user.press(
    await screen.findByRole("button", { name: "Modifier l’équipe" }),
  );
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

it("preserves a fresh local creation draft when an abandoned creation succeeds later", async () => {
  // Given
  permissions = { manageDivisionLifecycle: true };
  stored = { items: [] };
  const creation = Promise.withResolvers<Response>();
  const created = {
    id: resourceId,

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
