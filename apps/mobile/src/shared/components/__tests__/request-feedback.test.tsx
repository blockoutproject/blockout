import { ErrorState } from "../state-card";
import { render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { RequestLoading } from "../request-feedback";

it("announces a busy read without visible loading copy", async () => {
  // Given: the default loading presentation.

  // When
  await render(
    <ThemeProvider>
      <RequestLoading />
    </ThemeProvider>,
  );

  // Then
  expect(
    screen.getByRole("progressbar", {
      name: "Chargement en cours",
      busy: true,
    }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Chargement en cours")).not.toBeOnTheScreen();
  expect(screen.queryByRole("button")).not.toBeOnTheScreen();
});

it("shows safe French failure copy without inventing a recovery action", async () => {
  // Given: no retry callback.

  // When
  await render(
    <ThemeProvider>
      <ErrorState />
    </ThemeProvider>,
  );

  // Then
  expect(
    screen.getByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(screen.getByText("Veuillez réessayer plus tard.")).toBeOnTheScreen();
  expect(screen.queryByText(/accès|permission|droits/i)).not.toBeOnTheScreen();
  expect(screen.queryByRole("button")).not.toBeOnTheScreen();
});
