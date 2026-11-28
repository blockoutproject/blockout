import { ActionFeedbackProvider } from "@/shared/components/action-feedback";
import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { Linking } from "react-native";
import { StoreAction } from "../components/store-action";
import { ThemeProvider } from "@/shared/theme/theme-provider";

beforeEach(() => jest.spyOn(Linking, "openURL"));
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

it("waits for native opening before permitting an explicit retry after failure", async () => {
  // Given
  const opening = Promise.withResolvers<void>();
  jest
    .mocked(Linking.openURL)
    .mockReturnValueOnce(opening.promise)
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
    screen.getByRole("button", { name: "Mettre à jour l’application" }),
  ).toBeBusy();
  expect(
    screen.getByRole("button", { name: "Mettre à jour l’application" }),
  ).toBeDisabled();

  // When
  await user.press(
    screen.getByRole("button", { name: "Mettre à jour l’application" }),
  );

  // Then
  expect(Linking.openURL).toHaveBeenCalledTimes(1);

  // When
  await act(async () => opening.reject(new Error("Store unavailable")));

  // Then
  expect(
    await screen.findByText(
      "Une erreur est survenue. Veuillez réessayer plus tard.",
    ),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Mettre à jour l’application" }),
  ).toBeEnabled();
  expect(
    screen.getByRole("button", { name: "Mettre à jour l’application" }),
  ).not.toBeBusy();
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
