import { createQueryClient } from "../../../shared/query/query-client";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { CloseSeasonScreen } from "../screens/close-season-screen";
import {
  AccountActions,
  collectionPeer,
  json,
  refused,
  renderCollection,
  seasonId,
} from "../test-support/collection-peer";

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
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
  usePreventRemove: jest.fn(),
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
const mockBack = jest.fn();
const environment = { ...process.env };
let peer: ReturnType<typeof collectionPeer>;
let client = createQueryClient();
let privateClient: ReturnType<typeof createQueryClient>;
beforeEach(() => {
  peer = collectionPeer();
  client = createQueryClient();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|operator187"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.webAuthLogout.mockReset().mockResolvedValue();
  mockFetch.mockReset().mockImplementation(peer.reads);
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});
afterEach(async () => {
  await cleanup();
  client.clear();
  privateClient?.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

it("requires the exact displayed label and sends the current revision once", async () => {
  // Given
  mockFetch.mockImplementation((url, options) =>
    options?.method === "POST"
      ? Promise.resolve(
          json(
            (peer.season = { ...peer.season, revision: 6, state: "closed" }),
          ),
        )
      : peer.reads(url, options),
  );
  await renderCollection(
    <CloseSeasonScreen seasonId={seasonId} />,
    client,
    (cache) => {
      privateClient = cache;
    },
  );
  const user = userEvent.setup();
  const input = await screen.findByLabelText("Nom exact de la saison");
  expect(screen.queryByRole("button", { name: "Relire l’état" })).toBeNull();

  // When
  await user.type(input, "2026/2027 ");
  expect(
    screen.getByRole("button", { name: "Clôturer définitivement" }),
  ).toBeDisabled();
  await user.clear(input);
  await user.type(input, "2026/2027");
  await user.press(
    await screen.findByRole("button", { name: "Clôturer définitivement" }),
  );

  // Then
  expect(
    await screen.findByText("Saison clôturée · historique conservé"),
  ).toBeOnTheScreen();
  const writes = mockFetch.mock.calls.filter(
    ([, options]) => options?.method === "POST",
  );
  expect(writes).toHaveLength(1);
  expect(String(writes[0][0])).toContain(
    `/collection-seasons/${seasonId}/closure`,
  );
  expect(JSON.parse(String(writes[0][1]?.body))).toEqual({
    revision: 5,
    confirmation: "2026/2027",
  });
  expect(Alert.alert).not.toHaveBeenCalled();
});

it.each([409, "lost"])(
  "keeps a %s failed draft only for its mounted visit",
  async (failure) => {
    // Given
    const user = userEvent.setup();
    mockFetch.mockImplementation((url, options) =>
      options?.method === "POST"
        ? failure === "lost"
          ? Promise.reject(new TypeError("lost"))
          : Promise.resolve(refused(409))
        : peer.reads(url, options),
    );
    const view = await renderCollection(
      <CloseSeasonScreen seasonId={seasonId} />,
      client,
      (cache) => {
        privateClient = cache;
      },
    );
    await user.type(
      await screen.findByLabelText("Nom exact de la saison"),
      "2026/2027",
    );
    // When
    await user.press(
      screen.getByRole("button", { name: "Clôturer définitivement" }),
    );
    await screen.findByRole("alert");
    // Then
    expect(screen.getByDisplayValue("2026/2027")).toBeOnTheScreen();
    // When
    await view.rerender(<></>);
    await view.rerender(<CloseSeasonScreen seasonId={seasonId} />);
    // Then
    expect(
      await screen.findByLabelText("Nom exact de la saison"),
    ).toHaveDisplayValue("");
    expect(
      mockFetch.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
  },
);

it("observes an accepted closure through ordinary invalidation after a lost response", async () => {
  // Given
  const user = userEvent.setup();
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "POST") {
      peer.season = { ...peer.season, revision: 6, state: "closed" };
      return Promise.reject(new TypeError("Lost acknowledgement"));
    }
    return peer.reads(url, options);
  });
  await renderCollection(
    <CloseSeasonScreen seasonId={seasonId} />,
    client,
    (cache) => {
      privateClient = cache;
    },
  );
  await user.type(
    await screen.findByLabelText("Nom exact de la saison"),
    "2026/2027",
  );

  // When
  await user.press(
    await screen.findByRole("button", { name: "Clôturer définitivement" }),
  );
  // Then
  expect(
    await screen.findByText("Saison clôturée · historique conservé"),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Clôturer définitivement" }),
  ).toBeNull();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
});

it("cancels through ordinary back without changing the season", async () => {
  // Given
  const user = userEvent.setup();
  await renderCollection(
    <CloseSeasonScreen seasonId={seasonId} />,
    client,
    (cache) => {
      privateClient = cache;
    },
  );
  await screen.findByLabelText("Nom exact de la saison");

  // When
  await user.press(await screen.findByRole("button", { name: "Annuler" }));

  // Then
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(0);
});

