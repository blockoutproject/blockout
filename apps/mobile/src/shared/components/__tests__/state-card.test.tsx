import { render, screen, userEvent } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/theme-provider";
import { ErrorState } from "../state-card";

it("keeps the technical failure opaque with one title, one description and only the owner's retry", async () => {
  // Given
  const onRetry = jest.fn();
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <ErrorState onRetry={onRetry} />
    </ThemeProvider>,
  );

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Une erreur est survenue",
  );
  expect(screen.getAllByText("Veuillez réessayer plus tard.")).toHaveLength(1);
});

it("keeps explicit recovery unavailable while the owner is already retrying", async () => {
  // Given
  const onRetry = jest.fn();
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <ErrorState onRetry={onRetry} retrying />
    </ThemeProvider>,
  );

  // When
  await user.press(
    screen.getByRole("button", {
      name: "Réessayer",
      disabled: true,
      busy: true,
    }),
  );

  // Then
  expect(onRetry).not.toHaveBeenCalled();
});
