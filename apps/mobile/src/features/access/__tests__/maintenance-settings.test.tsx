import { useLayoutEffect } from "react";
import type { PropsWithChildren } from "react";
import { nativeAlertAction } from "../../../shared/native/test-support/native-alert";
import { accountResponse } from "../../accounts/test-support/account-response";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";
import { applicationAccessResponse as mockApplicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { ApplicationAccessProvider } from "../queries/use-application-access";
import { Alert } from "react-native";
import {
  QueryClientProvider,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
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
import { getGetMaintenanceSettingsQueryKey } from "../../../../.generated/mobile";
import type { MaintenanceSettingsResponse } from "../../../../.generated/schemas/index.zod";
import { MaintenanceSettingsScreen } from "../screens/maintenance-settings-screen";
import MaintenanceRoute from "../../../app/(operations)/administration/maintenance";

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
let client: QueryClient;
let publicClient = createQueryClient();
const environment = { ...process.env };
const initial = {
  revision: 2,
  active: false,
  message: "Message préparé",
  imageUrl: null,
} satisfies MaintenanceSettingsResponse;
const account = accountResponse({
  accountId: "00000000-0000-4000-8000-000000000175",
  username: "Operator_175",
  email: "operator@example.invalid",
  permissions: { manageMaintenance: true },
});
let stored: MaintenanceSettingsResponse = { ...initial };
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  publicClient = createQueryClient();
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
  client?.clear();
  publicClient.clear();
  // Await pending Query batches before restoring the test's real timer environment.
  await act(async () => jest.runOnlyPendingTimersAsync());
  jest.useRealTimers();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Selects the real private client, disables read retries and avoids detached mutation GC timers in these scenarios. */
function PrivateQueries({ children }: Readonly<PropsWithChildren>) {
  const current = useQueryClient();
  useLayoutEffect(() => {
    client = current;
    current.setQueryDefaults([], { retry: false });
    current.setMutationDefaults([], { gcTime: Infinity });
  }, [current]);
  return children;
}

/** Supplies real Query/session/theme owners; only native credentials and HTTP are controlled. */
async function renderSettings(content = <MaintenanceSettingsScreen />) {
  return render(content, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={publicClient}>
        <ThemeProvider>
          <ApplicationAccessProvider>
            <AccountSessionProvider>
              <PrivateQueries>
                <AccountFeedbackProvider>{children}</AccountFeedbackProvider>
              </PrivateQueries>
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

it("shows loading before any known state can be saved", async () => {
  // Given
  const response = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url) =>
    String(url).endsWith("/accounts/me")
      ? Promise.resolve(json(account))
      : response.promise,
  );

  // When
  await renderSettings();

  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.some(([url]) =>
        String(url).endsWith("/administration/maintenance"),
      ),
    ).toBe(true),
  );
  expect(
    screen.getByRole("progressbar", {
      name: "Chargement des réglages de maintenance",
      busy: true,
    }),
  ).toBeOnTheScreen();
  expect(screen.getAllByRole("progressbar")).toHaveLength(1);
  expect(
    screen.queryByRole("button", { name: "Enregistrer" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Message de maintenance"),
  ).not.toBeOnTheScreen();

  // When
  await act(async () => response.resolve(json(initial)));

  // Then
  expect(await screen.findByDisplayValue(initial.message)).toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
});

it("reports one failed refresh while retaining the editable maintenance draft", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message de maintenance"));
  await user.type(
    screen.getByLabelText("Message de maintenance"),
    "Mon brouillon",
  );
  mockFetch.mockClear().mockRejectedValue(new Error("Network unavailable"));

  // When
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
  expect(screen.queryByText("Une erreur est survenue")).not.toBeOnTheScreen();
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
it("keeps a failed save editable during its normal settings refresh", async () => {
  // Given: the form and private Query owner are real; only HTTP is controlled.
  const user = userEvent.setup();
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message de maintenance"));
  await user.type(
    screen.getByLabelText("Message de maintenance"),
    "Brouillon conservé",
  );
  const refresh = Promise.withResolvers<Response>();
  mockFetch.mockImplementation(async (url, options) => {
    if (String(url).endsWith("/accounts/me")) {
      return json(account);
    }
    if (options?.method === "PATCH") {
      throw new TypeError("Lost response");
    }
    return refresh.promise;
  });

  // When
  try {
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await act(async () => nativeAlertAction("Enregistrer")());

    // Then: a pending refresh neither locks the draft nor repeats the command.
    expect(
      await screen.findByText(
        "Une erreur est survenue. Veuillez réessayer plus tard.",
      ),
    ).toBeOnTheScreen();
    expect(
      client.getQueryState(getGetMaintenanceSettingsQueryKey())?.fetchStatus,
    ).toBe("fetching");
    expect(screen.getByLabelText("Message de maintenance")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
    ).toHaveLength(1);

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await act(async () => nativeAlertAction("Enregistrer")());

    // Then
    expect(screen.getByLabelText("Message de maintenance")).toHaveDisplayValue(
      "Brouillon conservé",
    );
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
    ).toHaveLength(2);
  } finally {
    await act(async () => refresh.resolve(json(initial)));
    await waitFor(() => {
      expect(client.isFetching()).toBe(0);
      expect(publicClient.isFetching()).toBe(0);
    });
  }
});

it("does not publish defaults after an initial load failure", async () => {
  // Given
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/accounts/me")
      ? json(account)
      : json(
          {
            type: "urn:blockout:problem:unavailable",
            title: "Unavailable",
            status: 503,
          },
          503,
        ),
  );

  // When
  await renderSettings();

  // Then
  expect(await screen.findByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Message de maintenance"),
  ).not.toBeOnTheScreen();
});
it("separates content preparation from explicit activation", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message de maintenance"));
  await user.type(
    screen.getByLabelText("Message de maintenance"),
    "Mon brouillon",
  );
  const response = Promise.withResolvers<Response>();
  mockFetch.mockImplementation((url, options) =>
    options?.method === "PATCH"
      ? response.promise
      : Promise.resolve(json(stored)),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Enregistrer")());

  try {
    // Then
    expect(
      await screen.findByRole("button", {
        name: "Enregistrer",
        busy: true,
      }),
    ).toBeDisabled();
  } finally {
    // When
    stored = { ...stored, revision: 3, message: "Mon brouillon" };
    await act(async () => response.resolve(json(stored)));
  }

  // Then
  await waitFor(() =>
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen(),
  );
  expect(
    await screen.findByRole("button", {
      name: "Enregistrer",
      busy: false,
    }),
  ).toBeEnabled();
  const writes = mockFetch.mock.calls.filter(([, o]) => o?.method === "PATCH");
  expect(JSON.parse(String(writes[0][1]?.body))).toEqual({
    revision: 2,
    message: "Mon brouillon",
  });
  expect(screen.getByLabelText("Maintenance inactive")).toBeOnTheScreen();
  expect(mockFetch.mock.calls.some(([, o]) => o?.method === "PUT")).toBe(false);
});
it("sends the desired active state independently of dirty content", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message de maintenance"));
  await user.type(
    screen.getByLabelText("Message de maintenance"),
    "Mon brouillon",
  );
  mockFetch.mockImplementation(async (url, options) => {
    if (String(url).endsWith("/accounts/me")) {
      return json(account);
    }
    if (options?.method === "PUT") {
      stored = { ...stored, revision: 3, active: true };
    }
    return json(stored);
  });

  // When
  await user.press(
    screen.getByRole("button", { name: "Activer la maintenance" }),
  );
  await act(async () => nativeAlertAction("Activer")());

  // Then
  await screen.findByLabelText("Maintenance active");
  expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
  const write = mockFetch.mock.calls.find(([, o]) => o?.method === "PUT");
  expect(JSON.parse(String(write?.[1]?.body))).toEqual({
    revision: 2,
    active: true,
  });
});
it("locks content editing during activation and retains the draft after an ordinary failure", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message de maintenance"));
  await user.type(
    screen.getByLabelText("Message de maintenance"),
    "Mon brouillon",
  );
  const imageUrl = "https://assets.example.invalid/draft.png";
  await user.type(screen.getByLabelText("URL de l’image"), imageUrl);
  const response = Promise.withResolvers<Response>();
  mockFetch.mockImplementation(async (url, options) => {
    if (options?.method === "PUT") {
      return response.promise;
    }
    if (String(url).endsWith("/accounts/me")) {
      return json(account);
    }
    return json(stored);
  });

  // When
  await user.press(
    screen.getByRole("button", { name: "Activer la maintenance" }),
  );
  await act(async () => nativeAlertAction("Activer")());

  try {
    // Then
    expect(
      await screen.findByRole("button", {
        name: "Activer la maintenance",
        busy: true,
      }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Message de maintenance")).toBeDisabled();
    expect(screen.getByLabelText("URL de l’image")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));

    // Then
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
    ).toHaveLength(0);
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "PUT"),
    ).toHaveLength(1);
  } finally {
    // When
    await act(async () =>
      response.resolve(
        json(
          {
            type: "urn:blockout:problem:unprocessable-content",
            title: "Refused",
            status: 422,
          },
          422,
        ),
      ),
    );
  }

  // Then
  expect(
    await screen.findByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
  );
  expect(
    screen.getByRole("button", {
      name: "Activer la maintenance",
      busy: false,
    }),
  ).toBeEnabled();
  expect(screen.getByLabelText("Message de maintenance")).toBeEnabled();
  expect(screen.getByLabelText("Message de maintenance")).toHaveDisplayValue(
    "Mon brouillon",
  );
  expect(screen.getByLabelText("URL de l’image")).toBeEnabled();
  expect(screen.getByLabelText("URL de l’image")).toHaveDisplayValue(imageUrl);
  expect(screen.getByLabelText("Maintenance inactive")).toBeOnTheScreen();
});
it("preserves a dirty draft after a newer background response", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message de maintenance"));
  await user.type(
    screen.getByLabelText("Message de maintenance"),
    "Mon brouillon",
  );
  const query = client
    .getQueryCache()
    .findAll()
    .find((q) => q.queryKey.includes(getGetMaintenanceSettingsQueryKey()[0]));
  if (!query) {
    throw new Error("The real settings query is missing");
  }
  stored = { ...initial, revision: 3, message: "Autre éditeur" };

  // When
  await act(async () => {
    await client.refetchQueries({ queryKey: query.queryKey, exact: true });
  });

  // Then
  expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled(),
  );
});
it("refuses blank text before sending any mutation", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message de maintenance"));
  await user.type(screen.getByLabelText("Message de maintenance"), "   ");

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  expect(
    await screen.findByText("Saisissez un message de maintenance."),
  ).toBeOnTheScreen();
  expect(mockFetch.mock.calls.some(([, o]) => o?.method === "PATCH")).toBe(
    false,
  );
});
it("refuses an invalid image URL without losing the draft", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message de maintenance"));
  await user.type(
    screen.getByLabelText("Message de maintenance"),
    "Mon brouillon",
  );
  await user.type(
    screen.getByLabelText("URL de l’image"),
    "http://unsafe.example.invalid/image.png",
  );

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  expect(
    await screen.findByText(
      "Utilisez une URL HTTPS d’image sans identifiant ni suivi personnalisé.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
});
it("clears the optional image using explicit null", async () => {
  // Given
  stored = {
    ...initial,
    imageUrl: "https://assets.example.invalid/maintenance.png",
  };
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText("URL de l’image"));
  mockFetch.mockImplementation(async () => json({ ...initial, revision: 3 }));

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Enregistrer")());

  // Then
  await waitFor(() =>
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen(),
  );
  const write = mockFetch.mock.calls.find(([, o]) => o?.method === "PATCH");
  expect(JSON.parse(String(write?.[1]?.body))).toEqual({
    revision: 2,
    imageUrl: null,
  });
});
it("finishes local image progress only when the native image is displayed", async () => {
  // Given: the real form is mounted; jest-expo controls native image events.
  stored = { ...initial, imageUrl: "https://assets.example.invalid/ready.png" };
  await renderSettings();
  const image = await screen.findByRole("image", {
    name: "Aperçu de l’image de maintenance",
  });
  expect(
    screen.getByRole("progressbar", { name: "Chargement de l’aperçu" }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Message de maintenance")).toBeEnabled();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();

  // When
  await fireEvent(image, "display");

  // Then
  expect(
    screen.queryByRole("progressbar", { name: "Chargement de l’aperçu" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.getByRole("image", { name: "Aperçu de l’image de maintenance" }),
  ).toBeOnTheScreen();
});

it.each(["loading", "failed"])(
  "saves a dirty message at its original revision while its optional image is %s",
  async (status) => {
    // Given
    const user = userEvent.setup();
    const imageUrl = "https://assets.example.invalid/optional.png";
    stored = { ...initial, imageUrl };
    await renderSettings();
    await user.clear(await screen.findByLabelText("Message de maintenance"));
    await user.type(
      screen.getByLabelText("Message de maintenance"),
      "Texte enregistré sans attendre l’image",
    );
    if (status === "failed") {
      await fireEvent(
        screen.getByRole("image", { name: "Aperçu de l’image de maintenance" }),
        "error",
        { nativeEvent: { error: "Unavailable" } },
      );
    }
    const accepted = {
      ...stored,
      revision: 3,
      message: "Texte enregistré sans attendre l’image",
    };
    mockFetch.mockClear().mockResolvedValue(json(accepted));

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await act(async () => nativeAlertAction("Enregistrer")());
    await waitFor(() =>
      expect(
        screen.queryByText("Modifications non enregistrées"),
      ).not.toBeOnTheScreen(),
    );

    // Then: decoding neither removes the URL nor changes the submitted baseline.
    const write = mockFetch.mock.calls.find(
      ([, options]) => options?.method === "PATCH",
    );
    expect(JSON.parse(String(write?.[1]?.body))).toStrictEqual({
      revision: initial.revision,
      message: "Texte enregistré sans attendre l’image",
    });
    expect(screen.getByLabelText("URL de l’image")).toHaveDisplayValue(
      imageUrl,
    );
    expect(screen.getByLabelText("Message de maintenance")).toHaveDisplayValue(
      accepted.message,
    );
    expect(screen.getByLabelText("Maintenance inactive")).toBeOnTheScreen();
  },
);

it("keeps a failed optional preview at its fallback while dirty input and actions remain usable", async () => {
  // Given: the editable URL is valid, and only native image display fails.
  const user = userEvent.setup();
  const imageUrl = "https://assets.example.invalid:8443/broken.png?width=800";
  stored = { ...initial, imageUrl };
  await renderSettings();
  await user.clear(await screen.findByLabelText("Message de maintenance"));
  await user.type(
    screen.getByLabelText("Message de maintenance"),
    "Texte conservé",
  );
  mockFetch.mockClear();

  // When
  await fireEvent(
    screen.getByLabelText("Aperçu de l’image de maintenance"),
    "error",
    {
      nativeEvent: { error: "Unavailable" },
    },
  );

  // Then: the optional artwork supplies no visible notice or separate recovery action.
  expect(
    await screen.findByRole("image", { name: "Aperçu indisponible" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Aperçu indisponible")).not.toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Réessayer l’aperçu" }),
  ).not.toBeOnTheScreen();
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  expect(screen.getByLabelText("URL de l’image")).toHaveDisplayValue(imageUrl);
  expect(screen.getByLabelText("Message de maintenance")).toHaveDisplayValue(
    "Texte conservé",
  );
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
  expect(mockFetch).not.toHaveBeenCalled();
});
it("starts a fresh draft image preview when a previously failed URL returns", async () => {
  // Given
  const user = userEvent.setup();
  const originalUrl = "https://assets.example.invalid/original.png";
  stored = { ...initial, imageUrl: originalUrl };
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await fireEvent(
    screen.getByLabelText("Aperçu de l’image de maintenance"),
    "error",
    {
      nativeEvent: { error: "Unavailable" },
    },
  );
  expect(
    await screen.findByRole("image", { name: "Aperçu indisponible" }),
  ).toBeOnTheScreen();

  // When
  await user.clear(screen.getByLabelText("URL de l’image"));
  await user.type(
    screen.getByLabelText("URL de l’image"),
    "https://assets.example.invalid/replacement.png",
  );
  await user.clear(screen.getByLabelText("URL de l’image"));
  await user.type(screen.getByLabelText("URL de l’image"), originalUrl);

  // Then
  expect(
    screen.getByLabelText("Aperçu de l’image de maintenance"),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("image", { name: "Aperçu indisponible" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.getByRole("progressbar", { name: "Chargement de l’aperçu" }),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue(initial.message)).toBeOnTheScreen();
});

it.each([400, 403, 409, 422, "stale-revision"] as const)(
  "retains the draft and revision after a confirmed %s refusal",
  async (refusal) => {
    // Given
    const user = userEvent.setup();
    await renderSettings();
    await screen.findByDisplayValue(initial.message);
    await user.clear(screen.getByLabelText("Message de maintenance"));
    await user.type(
      screen.getByLabelText("Message de maintenance"),
      "Mon brouillon",
    );
    const status = refusal === "stale-revision" ? 409 : refusal;
    mockFetch.mockImplementation(async (url, options) => {
      if (String(url).endsWith("/accounts/me")) {
        return json(account);
      }
      if (options?.method !== "PATCH") {
        return json(
          { type: "about:blank", title: "Unavailable", status: 503 },
          503,
        );
      }
      return json(
        {
          type:
            refusal === "stale-revision"
              ? "urn:blockout:problem:stale-revision"
              : "urn:blockout:problem:unprocessable-content",
          title: "Refused",
          status,
        },
        status,
      );
    });

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await act(async () => nativeAlertAction("Enregistrer")());

    // Then
    expect(
      await screen.findByText(
        "Une erreur est survenue. Veuillez réessayer plus tard.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
    );
    expect(stored).toEqual(initial);
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
    ).toHaveLength(1);

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await act(async () => nativeAlertAction("Enregistrer")());

    // Then
    const writes = mockFetch.mock.calls.filter(
      ([, options]) => options?.method === "PATCH",
    );
    expect(writes).toHaveLength(2);
    expect(JSON.parse(String(writes[1][1]?.body))).toMatchObject({
      revision: initial.revision,
      message: "Mon brouillon",
    });
  },
);
it.each(["conflict", "lost"])(
  "keeps dirty fields when invalidation finds a newer revision after %s",
  async (outcome) => {
    // Given
    const user = userEvent.setup();
    await renderSettings();
    await screen.findByDisplayValue(initial.message);
    await user.clear(screen.getByLabelText("Message de maintenance"));
    await user.type(
      screen.getByLabelText("Message de maintenance"),
      "Mon brouillon",
    );
    let writes = 0;
    mockFetch.mockImplementation(async (url, options) => {
      if (String(url).endsWith("/accounts/me")) {
        return json(account);
      }
      if (options?.method === "PATCH") {
        writes++;
        if (writes === 1) {
          if (outcome === "lost") {
            throw new TypeError("Lost response");
          }
          return json(
            {
              type: "urn:blockout:problem:stale-revision",
              title: "Conflict",
              status: 409,
            },
            409,
          );
        }
        stored = { ...stored, revision: 4, message: "Mon brouillon" };
        return json(stored);
      }
      if (stored.revision < 3) {
        stored = { ...stored, revision: 3, message: "Autre éditeur" };
      }
      return json(stored);
    });

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await act(async () => nativeAlertAction("Enregistrer")());

    // Then
    expect(
      await screen.findByRole("button", { name: "Relire les réglages" }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
    expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
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
    expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
    expect(
      screen.getByText("Modifications non enregistrées"),
    ).toBeOnTheScreen();

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await act(async () => nativeAlertAction("Enregistrer")());

    // Then
    await waitFor(() =>
      expect(
        screen.queryByText("Modifications non enregistrées"),
      ).not.toBeOnTheScreen(),
    );
    expect(
      screen.queryByText("Modifications non enregistrées"),
    ).not.toBeOnTheScreen();
    const calls = mockFetch.mock.calls.filter(([, o]) => o?.method === "PATCH");
    expect(JSON.parse(String(calls[1][1]?.body)).revision).toBe(3);
  },
);
it("keeps the production route closed until native admission is composed", async () => {
  // Given
  const route = <MaintenanceRoute />;

  // When
  await renderSettings(route);

  // Then
  expect(await screen.findByText("Une erreur est survenue")).toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Message de maintenance"),
  ).not.toBeOnTheScreen();
});

it("cancels content confirmation without sending a mutation", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message de maintenance"));
  await user.type(
    screen.getByLabelText("Message de maintenance"),
    "Mon brouillon",
  );

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Annuler")());

  // Then
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      "Enregistrer le contenu ?",
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({ cancelable: true }),
    ),
  );
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PATCH"),
  ).toBe(false);
  expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
});

it("starts a fresh local draft after unmounting a failed pending save", async () => {
  // Given
  const user = userEvent.setup();
  const response = Promise.withResolvers<Response>();
  const view = await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message de maintenance"));
  await user.type(
    screen.getByLabelText("Message de maintenance"),
    "Mon brouillon",
  );
  mockFetch.mockImplementation(async (url, options) => {
    if (options?.method === "PATCH") {
      return response.promise;
    }
    if (String(url).endsWith("/accounts/me")) {
      return json(account);
    }
    return json(stored);
  });
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Enregistrer")());

  // When
  await view.rerender(<></>);
  await act(async () => response.reject(new TypeError("Response lost")));
  await view.rerender(<MaintenanceSettingsScreen />);

  // Then
  expect(await screen.findByDisplayValue(initial.message)).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Relire les réglages" }),
  ).not.toBeOnTheScreen();

  // When
  await user.clear(screen.getByLabelText("Message de maintenance"));
  await user.type(
    screen.getByLabelText("Message de maintenance"),
    "Fresh choice",
  );

  // Then
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
  );
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
  ).toHaveLength(1);
});
it("cancels activation confirmation without changing the saved state", async () => {
  // Given
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  const user = userEvent.setup();

  // When
  await user.press(
    screen.getByRole("button", { name: "Activer la maintenance" }),
  );
  await act(async () => nativeAlertAction("Annuler")());

  // Then
  expect(Alert.alert).toHaveBeenCalledWith(
    "Activer la maintenance ?",
    expect.any(String),
    expect.any(Array),
    expect.objectContaining({ cancelable: true }),
  );
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PUT"),
  ).toBe(false);
  expect(screen.getByLabelText("Maintenance inactive")).toBeOnTheScreen();
});
it("retains confirmed grants through an account outage while the server still refuses a save", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message de maintenance"));
  await user.type(
    screen.getByLabelText("Message de maintenance"),
    "Mon brouillon",
  );
  const accountQuery = client
    .getQueryCache()
    .findAll()
    .find((query) => query.queryKey.includes("/accounts/me"));
  if (!accountQuery) {
    throw new Error("The real current-account query is missing");
  }
  mockFetch.mockImplementation(async (url, options) => {
    if (options?.method === "PATCH") {
      return json(
        {
          type: "urn:blockout:problem:forbidden",
          title: "Forbidden",
          status: 403,
        },
        403,
      );
    }
    if (String(url).endsWith("/accounts/me")) {
      return json(
        {
          type: "urn:blockout:problem:unavailable",
          title: "Unavailable",
          status: 503,
        },
        503,
      );
    }
    return json(stored);
  });

  // When
  await act(async () => {
    await client.refetchQueries({
      queryKey: accountQuery.queryKey,
      exact: true,
    });
  });

  // Then: a technical account failure retains the matching profile and its confirmed grant.
  expect(accountQuery.state.error).toMatchObject({ status: 503 });
  expect(client.getQueryData(accountQuery.queryKey)).toEqual(account);
  expect(
    screen.queryByRole("alert", { name: "Une erreur est survenue" }),
  ).not.toBeOnTheScreen();
  expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
  expect(screen.getByLabelText("Message de maintenance")).toBeEnabled();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
  );
  expect(
    screen.getByRole("button", { name: "Activer la maintenance" }),
  ).toBeEnabled();

  // When: the retained grant presents the command, but its server result remains authoritative.
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  await act(async () => nativeAlertAction("Enregistrer")());

  // Then: a refused write neither updates the confirmed maintenance state nor loses the draft.
  expect(
    await screen.findByRole("alert", {
      name: "Une erreur est survenue. Veuillez réessayer plus tard.",
    }),
  ).toBeOnTheScreen();
  const writes = mockFetch.mock.calls.filter(
    ([, options]) => options?.method === "PATCH",
  );
  expect(writes).toHaveLength(1);
  expect(JSON.parse(String(writes[0][1]?.body))).toEqual({
    revision: 2,
    message: "Mon brouillon",
  });
  expect(screen.getByLabelText("Maintenance inactive")).toBeOnTheScreen();
  expect(screen.getByLabelText("Message de maintenance")).toHaveDisplayValue(
    "Mon brouillon",
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled(),
  );
});

