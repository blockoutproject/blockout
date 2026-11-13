import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { Text } from "react-native";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { RequestLoading } from "@/shared/components/request-feedback";
import { DiscoveryProvider, useDiscovery } from "../discovery-provider";
import { readDiscoveryCompletion } from "../discovery-state";
import { DiscoveryScreen } from "../screens/discovery-screen";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

/** Applies the root's installation-read and completion boundaries without replacing discovery behavior. */
function Journey() {
  const discovery = useDiscovery();
  if (discovery.loading) {
    return <RequestLoading />;
  }
  return discovery.complete ? (
    <Text>Ordinary routes</Text>
  ) : (
    <DiscoveryScreen />
  );
}

/** Renders actual local persistence, theme and discovery, controlling only native storage. */
async function openDiscovery() {
  return render(
    <ThemeProvider>
      <DiscoveryProvider>
        <Journey />
      </DiscoveryProvider>
    </ThemeProvider>,
  );
}

it("skips explicitly and retains completion after restart", async () => {
  // Given
  const user = userEvent.setup();
  const view = await openDiscovery();
  expect(
    await screen.findByText("Tout le volley.\nDans ta poche."),
  ).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Passer" }));

  // Then
  expect(await screen.findByText("Ordinary routes")).toBeOnTheScreen();
  expect(await readDiscoveryCompletion()).toBe(true);

  // When
  await view.unmount();
  await openDiscovery();

  // Then
  expect(await screen.findByText("Ordinary routes")).toBeOnTheScreen();
});

it("shows the five common steps and conditional Pro help without a restoration action", async () => {
  // Given
  const user = userEvent.setup();
  await openDiscovery();

  // When
  for (let step = 0; step < 4; step++) {
    await user.press(await screen.findByRole("button", { name: "Suivant" }));
  }

  // Then
  expect(
    screen.getByText(/Déjà sur Blockout \? Reconnecte-toi/),
  ).toBeOnTheScreen();
  expect(
    screen.getByText(
      /anciens suivis, notifications, contributions et personnalisations/,
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByText(
      /« Restaurer mes achats » dans l’espace Pro après connexion/,
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: /Restaurer/ })).toBeNull();
  expect(await readDiscoveryCompletion()).toBe(false);

  // When
  await user.press(screen.getByRole("button", { name: "Commencer" }));

  // Then
  expect(await screen.findByText("Ordinary routes")).toBeOnTheScreen();
  expect(await readDiscoveryCompletion()).toBe(true);
});

it("keeps interruption and back navigation incomplete", async () => {
  // Given
  const user = userEvent.setup();
  const view = await openDiscovery();
  await user.press(await screen.findByRole("button", { name: "Suivant" }));

  // When
  await user.press(screen.getByRole("button", { name: "Étape précédente" }));
  await view.unmount();
  await openDiscovery();

  // Then
  expect(
    await screen.findByText("Tout le volley.\nDans ta poche."),
  ).toBeOnTheScreen();
  expect(await readDiscoveryCompletion()).toBe(false);
});

it("enters immediately while persistence is pending and repeats discovery after a failed write", async () => {
  // Given
  const user = userEvent.setup();
  const write = Promise.withResolvers<void>();
  jest.spyOn(AsyncStorage, "setItem").mockReturnValueOnce(write.promise);
  const view = await openDiscovery();

  // When
  await user.press(await screen.findByRole("button", { name: "Passer" }));

  // Then
  expect(await screen.findByText("Ordinary routes")).toBeOnTheScreen();

  // When
  await act(async () => write.reject(new Error("Storage")));

  // Then
  expect(screen.getByText("Ordinary routes")).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(await readDiscoveryCompletion()).toBe(false);

  // When
  await view.unmount();
  await openDiscovery();

  // Then
  expect(
    await screen.findByRole("button", { name: "Passer" }),
  ).toBeOnTheScreen();
});

it("shows normal discovery when its optional completion flag cannot be read", async () => {
  // Given
  jest
    .spyOn(AsyncStorage, "getItem")
    .mockRejectedValueOnce(new Error("Storage"));
  const user = userEvent.setup();

  // When
  await openDiscovery();

  // Then
  expect(
    await screen.findByText("Tout le volley.\nDans ta poche."),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();

  // When
  await user.press(screen.getByRole("button", { name: "Passer" }));

  // Then
  expect(await screen.findByText("Ordinary routes")).toBeOnTheScreen();
  expect(await readDiscoveryCompletion()).toBe(true);
});

it("ignores a previous mount's unfinished read after the installation is completed", async () => {
  // Given
  const previous = Promise.withResolvers<string | null>();
  jest.spyOn(AsyncStorage, "getItem").mockReturnValueOnce(previous.promise);
  const first = await openDiscovery();

  // When
  await first.unmount();
  await AsyncStorage.setItem("blockout:v2-discovery-complete", "true");
  await openDiscovery();
  await screen.findByText("Ordinary routes");
  await act(async () => previous.resolve(null));

  // Then
  expect(screen.getByText("Ordinary routes")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Passer" }),
  ).not.toBeOnTheScreen();
});

it("preserves an acknowledged installation write when the submitting tree is removed", async () => {
  // Given
  const acknowledge = Promise.withResolvers<void>();
  const setItem = AsyncStorage.setItem;
  jest
    .spyOn(AsyncStorage, "setItem")
    .mockImplementationOnce(async (key, value) => {
      await acknowledge.promise;
      await setItem(key, value);
    });
  const user = userEvent.setup();
  const first = await openDiscovery();
  await user.press(await screen.findByRole("button", { name: "Passer" }));

  // When
  await first.unmount();
  await act(async () => acknowledge.resolve());
  await openDiscovery();

  // Then
  expect(await screen.findByText("Ordinary routes")).toBeOnTheScreen();
  expect(await readDiscoveryCompletion()).toBe(true);
});