it("retains entered text while current collection permission is unavailable", async () => {
  // Given
  const user = userEvent.setup();
  await renderCollection(
    <>
      <CloseSeasonScreen seasonId={seasonId} />
      <AccountActions />
    </>,
    client,
    (cache) => {
      privateClient = cache;
    },
  );
  await user.type(
    await screen.findByLabelText("Nom exact de la saison"),
    "2026/",
  );

  // When
  peer.permissions = {};
  await user.press(
    await screen.findByRole("button", { name: "Actualiser les permissions" }),
  );

  // Then
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Clôturer définitivement" }),
    ).toBeDisabled(),
  );
  expect(screen.queryByText("Une erreur est survenue")).toBeNull();
  expect(screen.getByDisplayValue("2026/")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Clôturer définitivement" }),
  ).toBeDisabled();
});

it("retains an incorrect draft through a background revision change and refuses to submit it", async () => {
  // Given
  const user = userEvent.setup();
  await renderCollection(
    <CloseSeasonScreen seasonId={seasonId} />,
    client,
    (cache) => {
      privateClient = cache;
    },
  );
  await user.type(
    await screen.findByLabelText("Nom exact de la saison"),
    "2026/",
  );

  // When
  peer.season = { ...peer.season, revision: 6 };
  await act(async () => privateClient.invalidateQueries());

  // Then
  expect(screen.getByDisplayValue("2026/")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Clôturer définitivement" }),
  ).toBeDisabled();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(0);
});

it("retains the draft after a definite refusal and can explicitly submit again", async () => {
  // Given
  const user = userEvent.setup();
  mockFetch.mockImplementation((url, options) =>
    options?.method === "POST"
      ? Promise.resolve(refused(422))
      : peer.reads(url, options),
  );
  await renderCollection(
    <CloseSeasonScreen seasonId={seasonId} />,
    client,
    (cache) => {
      privateClient = cache;
    },
  );
  await user.type(
    await screen.findByLabelText("Nom exact de la saison"),
    "2026/2027",
  );

  // When
  await user.press(
    await screen.findByRole("button", { name: "Clôturer définitivement" }),
  );

  // Then
  expect(
    await screen.findByText(
      "Une erreur est survenue. Veuillez réessayer plus tard.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("2026/2027")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Clôturer définitivement" }),
  ).toBeEnabled();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);

  // When
  mockFetch.mockImplementation((url, options) =>
    options?.method === "POST"
      ? Promise.resolve(
          json(
            (peer.season = { ...peer.season, revision: 6, state: "closed" }),
          ),
        )
      : peer.reads(url, options),
  );
  await user.press(
    screen.getByRole("button", { name: "Clôturer définitivement" }),
  );

  // Then
  expect(
    await screen.findByText("Saison clôturée · historique conservé"),
  ).toBeOnTheScreen();
  expect(
    mockFetch.mock.calls
      .filter(([, options]) => options?.method === "POST")
      .map(([url, options]) => ({
        path: new URL(String(url)).pathname,
        body: JSON.parse(String(options?.body)),
      })),
  ).toEqual([
    {
      path: `/administration/collection-seasons/${seasonId}/closure`,
      body: { revision: 5, confirmation: "2026/2027" },
    },
    {
      path: `/administration/collection-seasons/${seasonId}/closure`,
      body: { revision: 5, confirmation: "2026/2027" },
    },
  ]);
});

it("retains a failed draft while an ordinary refresh is unavailable", async () => {
  // Given
  const user = userEvent.setup();
  let readAvailable = true;
  mockFetch.mockImplementation((url, options) =>
    options?.method === "POST"
      ? Promise.reject(new TypeError("Connection lost"))
      : !readAvailable &&
          String(url).endsWith(`/collection-seasons/${seasonId}`)
        ? Promise.resolve(refused(503))
        : peer.reads(url, options),
  );
  await renderCollection(
    <CloseSeasonScreen seasonId={seasonId} />,
    client,
    (cache) => {
      privateClient = cache;
    },
  );
  await user.type(
    await screen.findByLabelText("Nom exact de la saison"),
    "2026/2027",
  );
  await user.press(
    await screen.findByRole("button", { name: "Clôturer définitivement" }),
  );
  await screen.findByRole("alert");
  await waitFor(() => expect(privateClient.isFetching()).toBe(0));

  // When
  readAvailable = false;
  await fireEvent(screen.getByLabelText("Actualiser les données"), "refresh");

  // Then
  expect(
    await screen.findByText(
      "Une erreur est survenue. Veuillez réessayer plus tard.",
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Clôturer définitivement" }),
  ).toBeDisabled();
  expect(screen.getByDisplayValue("2026/2027")).toBeOnTheScreen();
});
