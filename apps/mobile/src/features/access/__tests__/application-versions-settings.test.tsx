import { nativeAlertAction } from "../../../shared/native/test-support/native-alert";
import { accountResponse } from "../../accounts/test-support/account-response";
import { TECHNICAL_ERROR } from "../../../shared/components/error-copy";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { applicationAccessResponse as mockApplicationAccessResponse } from "../../../shared/api/test-support/application-access";
import {
  ApplicationAccessProvider,
  useApplicationAccess,
} from "../queries/use-application-access";
import { Alert, Linking, Text } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  act,
  render,
  screen,
  userEvent,
  waitFor,
  fireEvent,
} from "@testing-library/react-native";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import {
  getGetApplicationAccessQueryKey,
  getGetApplicationVersionSettingsQueryKey,
} from "../../../../.generated/mobile";
import { ApplicationVersionsSettingsScreen } from "../screens/application-versions-settings-screen";
import ApplicationVersionsRoute from "../../../app/(operations)/administration/application-versions";

// The upstream native-insets double gives the modal its own real React contexts in Jest.
jest.mock(
  "react-native-safe-area-context",
  () =>
    jest.requireActual("react-native-safe-area-context/src/jest/mock").default,
);
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
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
  usePreventRemove: jest.fn(),
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    String(url).endsWith("/application-access")
      ? Promise.resolve(Response.json(mockAccessResponse))
      : mockFetch(url, options),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
let mockAccessResponse = mockApplicationAccessResponse();
let client = createQueryClient();
const environment = { ...process.env };
const initial = {
  revision: 2,
  ios: {
    minimumVersion: "2.0.0",
    storeUrl: "https://apps.apple.com/fr/app/blockout/id123456789",
  },
  android: {
    minimumVersion: "1.9.0",
    storeUrl:
      "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout",
  },
  message: "Message préparé",
};
const account = accountResponse({
  accountId: "00000000-0000-4000-8000-000000000185",
  username: "Operator_185",
  email: "operator@example.invalid",
  permissions: { manageApplicationVersions: true },
});
let stored: import("../../../../.generated/schemas/index.zod").ApplicationVersionsResponse =
  { ...initial };
