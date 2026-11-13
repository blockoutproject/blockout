import { createQueryClient } from "@/shared/query/query-client";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
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
jest.mock("@/features/onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "@/features/accounts/test-support/native-auth0",
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
  jest.useFakeTimers();
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
  // Await pending native/Query batches before restoring the test's real timer environment.
  await act(async () => jest.runOnlyPendingTimersAsync());
  jest.useRealTimers();
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
    mockFetch.mockImplementation((url, options) => {
      if (options?.method === "POST") {
        if (failure === "lost") {
          return Promise.reject(new TypeError("lost"));
        }
        return Promise.resolve(refused(409));
      }
      return peer.reads(url, options);
    });
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

it.each([422, 409])(
  "retains the draft after a definite %i refusal and can explicitly submit again",
  async (status) => {
    // Given
    const user = userEvent.setup();
    mockFetch.mockImplementation((url, options) =>
      options?.method === "POST"
        ? Promise.resolve(
            json(
              {
                type: "urn:blockout:problem:conflict",
                title: "Refused",
                status,
              },
              status,
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
  },
);

it.each(["pending", "failed"] as const)(
  "permits another explicit closure with the retained confirmation while refresh is %s",
  async (phase) => {
    // Given
    const user = userEvent.setup();
    const refreshed = Promise.withResolvers<void>();
    let writes = 0;
    mockFetch.mockImplementation(async (url, options) => {
      if (options?.method === "POST") {
        writes++;
        throw new TypeError("Connection lost");
      }
      if (
        writes > 0 &&
        String(url).endsWith(`/collection-seasons/${seasonId}`)
      ) {
        await refreshed.promise;
        return refused(503);
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
    try {
      await user.press(
        screen.getByRole("button", { name: "Clôturer définitivement" }),
      );
      await screen.findByRole("alert");
      if (phase === "failed") {
        refreshed.resolve();
        await waitFor(() => expect(privateClient.isFetching()).toBe(0));
      }

      // Then
      expect(screen.getByLabelText("Nom exact de la saison")).toHaveProp(
        "editable",
        true,
      );
      expect(
        screen.getByRole("button", { name: "Clôturer définitivement" }),
      ).toBeEnabled();
      expect(screen.getByDisplayValue("2026/2027")).toBeOnTheScreen();
      expect(writes).toBe(1);

      // When: this press, not the dependent read, sends the second command.
      await user.press(
        screen.getByRole("button", { name: "Clôturer définitivement" }),
      );

      // Then
      await waitFor(() => expect(writes).toBe(2));
      expect(screen.getByDisplayValue("2026/2027")).toBeOnTheScreen();
      expect(
        mockFetch.mock.calls
          .filter(([, options]) => options?.method === "POST")
          .map(([, options]) => JSON.parse(String(options?.body))),
      ).toEqual([
        { revision: 5, confirmation: "2026/2027" },
        { revision: 5, confirmation: "2026/2027" },
      ]);
    } finally {
      refreshed.resolve();
      await waitFor(() => expect(privateClient.isFetching()).toBe(0));
    }
  },
);
