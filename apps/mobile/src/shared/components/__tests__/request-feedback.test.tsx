import { ErrorState } from "../state-card";
import { render, screen, userEvent } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/theme-provider";
import { RequestLoading } from "../request-feedback";

it("names a busy request without relying on its decorative animation", async () => {
  // Given
  await render(
    <ThemeProvider>
      <RequestLoading />
    </ThemeProvider>,
  );

  // When
  const loading = screen.getByRole("progressbar", {
    name: "Chargement en cours",
    busy: true,
  });

  // Then
  expect(loading).toBeOnTheScreen();
  expect(screen.queryByRole("button")).not.toBeOnTheScreen();
});

it("shows safe French failure copy without inventing a recovery action", async () => {
  // Given
  await render(
    <ThemeProvider>
      <ErrorState />
    </ThemeProvider>,
  );

  // When
  const error = screen.getByRole("alert", {
    name: "Une erreur est survenue",
  });

  // Then
  expect(error).toBeOnTheScreen();
  expect(screen.getByText("Veuillez réessayer plus tard.")).toBeOnTheScreen();
  expect(screen.queryByText(/accès|permission|droits/i)).not.toBeOnTheScreen();
  expect(screen.queryByRole("button")).not.toBeOnTheScreen();
});

it("leaves the waiting state when the owner reports failure", async () => {
  // Given
  const { rerender } = await render(
    <ThemeProvider>
      <RequestLoading />
    </ThemeProvider>,
  );

  // When
  await rerender(
    <ThemeProvider>
      <ErrorState />
    </ThemeProvider>,
  );

  // Then
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
  expect(screen.getByRole("alert")).toBeOnTheScreen();
});

it("invokes only the caller's explicit retry and leaves its outcome to the caller", async () => {
  // Given
  const onRetry = jest.fn();
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <ErrorState onRetry={onRetry} />
    </ThemeProvider>,
  );
  expect(onRetry).not.toHaveBeenCalled();

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(onRetry).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert")).toBeOnTheScreen();
});

it("announces caller-owned retry progress and prevents another activation until released", async () => {
  // Given
  const onRetry = jest.fn();
  const user = userEvent.setup();
  const { rerender } = await render(
    <ThemeProvider>
      <ErrorState onRetry={onRetry} retrying />
    </ThemeProvider>,
  );

  // When
  await user.press(
    screen.getByRole("button", {
      name: "Réessayer",
      busy: true,
      disabled: true,
    }),
  );

  // Then
  expect(onRetry).not.toHaveBeenCalled();

  // When
  await rerender(
    <ThemeProvider>
      <ErrorState onRetry={onRetry} />
    </ThemeProvider>,
  );
  await user.press(
    screen.getByRole("button", {
      name: "Réessayer",
      busy: false,
      disabled: false,
    }),
  );

  // Then
  expect(onRetry).toHaveBeenCalledTimes(1);
});