beforeEach(() => {
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  client = createQueryClient();
  mockAccessResponse = mockApplicationAccessResponse();
  stored = { ...initial };
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|operator"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockFetch
    .mockReset()
    .mockImplementation(async (url) =>
      json(String(url).endsWith("/accounts/me") ? account : stored),
    );
});
afterEach(async () => {
  await cleanup();
  client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Supplies real Query/session/theme owners; only native credentials and HTTP are controlled. */
async function renderSettings(content = <ApplicationVersionsSettingsScreen />) {
  return render(content, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <AccountFeedbackProvider>{children}</AccountFeedbackProvider>
            </AccountSessionProvider>
          </ApplicationAccessProvider>
        </ThemeProvider>
      </QueryClientProvider>
    ),
  });
}
/** Returns a real Fetch representation consumed by the canonical generated schema. */
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type":
        status === 200 ? "application/json" : "application/problem+json",
    },
  });
}
/** Finds the real generated private query so refetches exercise the production consumer. */
function settingsKey() {
  const query = client
    .getQueryCache()
    .findAll()
    .find((q) =>
      q.queryKey.includes(getGetApplicationVersionSettingsQueryKey()[0]),
    );
  if (!query) throw new Error("The versions query is missing");
  return query.queryKey;
}
it("shows loading without publishing defaults, then retries a failed initial read", async () => {
  // Given
  const user = userEvent.setup();
  const response = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url) =>
    String(url).endsWith("/accounts/me")
      ? Promise.resolve(json(account))
      : response.promise,
  );

  // When
  await renderSettings();

  // Then
  await waitFor(() => {
    expect(
      mockFetch.mock.calls.some(([url]) =>
        String(url).endsWith("/administration/application-versions"),
      ),
    ).toBe(true);
    expect(
      screen.getByRole("progressbar", {
        name: "Chargement des réglages de versions",
      }),
    ).toBeOnTheScreen();
  });
  expect(
    screen.queryByRole("button", { name: "Enregistrer" }),
  ).not.toBeOnTheScreen();

  // When
  await act(async () =>
    response.resolve(
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

  // Then
  expect(await screen.findByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(screen.queryByLabelText("Message commun")).not.toBeOnTheScreen();

  // When
  mockFetch.mockImplementation(async (url) =>
    json(String(url).endsWith("/accounts/me") ? account : initial),
  );
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByDisplayValue(initial.message)).toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PATCH"),
  ).toBe(false);
});
it("saves independent iOS and Android edits atomically under one revision", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await user.press(await screen.findByRole("button", { name: "iOS" }));
  await user.press(screen.getByRole("button", { name: "Android" }));
  await user.clear(screen.getByLabelText("Version minimale iOS"));
  await user.type(screen.getByLabelText("Version minimale iOS"), "1.8.0");
  await user.clear(screen.getByLabelText("URL Google Play Android"));
  await user.type(
    screen.getByLabelText("URL Google Play Android"),
    initial.android.storeUrl + "&hl=fr",
  );
  const response = Promise.withResolvers<Response>();
  mockFetch.mockImplementation(() => response.promise);

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Appliquer")());

  // Then
  expect(
    await screen.findByRole("button", {
      name: "Enregistrer",
      busy: true,
    }),
  ).toBeDisabled();
  const writes = mockFetch.mock.calls.filter(([, o]) => o?.method === "PATCH");
  expect(writes).toHaveLength(1);
  expect(JSON.parse(String(writes[0][1]?.body))).toEqual({
    revision: 2,
    ios: { minimumVersion: "1.8.0" },
    android: { storeUrl: initial.android.storeUrl + "&hl=fr" },
  });
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).includes("/maintenance")),
  ).toBe(false);

  // When
  await act(async () =>
    response.resolve(
      json({
        ...initial,
        revision: 3,
        ios: { ...initial.ios, minimumVersion: "1.8.0" },
        android: {
          ...initial.android,
          storeUrl: initial.android.storeUrl + "&hl=fr",
        },
      }),
    ),
  );

  // Then
  await waitFor(() =>
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen(),
  );
  expect(
    screen.queryByText("Modifications non enregistrées"),
  ).not.toBeOnTheScreen();
});
it("removes a platform minimum and optional message with null while omitting the other platform", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await user.press(await screen.findByRole("button", { name: "iOS" }));
  await user.clear(screen.getByLabelText("Version minimale iOS"));
  await user.clear(screen.getByLabelText("Message commun"));
  mockFetch.mockImplementation(async () =>
    json({
      ...initial,
      revision: 3,
      ios: { ...initial.ios, minimumVersion: null },
      message: null,
    }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Appliquer")());

  // Then
  await waitFor(() =>
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen(),
  );
  const write = mockFetch.mock.calls.find(([, o]) => o?.method === "PATCH");
  expect(JSON.parse(String(write?.[1]?.body))).toEqual({
    revision: 2,
    ios: { minimumVersion: null },
    message: null,
  });
  expect(
    screen.getByText(
      "Une nouvelle version de Blockout est obligatoire pour continuer à utiliser l’application.",
    ),
  ).toBeOnTheScreen();
});
it.each([
  ["Version minimale iOS", "2.01.0"],
  ["Version minimale iOS", "9007199254740992.0.0"],
  ["URL App Store iOS", ""],
  [
    "URL App Store iOS",
    "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout",
  ],
  [
    "URL Google Play Android",
    "https://play.google.com/store/apps/details?id=wrong.application",
  ],
  [
    "URL Google Play Android",
    initial.android.storeUrl + "&id=com.blockoutproject.blockout",
  ],
])(
  "refuses inconsistent or malformed %s without losing the draft (%s)",
  async (label, value) => {
    // Given
    const user = userEvent.setup();
    await renderSettings();
    await user.press(await screen.findByRole("button", { name: "iOS" }));
    await user.press(screen.getByRole("button", { name: "Android" }));
    await user.clear(screen.getByLabelText(label));
    if (value) await user.type(screen.getByLabelText(label), value);

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));

    // Then
    expect(await screen.findByRole("alert")).toBeOnTheScreen();
    expect(screen.getByLabelText(label)).toHaveDisplayValue(value);
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(mockFetch.mock.calls.some(([, o]) => o?.method === "PATCH")).toBe(
      false,
    );
  },
);
it.each([
  ["2.9.0", "2.10.0", true],
  ["2.10.0", "2.9.0", false],
  ["2.10.0", "2.10.0", false],
  [null, "1.0.0", true],
  ["2.10.0", "", false],
] as const)(
  "checks store acknowledgement for minimum %s → %s (required: %s)",
  async (previous, next, required) => {
    // Given
    const user = userEvent.setup();
    stored = {
      ...initial,
      ios: { ...initial.ios, minimumVersion: previous },
    };
    await renderSettings();
    await user.press(await screen.findByRole("button", { name: "iOS" }));

    // When
    await user.clear(screen.getByLabelText("Version minimale iOS"));
    if (next)
      await user.type(screen.getByLabelText("Version minimale iOS"), next);

    // Then
    const acknowledgement = screen.queryByRole("checkbox");
    if (required) expect(acknowledgement).toBeOnTheScreen();
    else expect(acknowledgement).not.toBeOnTheScreen();
  },
);
it("requires store acknowledgement before raising a minimum, and cancellation preserves the draft", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await user.press(await screen.findByRole("button", { name: "iOS" }));

  // When
  await user.clear(screen.getByLabelText("Version minimale iOS"));
  await user.type(screen.getByLabelText("Version minimale iOS"), "2.10.0");

  // Then
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();

  // When
  await user.press(
    screen.getByRole("checkbox", {
      name: "J’ai vérifié que la version requise est disponible sur chaque store concerné.",
    }),
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Annuler")());

  // Then
  expect(screen.getByLabelText("Version minimale iOS")).toHaveDisplayValue(
    "2.10.0",
  );
  expect(mockFetch.mock.calls.some(([, o]) => o?.method === "PATCH")).toBe(
    false,
  );

  // When
  await user.clear(screen.getByLabelText("Version minimale iOS"));
  await user.type(screen.getByLabelText("Version minimale iOS"), "2.11.0");

  // Then
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
});
it.each([403, 422])(
  "preserves input after a confirmed %i refusal",
  async (status) => {
    // Given
    const user = userEvent.setup();
    await renderSettings();
    await screen.findByDisplayValue(initial.message);
    await user.clear(screen.getByLabelText("Message commun"));
    await user.type(screen.getByLabelText("Message commun"), "Mon brouillon");
    mockFetch.mockImplementation(async () =>
      json(
        { type: "urn:blockout:problem:forbidden", title: "Refused", status },
        status,
      ),
    );

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await act(async () => nativeAlertAction("Appliquer")());

    // Then
    expect(
      await screen.findByText(
        "Une erreur est survenue. Veuillez réessayer plus tard.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText("Message commun")).toHaveDisplayValue(
      "Mon brouillon",
    );
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  },
);
it.each(["conflict", "lost", "invalid-response"])(
  "rereads after %s and requires explicit resubmission without merging dirty fields",
  async (outcome) => {
    // Given
    const user = userEvent.setup();
    await renderSettings();
    await screen.findByDisplayValue(initial.message);
    await user.clear(screen.getByLabelText("Message commun"));
    await user.type(screen.getByLabelText("Message commun"), "Mon brouillon");
    let writes = 0;
    mockFetch.mockImplementation(async (_url, options) => {
      if (options?.method === "PATCH") {
        writes++;
        if (writes === 1) {
          if (outcome === "lost") throw new TypeError("Lost response");
          if (outcome === "invalid-response") return json({ revision: 3 });
          return json(
            {
              type: "urn:blockout:problem:stale-revision",
              title: "Conflict",
              status: 409,
            },
            409,
          );
        }
        return json({ ...initial, revision: 4, message: "Mon brouillon" });
      }
      return json({
        ...initial,
        revision: 3,
        ios: { ...initial.ios, minimumVersion: "1.8.0" },
        message: "Autre éditeur",
      });
    });

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await act(async () => nativeAlertAction("Appliquer")());

    // Then
    await screen.findByRole("button", { name: "Relire les réglages" });
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
    expect(screen.getByLabelText("Message commun")).toHaveDisplayValue(
      "Mon brouillon",
    );
    expect(writes).toBe(1);

    // When
    await user.press(
      screen.getByRole("button", { name: "Relire les réglages" }),
    );

    // Then
    await screen.findByText(
      "Réglages relus. Vérifiez votre brouillon avant de le soumettre à nouveau.",
    );
    expect(writes).toBe(1);
    expect(screen.getByLabelText("Message commun")).toHaveDisplayValue(
      "Mon brouillon",
    );

    // When
    await user.press(screen.getByRole("button", { name: "iOS" }));

    // Then
    expect(screen.getByLabelText("Version minimale iOS")).toHaveDisplayValue(
      "1.8.0",
    );
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await act(async () => nativeAlertAction("Appliquer")());

    // Then
    await waitFor(() =>
      expect(
        screen.queryByText("Modifications non enregistrées"),
      ).not.toBeOnTheScreen(),
    );
    const calls = mockFetch.mock.calls.filter(([, o]) => o?.method === "PATCH");
    expect(JSON.parse(String(calls[1][1]?.body))).toEqual({
      revision: 3,
      message: "Mon brouillon",
    });
  },
);
it("keeps dirty values and blocks writes after a newer refetch and a failed reread", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message commun"));
  await user.type(screen.getByLabelText("Message commun"), "Mon brouillon");
  stored = { ...initial, revision: 3, message: "Autre éditeur" };

  // When
  await act(async () =>
    client.refetchQueries({ queryKey: settingsKey(), exact: true }),
  );

  // Then
  expect(screen.getByLabelText("Message commun")).toHaveDisplayValue(
    "Mon brouillon",
  );
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();

  // When
  mockFetch.mockImplementation(async () =>
    json(
      {
        type: "urn:blockout:problem:unavailable",
        title: "Unavailable",
        status: 503,
      },
      503,
    ),
  );
  await user.press(screen.getByRole("button", { name: "Relire les réglages" }));

  // Then
  await screen.findByText(
    "Une erreur est survenue. Veuillez réessayer plus tard.",
  );
  expect(screen.getByLabelText("Message commun")).toHaveDisplayValue(
    "Mon brouillon",
  );
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
});
it.each(["revoked", "unavailable"])(
  "retains read-only input and rejects a held confirmation when permissions are %s",
  async (outcome) => {
    // Given
    const user = userEvent.setup();
    await renderSettings();
    await screen.findByDisplayValue(initial.message);
    await user.clear(screen.getByLabelText("Message commun"));
    await user.type(screen.getByLabelText("Message commun"), "Mon brouillon");
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    const confirm = nativeAlertAction("Appliquer");
    mockFetch.mockImplementation(async (url) =>
      String(url).endsWith("/accounts/me")
        ? outcome === "revoked"
          ? json({
              ...account,
              permissions: { manageMaintenance: true, bypassMaintenance: true },
            })
          : json(
              {
                type: "urn:blockout:problem:unavailable",
                title: "Unavailable",
                status: 503,
              },
              503,
            )
        : json(stored),
    );

    // When
    await act(async () =>
      client.refetchQueries({
        predicate: (q) => q.queryKey.includes("/accounts/me"),
      }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Message commun")).toBeDisabled(),
    );
    expect(
      screen.queryByRole("alert", { name: "Une erreur est survenue" }),
    ).not.toBeOnTheScreen();
    await act(async () => confirm());

    // Then
    expect(screen.getByLabelText("Message commun")).toHaveDisplayValue(
      "Mon brouillon",
    );
    expect(screen.getByLabelText("Message commun")).toBeDisabled();
    expect(mockFetch.mock.calls.some(([, o]) => o?.method === "PATCH")).toBe(
      false,
    );
  },
);

it("retains a read-only draft and rejects held confirmation after the settings endpoint refuses access", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message commun"));
  await user.type(screen.getByLabelText("Message commun"), "Mon brouillon");
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  const confirm = nativeAlertAction("Appliquer");
  mockFetch.mockClear().mockResolvedValue(
    json(
      {
        type: "urn:blockout:problem:forbidden",
        title: "Forbidden",
        status: 403,
      },
      403,
    ),
  );

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByRole("alert", {
    name: "Une erreur est survenue. Veuillez réessayer plus tard.",
  });
  await act(async () => confirm());

  // Then
  expect(screen.getByLabelText("Message commun")).toHaveDisplayValue(
    "Mon brouillon",
  );
  expect(screen.getByLabelText("Message commun")).toBeDisabled();
  expect(
    screen.queryByRole("alert", { name: "Une erreur est survenue" }),
  ).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PATCH"),
  ).toBe(false);

  // When
  mockFetch.mockResolvedValue(
    json(
      {
        type: "urn:blockout:problem:unavailable",
        title: "Unavailable",
        status: 503,
      },
      503,
    ),
  );
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await waitFor(() =>
    expect(screen.getByLabelText("Actualiser les données")).not.toBeBusy(),
  );
  expect(
    screen.getByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Message commun")).toBeDisabled();
  expect(
    screen.queryByRole("alert", { name: "Une erreur est survenue" }),
  ).not.toBeOnTheScreen();

  // When
  mockFetch.mockImplementation(async (url) =>
    json(String(url).endsWith("/accounts/me") ? account : stored),
  );
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await waitFor(() =>
    expect(screen.getByLabelText("Message commun")).toBeEnabled(),
  );
  expect(screen.getByLabelText("Message commun")).toHaveDisplayValue(
    "Mon brouillon",
  );
  expect(
    screen.queryByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).not.toBeOnTheScreen();
});

