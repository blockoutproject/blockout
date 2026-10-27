import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import {
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { Linking } from "react-native";
import { StoreAction } from "../components/store-action";
import { ThemeProvider } from "../../../shared/theme/theme-provider";

beforeEach(() => jest.spyOn(Linking, "openURL"));
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

it("keeps the action available after a failed native open and retries explicitly", async () => {
  // Given
  jest
    .mocked(Linking.openURL)
    .mockRejectedValueOnce(new Error("Store unavailable"))
    .mockResolvedValueOnce(undefined);
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <ActionFeedbackProvider scopeKey="test">
        <StoreAction url="https://apps.apple.com/app/id123" />
      </ActionFeedbackProvider>
    </ThemeProvider>,
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Mettre à jour l’application" }),
  );

  // Then
  expect(
    await screen.findByText(
      "Une erreur est survenue. Veuillez réessayer plus tard.",
    ),
  ).toBeOnTheScreen();
  expect(Linking.openURL).toHaveBeenCalledTimes(1);

  // When
  await user.press(
    screen.getByRole("button", { name: "Mettre à jour l’application" }),
  );

  // Then
  expect(Linking.openURL).toHaveBeenLastCalledWith(
    "https://apps.apple.com/app/id123",
  );
  expect(Linking.openURL).toHaveBeenCalledTimes(2);
  expect(
    screen.getByRole("button", { name: "Mettre à jour l’application" }),
  ).toBeOnTheScreen();
});