it("retains its draft when the server refuses a held confirmation after a settings read refusal", async () => {
  // Given
  const user = userEvent.setup();
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await user.clear(screen.getByLabelText("Message de maintenance"));
  await user.type(
    screen.getByLabelText("Message de maintenance"),
    "Mon brouillon",
  );
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));
  const confirm = nativeAlertAction("Enregistrer");
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
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");
  await screen.findByRole("alert", {
    name: "Une erreur est survenue. Veuillez réessayer plus tard.",
  });

  // When
  await act(async () => confirm());

  // Then
  await waitFor(() =>
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
    ).toHaveLength(1),
  );
  expect(screen.getByLabelText("Message de maintenance")).toHaveDisplayValue(
    "Mon brouillon",
  );
  expect(screen.getByLabelText("Message de maintenance")).toBeDisabled();

  // When
  mockFetch.mockImplementation(async (url) =>
    json(String(url).endsWith("/accounts/me") ? account : stored),
  );
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  await waitFor(() =>
    expect(screen.getByLabelText("Message de maintenance")).toBeEnabled(),
  );
  expect(screen.getByLabelText("Message de maintenance")).toHaveDisplayValue(
    "Mon brouillon",
  );
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
  ).toHaveLength(1);
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
  expect(
    screen.queryByLabelText("Message de maintenance"),
  ).not.toBeOnTheScreen();
});

