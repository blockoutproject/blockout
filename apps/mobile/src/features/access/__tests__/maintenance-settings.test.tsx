import { Alert, type AlertButton } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import {
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
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
let client = createQueryClient();
const environment = { ...process.env };
const initial = {
  revision: 2,
  active: false,
  message: "Message préparé",
  imageUrl: null,
};
const account = {
  accountId: "00000000-0000-4000-8000-000000000175",
  username: "Operator_175",
  email: "operator@example.invalid",
  principalCreatedAt: null,
  hasPhoto: false,
  permissions: { manageMaintenance: true },
};
let stored: import("../../../../.generated/schemas/index.zod").MaintenanceSettingsResponse =
  { ...initial };
beforeEach(() => {
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  client = createQueryClient();
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
afterEach(() => {
  client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Supplies real Query/session/theme owners; only native credentials and HTTP are controlled. */
async function renderSettings(content = <MaintenanceSettingsScreen />) {
  return render(content, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <AccountSessionProvider>{children}</AccountSessionProvider>
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
/** Finds a named choice in the displayed native alert without accepting it during setup. */
function nativeAction(label: string): AlertButton {
  const button = jest
    .mocked(Alert.alert)
    .mock.lastCall?.[2]?.find((choice) => choice.text === label);
  if (!button) throw new Error(`The native action ${label} is missing`);
  return button;
}
/** Changes the actual native text field without replacing form state. */
async function editMessage(message = "Mon brouillon") {
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText("Message de maintenance"));
  await user.type(screen.getByLabelText("Message de maintenance"), message);
  return user;
}

it("shows loading before any known state can be saved", async () => {
  // Given
  let finish: (value: Response) => void = () => {};
  mockFetch.mockImplementation((url) =>
    String(url).endsWith("/accounts/me")
      ? Promise.resolve(json(account))
      : new Promise((resolve) => {
          finish = resolve;
        }),
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
    screen.getByRole("progressbar", { name: "Chargement en cours" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Enregistrer le contenu" }),
  ).not.toBeOnTheScreen();
  await act(async () => finish(json(initial)));
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
  expect(
    await screen.findByText("Les réglages de maintenance sont indisponibles."),
  ).toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Message de maintenance"),
  ).not.toBeOnTheScreen();
});
it("separates content preparation from explicit activation", async () => {
  // Given
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  const user = await editMessage();
  mockFetch.mockImplementation(async (url, options) => {
    if (options?.method === "PATCH")
      return json({ ...stored, revision: 3, message: "Mon brouillon" });
    return json(stored);
  });

  // When
  await user.press(
    screen.getByRole("button", { name: "Enregistrer le contenu" }),
  );
  await act(async () => nativeAction("Enregistrer").onPress?.());

  // Then
  await screen.findByText("Contenu enregistré.");
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
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  const user = await editMessage();
  mockFetch.mockImplementation(async (url, options) =>
    options?.method === "PUT"
      ? json({ ...stored, revision: 3, active: true })
      : json(stored),
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Activer la maintenance" }),
  );
  await act(async () => nativeAction("Activer").onPress?.());

  // Then
  await screen.findByLabelText("Maintenance active");
  expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
  const write = mockFetch.mock.calls.find(([, o]) => o?.method === "PUT");
  expect(JSON.parse(String(write?.[1]?.body))).toEqual({
    revision: 2,
    active: true,
  });
});
it("preserves a dirty draft after a background query update", async () => {
  // Given
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await editMessage();
  const query = client
    .getQueryCache()
    .findAll()
    .find((q) => q.queryKey.includes(getGetMaintenanceSettingsQueryKey()[0]));
  if (!query) throw new Error("The real settings query is missing");

  // When
  await act(async () => {
    client.setQueryData(query.queryKey, {
      ...initial,
      revision: 3,
      message: "Autre éditeur",
    });
  });

  // Then
  expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
});
it("refuses blank text before sending any mutation", async () => {
  // Given
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  const user = await editMessage("   ");

  // When
  await user.press(
    screen.getByRole("button", { name: "Enregistrer le contenu" }),
  );

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
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  const user = await editMessage();
  await user.type(
    screen.getByLabelText("URL de l’image"),
    "http://unsafe.example.invalid/image.png",
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Enregistrer le contenu" }),
  );

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
  await user.press(
    screen.getByRole("button", { name: "Enregistrer le contenu" }),
  );
  await act(async () => nativeAction("Enregistrer").onPress?.());

  // Then
  await screen.findByText("Contenu enregistré.");
  const write = mockFetch.mock.calls.find(([, o]) => o?.method === "PATCH");
  expect(JSON.parse(String(write?.[1]?.body))).toEqual({
    revision: 2,
    imageUrl: null,
  });
});
it("keeps text and actions usable when preview display fails", async () => {
  // Given
  stored = {
    ...initial,
    imageUrl: "https://assets.example.invalid:8443/broken.png?width=800",
  };
  await renderSettings();
  await screen.findByDisplayValue(initial.message);

  // When
  fireEvent(
    screen.getByLabelText("Aperçu de l’image de maintenance"),
    "error",
    { nativeEvent: { error: "Unavailable" } },
  );

  // Then
  expect(
    await screen.findByText("L’image ne peut pas être affichée."),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue(initial.message)).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Enregistrer le contenu" }),
  ).toBeEnabled();
});
it.each([400, 403, 422])(
  "retains the draft after a confirmed %i refusal",
  async (status) => {
    // Given
    await renderSettings();
    await screen.findByDisplayValue(initial.message);
    const user = await editMessage();
    mockFetch.mockImplementation(async () =>
      json(
        {
          type: "urn:blockout:problem:unprocessable-content",
          title: "Refused",
          status,
        },
        status,
      ),
    );

    // When
    await user.press(
      screen.getByRole("button", { name: "Enregistrer le contenu" }),
    );
    await act(async () => nativeAction("Enregistrer").onPress?.());

    // Then
    expect(
      await screen.findByText(
        "L’enregistrement a été refusé. Vérifiez les valeurs et vos permissions.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
  },
);
it.each(["conflict", "lost"])(
  "requires reread and explicit resubmission after %s",
  async (outcome) => {
    // Given
    await renderSettings();
    await screen.findByDisplayValue(initial.message);
    const user = await editMessage();
    let writes = 0;
    mockFetch.mockImplementation(async (url, options) => {
      if (options?.method === "PATCH") {
        writes++;
        if (writes === 1) {
          if (outcome === "lost") throw new TypeError("Lost response");
          return json(
            {
              type: "urn:blockout:problem:stale-revision",
              title: "Conflict",
              status: 409,
            },
            409,
          );
        }
        return json({ ...stored, revision: 4, message: "Mon brouillon" });
      }
      return json({ ...stored, revision: 3, message: "Autre éditeur" });
    });

    // When
    await user.press(
      screen.getByRole("button", { name: "Enregistrer le contenu" }),
    );
    await act(async () => nativeAction("Enregistrer").onPress?.());

    // Then
    expect(
      await screen.findByRole("button", { name: "Relire les réglages" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Enregistrer le contenu" }),
    ).toBeDisabled();
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

    // When
    await user.press(
      screen.getByRole("button", { name: "Enregistrer le contenu" }),
    );
    await act(async () => nativeAction("Enregistrer").onPress?.());

    // Then
    await screen.findByText("Contenu enregistré.");
    const calls = mockFetch.mock.calls.filter(([, o]) => o?.method === "PATCH");
    expect(JSON.parse(String(calls[1][1]?.body)).revision).toBe(3);
  },
);
it("keeps the production route closed until native admission is composed", async () => {
  // Given / When
  await renderSettings(<MaintenanceRoute />);

  // Then
  expect(
    await screen.findByText(
      "L’accès à l’application doit être vérifié avant de continuer.",
    ),
  ).toBeOnTheScreen();
  expect(
    screen.queryByLabelText("Message de maintenance"),
  ).not.toBeOnTheScreen();
});

it("cancels content confirmation without sending a mutation", async () => {
  // Given
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  const user = await editMessage();

  // When
  await user.press(
    screen.getByRole("button", { name: "Enregistrer le contenu" }),
  );
  await act(async () => nativeAction("Annuler").onPress?.());

  // Then
  await waitFor(() =>
    expect(Alert.alert).toHaveBeenCalledWith(
      "Enregistrer le contenu ?",
      expect.any(String),
      expect.any(Array),
    ),
  );
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PATCH"),
  ).toBe(false);
  expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
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
  await act(async () => nativeAction("Annuler").onPress?.());

  // Then
  expect(Alert.alert).toHaveBeenCalledWith(
    "Activer la maintenance ?",
    expect.any(String),
    expect.any(Array),
  );
  expect(
    mockFetch.mock.calls.some(([, options]) => options?.method === "PUT"),
  ).toBe(false);
  expect(screen.getByLabelText("Maintenance inactive")).toBeOnTheScreen();
});
it("retains a draft through a failed permission refresh", async () => {
  // Given
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  await editMessage();
  const accountQuery = client
    .getQueryCache()
    .findAll()
    .find((query) => query.queryKey.includes("/accounts/me"));
  if (!accountQuery)
    throw new Error("The real current-account query is missing");
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/accounts/me")
      ? json(
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
  await act(async () => {
    await client.refetchQueries({
      queryKey: accountQuery.queryKey,
      exact: true,
    });
  });

  // Then
  expect(
    await screen.findByText("Les permissions du compte sont indisponibles."),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Enregistrer le contenu" }),
  ).toBeDisabled();
});

it.each([
  ["Enregistrer le contenu", "Enregistrer"],
  ["Activer la maintenance", "Activer"],
])(
  "retains a read-only draft and blocks a held %s confirmation after revocation",
  async (action, confirmation) => {
    // Given
    await renderSettings();
    await screen.findByDisplayValue(initial.message);
    const user = await editMessage();
    await user.press(screen.getByRole("button", { name: action }));
    const confirm = nativeAction(confirmation).onPress;
    if (!confirm) throw new Error("The native confirmation is missing");
    const accountQuery = client
      .getQueryCache()
      .findAll()
      .find((query) => query.queryKey.includes("/accounts/me"));
    if (!accountQuery)
      throw new Error("The real current-account query is missing");
    mockFetch.mockImplementation(async (url) =>
      json(
        String(url).endsWith("/accounts/me")
          ? { ...account, permissions: { manageMaintenance: false } }
          : stored,
      ),
    );

    // When
    await act(async () => {
      await client.refetchQueries({
        queryKey: accountQuery.queryKey,
        exact: true,
      });
    });

    await screen.findByText("Cette action nécessite une permission dédiée.");
    await act(async () => confirm());

    // Then
    expect(
      screen.getByText("Cette action nécessite une permission dédiée."),
    ).toBeOnTheScreen();
    expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
    expect(screen.getByLabelText("Message de maintenance")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Enregistrer le contenu" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Activer la maintenance" }),
    ).toBeDisabled();
    expect(
      mockFetch.mock.calls.some(([, options]) =>
        ["PATCH", "PUT"].includes(options?.method ?? ""),
      ),
    ).toBe(false);
  },
);

it("keeps a conflicting draft blocked through a failed settings reread", async () => {
  // Given
  await renderSettings();
  await screen.findByDisplayValue(initial.message);
  const user = await editMessage();
  let rereadFails = true;
  mockFetch.mockImplementation(async (_url, options) => {
    if (options?.method === "PATCH")
      return json(
        {
          type: "urn:blockout:problem:stale-revision",
          title: "Conflict",
          status: 409,
        },
        409,
      );
    return rereadFails
      ? json(
          {
            type: "urn:blockout:problem:unavailable",
            title: "Unavailable",
            status: 503,
          },
          503,
        )
      : json({ ...stored, revision: 3, message: "Other editor" });
  });

  // When
  await user.press(
    screen.getByRole("button", { name: "Enregistrer le contenu" }),
  );
  await act(async () => nativeAction("Enregistrer").onPress?.());
  await screen.findByRole("button", { name: "Relire les réglages" });
  await user.press(screen.getByRole("button", { name: "Relire les réglages" }));

  // Then
  expect(
    await screen.findByText(
      "La relecture a échoué. Votre brouillon est conservé.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Enregistrer le contenu" }),
  ).toBeDisabled();

  // When
  rereadFails = false;
  await user.press(screen.getByRole("button", { name: "Relire les réglages" }));

  // Then
  await screen.findByText(
    "Réglages relus. Vérifiez votre brouillon avant de le soumettre à nouveau.",
  );
  expect(screen.getByDisplayValue("Mon brouillon")).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "PATCH"),
  ).toHaveLength(1);
});