it("presents an initial settings refusal with an opaque retryable card and no editable defaults", async () => {
  // Given
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/accounts/me")
      ? json(account)
      : json(
          {
            type: "urn:blockout:problem:forbidden",
            title: "Forbidden",
            status: 403,
          },
          403,
        ),
  );

  // When
  await renderSettings();

  // Then
  expect(
    await screen.findByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeEnabled();
  expect(screen.queryByLabelText("Message commun")).not.toBeOnTheScreen();
});
it("keeps the production route closed without operational admission", async () => {
  // Given
  const route = <ApplicationVersionsRoute />;

  // When
  await renderSettings(route);

  // Then
  await screen.findByText("Une erreur est survenue");
  expect(screen.queryByLabelText("Message commun")).not.toBeOnTheScreen();
});

/** Shows the real process observation boundary without inspecting component internals. */
function AdmissionProbe() {
  const { snapshot } = useApplicationAccess();
  return (
    <Text>
      {snapshot.complete
        ? "Complete access check"
        : "Complete access check required"}
    </Text>
  );
}
it("advances only versions observations after a successful partial save and requires another complete check", async () => {
  // Given
  const user = userEvent.setup();
  stored = {
    ...initial,
    revision: 0,
    ios: { minimumVersion: null, storeUrl: null },
    android: { minimumVersion: null, storeUrl: null },
  };
  await renderSettings(
    <>
      <AdmissionProbe />
      <ApplicationVersionsSettingsScreen />
    </>,
  );
  await screen.findByText("Complete access check");
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message commun"));
  await user.type(screen.getByLabelText("Message commun"), "Updated text");
  mockFetch.mockImplementation(async () =>
    json({ ...stored, revision: 1, message: "Updated text" }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Appliquer")());

  // Then
  await waitFor(() =>
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen(),
  );
  expect(screen.getByText("Complete access check required")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([url]) => String(url).includes("/maintenance")),
  ).toBe(false);
});
it("rejects invalid or older rereads without replacing the accepted cache or dirty input", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message commun"));
  await user.type(screen.getByLabelText("Message commun"), "Mon brouillon");
  const key = settingsKey();

  // When
  mockFetch.mockResolvedValue(
    json({ ...initial, revision: 1, message: "Older state" }),
  );
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await screen.findByText(
    "Une erreur est survenue. Veuillez réessayer plus tard.",
  );
  expect(client.getQueryData(key)).toEqual(initial);
  expect(screen.getByLabelText("Message commun")).toHaveDisplayValue(
    "Mon brouillon",
  );

  // When
  mockFetch.mockResolvedValue(json({ revision: 5, ios: null }));
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await waitFor(() =>
    expect(client.getQueryState(key)?.fetchStatus).toBe("idle"),
  );
  expect(client.getQueryState(key)?.status).toBe("error");
  expect(client.getQueryData(key)).toEqual(initial);
  expect(screen.getByLabelText("Message commun")).toHaveDisplayValue(
    "Mon brouillon",
  );
});
it("previews absent optional copy with the same fallback and preserves the draft on close", async () => {
  // Given
  const user = userEvent.setup();
  stored = {
    ...initial,
    ios: { minimumVersion: null, storeUrl: null },
    android: { minimumVersion: null, storeUrl: null },
  };
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message commun"));

  // When
  await user.press(screen.getByRole("button", { name: "Aperçu" }));

  // Then
  expect(
    await screen.findByRole("header", { name: "Mets Blockout à jour." }),
  ).toBeOnTheScreen();
  expect(
    screen.getAllByText(
      "Une nouvelle version de Blockout est obligatoire pour continuer à utiliser l’application.",
    ).length,
  ).toBeGreaterThan(0);
  expect(
    screen.getByRole("button", { name: "Mettre à jour l’application" }),
  ).toBeDisabled();

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));

  // Then
  expect(screen.getByLabelText("Message commun")).toHaveDisplayValue("");
  expect(mockFetch.mock.calls.some(([, o]) => o?.method === "PATCH")).toBe(
    false,
  );
});