it.each([
  ["Enregistrer", "Enregistrer", "PATCH"],
  ["Activer la maintenance", "Activer", "PUT"],
])(
  "preserves dirty input after the server refuses %s prepared with delayed credentials",
  async (action, confirmation, method) => {
    // Given
    const user = userEvent.setup();
    await renderSettings();
    await screen.findByDisplayValue(initial.message);
    await user.clear(screen.getByLabelText("Message de maintenance"));
    await user.type(
      screen.getByLabelText("Message de maintenance"),
      "Mon brouillon",
    );
    const credentials =
      Promise.withResolvers<ReturnType<typeof credentialsFor>>();
    mockAuth0.getCredentials.mockReturnValueOnce(credentials.promise);
    mockFetch.mockImplementation(async (url, options) => {
      if (options?.method === method) {
        return json(
          {
            type: "urn:blockout:problem:forbidden",
            title: "Forbidden",
            status: 403,
          },
          403,
        );
      }
      if (String(url).endsWith("/accounts/me")) {
        return json(account);
      }
      return json(stored);
    });
    await user.press(screen.getByRole("button", { name: action }));
    await act(async () => nativeAlertAction(confirmation)());

    // When
    await act(async () =>
      credentials.resolve(credentialsFor("auth0|operator")),
    );

    // Then
    await screen.findByText(
      "Une erreur est survenue. Veuillez réessayer plus tard.",
    );
    expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: action })).toBeEnabled(),
    );
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === method),
    ).toHaveLength(1);
  },
);
