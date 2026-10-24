import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
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
afterEach(() => jest.restoreAllMocks());

/** Observes the same completion boundary as root routing without replacing its behavior. */
function Journey() {
  const discovery = useDiscovery();
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

it("waits for persistence and retains the journey on write failure before an explicit retry", async () => {
  // Given
  const user = userEvent.setup();
  const write = Promise.withResolvers<void>();
  jest.spyOn(AsyncStorage, "setItem").mockReturnValueOnce(write.promise);
  await openDiscovery();

  // When
  await user.press(await screen.findByRole("button", { name: "Passer" }));

  // Then
  expect(screen.queryByText("Ordinary routes")).toBeNull();
  expect(screen.getByRole("button", { name: "Passer" })).toBeDisabled();

  // When
  await act(async () => write.reject(new Error("Storage")));

  // Then
  expect(
    await screen.findByText(
      /La fin de la découverte n’a pas pu être enregistrée/,
    ),
  ).toBeOnTheScreen();
  expect(await readDiscoveryCompletion()).toBe(false);

  // When
  await user.press(screen.getByRole("button", { name: "Passer" }));

  // Then
  expect(await screen.findByText("Ordinary routes")).toBeOnTheScreen();
});

it("offers explicit recovery when the installation flag cannot be read", async () => {
  // Given
  jest
    .spyOn(AsyncStorage, "getItem")
    .mockRejectedValueOnce(new Error("Storage"));
  const user = userEvent.setup();
  await openDiscovery();

  // When
  await user.press(await screen.findByRole("button", { name: "Réessayer" }));

  // Then
  expect(
    await screen.findByRole("button", { name: "Passer" }),
  ).toBeOnTheScreen();
  expect(await readDiscoveryCompletion()).toBe(false);
});
