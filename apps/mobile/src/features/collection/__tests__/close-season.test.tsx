import { screen, userEvent, waitFor } from "@testing-library/react-native";
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
  pressAction,
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
beforeEach(() => {
  peer = collectionPeer();
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
afterEach(() => {
  peer.client.clear();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

it("requires the exact displayed label and sends the current revision once", async () => {
  // Given
  mockFetch.mockImplementation((url, options) =>
    options?.method === "POST"
      ? Promise.resolve(json({ ...peer.season, revision: 6, state: "closed" }))
      : peer.reads(url, options),
  );
  await renderCollection(
    <CloseSeasonScreen seasonId={seasonId} />,
    peer.client,
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
  await pressAction("Clôturer définitivement");

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
  "retains the exact draft after %s, background refresh and route removal until explicit reread",
  async (failure) => {
    // Given
    mockFetch.mockImplementation((url, options) =>
      options?.method === "POST"
        ? failure === "lost"
          ? Promise.reject(new TypeError("Connection lost"))
          : Promise.resolve(refused(409))
        : peer.reads(url, options),
    );
    const view = await renderCollection(
      <CloseSeasonScreen seasonId={seasonId} />,
      peer.client,
    );
    await userEvent
      .setup()
      .type(
        await screen.findByLabelText("Nom exact de la saison"),
        "2026/2027",
      );

    // When
    await pressAction("Clôturer définitivement");
    await screen.findByText(
      "Le résultat doit être vérifié avant une nouvelle action.",
    );
    peer.season = { ...peer.season, revision: 7 };
    await peer.client.invalidateQueries();
    await view.rerender(<></>);
    await view.rerender(<CloseSeasonScreen seasonId={seasonId} />);

    // Then
    expect(await screen.findByDisplayValue("2026/2027")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Clôturer définitivement" }),
    ).toBeDisabled();
    await pressAction("Relire l’état");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Clôturer définitivement" }),
      ).toBeEnabled(),
    );
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(1);
  },
);

it("rereads an uncertain accepted closure without repeating the write", async () => {
  // Given
  mockFetch.mockImplementation((url, options) => {
    if (options?.method === "POST") {
      peer.season = { ...peer.season, revision: 6, state: "closed" };
      return Promise.reject(new TypeError("Lost acknowledgement"));
    }
    return peer.reads(url, options);
  });
  await renderCollection(
    <CloseSeasonScreen seasonId={seasonId} />,
    peer.client,
  );
  await userEvent
    .setup()
    .type(await screen.findByLabelText("Nom exact de la saison"), "2026/2027");

  // When
  await pressAction("Clôturer définitivement");
  await screen.findByText(
    "Le résultat doit être vérifié avant une nouvelle action.",
  );
  await pressAction("Relire l’état");

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
  await renderCollection(
    <CloseSeasonScreen seasonId={seasonId} />,
    peer.client,
  );
  await screen.findByLabelText("Nom exact de la saison");

  // When
  await pressAction("Annuler");

  // Then
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(0);
});

it("retains entered text while current collection permission is unavailable", async () => {
  // Given
  await renderCollection(
    <>
      <CloseSeasonScreen seasonId={seasonId} />
      <AccountActions />
    </>,
    peer.client,
  );
  await userEvent
    .setup()
    .type(await screen.findByLabelText("Nom exact de la saison"), "2026/");

  // When
  peer.permissions = {};
  await pressAction("Actualiser les permissions");

  // Then
  expect(
    await screen.findByText("Cette action nécessite une permission dédiée."),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("2026/")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Clôturer définitivement" }),
  ).toBeDisabled();
});

it("retains an incorrect draft through a background revision change and refuses to submit it", async () => {
  // Given
  await renderCollection(
    <CloseSeasonScreen seasonId={seasonId} />,
    peer.client,
  );
  await userEvent
    .setup()
    .type(await screen.findByLabelText("Nom exact de la saison"), "2026/");

  // When
  peer.season = { ...peer.season, revision: 6 };
  await peer.client.invalidateQueries();

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
  mockFetch.mockImplementation((url, options) =>
    options?.method === "POST"
      ? Promise.resolve(refused(422))
      : peer.reads(url, options),
  );
  await renderCollection(
    <CloseSeasonScreen seasonId={seasonId} />,
    peer.client,
  );
  await userEvent
    .setup()
    .type(await screen.findByLabelText("Nom exact de la saison"), "2026/2027");

  // When
  await pressAction("Clôturer définitivement");

  // Then
  expect(
    await screen.findByText(
      "La clôture a été refusée. Votre saisie est conservée.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByDisplayValue("2026/2027")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Clôturer définitivement" }),
  ).toBeEnabled();
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);
});

it("does not unlock uncertain closure when its explicit current-state read fails", async () => {
  // Given
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
    peer.client,
  );
  await userEvent
    .setup()
    .type(await screen.findByLabelText("Nom exact de la saison"), "2026/2027");
  await pressAction("Clôturer définitivement");
  await screen.findByText(
    "Le résultat doit être vérifié avant une nouvelle action.",
  );

  // When
  readAvailable = false;
  await pressAction("Relire l’état");

  // Then
  expect(
    await screen.findByText(
      "La relecture a échoué. Votre saisie est conservée.",
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Clôturer définitivement" }),
  ).toBeDisabled();
  expect(screen.getByDisplayValue("2026/2027")).toBeOnTheScreen();
});