it("hands the validated current-platform preview link to the existing native store action without saving", async () => {
  // Given
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  const user = userEvent.setup();

  // When
  await user.press(screen.getByRole("button", { name: "Aperçu" }));
  await user.press(
    await screen.findByRole("button", { name: "Mettre à jour l’application" }),
  );

  // Then
  expect(open).toHaveBeenCalledWith(initial.ios.storeUrl);
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PATCH"),
  ).toBe(false);
});

it("shows a store failure in the native preview and retires it when the preview closes", async () => {
  // Given
  jest
    .spyOn(Linking, "openURL")
    .mockRejectedValue(new Error("Store unavailable"));
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Aperçu" }));

  // When
  await user.press(
    screen.getByRole("button", { name: "Mettre à jour l’application" }),
  );

  // Then
  expect(
    await screen.findByRole("alert", { name: TECHNICAL_ERROR }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Mettre à jour l’application" }),
  ).toBeEnabled();

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  await user.press(screen.getByRole("button", { name: "Aperçu" }));

  // Then
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.some(([, request]) => request?.method === "PATCH"),
  ).toBe(false);
});

it("ignores a late store failure from a previously closed native preview", async () => {
  // Given
  const opening = Promise.withResolvers<void>();
  jest.spyOn(Linking, "openURL").mockReturnValueOnce(opening.promise);
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Aperçu" }));
  await user.press(
    screen.getByRole("button", { name: "Mettre à jour l’application" }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  await user.press(screen.getByRole("button", { name: "Aperçu" }));
  await act(() => opening.reject(new Error("Late native failure")));

  // Then
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Mettre à jour l’application" }),
  ).toBeEnabled();
});

it("keeps a delayed acknowledged write and older reread behind the latest public revision", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await screen.findByLabelText("Message commun");
  await user.clear(screen.getByLabelText("Message commun"));
  await user.type(screen.getByLabelText("Message commun"), "Mon brouillon");
  const response = Promise.withResolvers<Response>();
  mockFetch.mockImplementation(async (_url, options) =>
    options?.method === "PATCH" ? response.promise : json(stored),
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Appliquer")());

  // When
  mockAccessResponse = {
    ...mockAccessResponse,
    versions: { ...mockAccessResponse.versions, revision: 4 },
  };
  await act(async () => {
    await client.refetchQueries({
      queryKey: getGetApplicationAccessQueryKey(),
      exact: true,
    });
  });
  await act(async () =>
    response.resolve(
      json({ ...stored, revision: 3, message: "Mon brouillon" }),
    ),
  );

  // Then
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Relire les réglages" }));

  // Then
  expect(
    await screen.findByText(
      "Une erreur est survenue. Veuillez réessayer plus tard.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();

  // When
  stored = { ...stored, revision: 4 };
  await user.press(screen.getByRole("button", { name: "Relire les réglages" }));

  // Then
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Relire les réglages" }),
    ).not.toBeOnTheScreen(),
  );

  // When
  await user.clear(screen.getByLabelText("Message commun"));
  await user.type(screen.getByLabelText("Message commun"), "Nouveau choix");

  // Then
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
  ).toHaveLength(1);
});
