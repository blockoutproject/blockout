import { render, screen, userEvent } from "@testing-library/react-native";
import { Text } from "react-native";
import { ThemeProvider } from "../../theme/theme-provider";
import {
  AccessDenied,
  RequestError,
  RequestLoading,
} from "../request-feedback";
import { TextField } from "../text-field";

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
      <RequestError />
    </ThemeProvider>,
  );

  // When
  const error = screen.getByRole("alert", {
    name: "Une erreur est survenue. Veuillez réessayer plus tard.",
  });

  // Then
  expect(error).toBeOnTheScreen();
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
      <RequestError />
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
      <RequestError onRetry={onRetry} />
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
      <RequestError onRetry={onRetry} retrying />
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
      <RequestError onRetry={onRetry} />
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

it("keeps retained content and editable input outside feedback while the caller withdraws retry", async () => {
  // Given
  const onRetry = jest.fn();
  const user = userEvent.setup();
  const { rerender } = await render(
    <ThemeProvider>
      <Text>Dernier résultat consultable</Text>
      <TextField label="Commentaire" defaultValue="" />
      <RequestError onRetry={onRetry} />
    </ThemeProvider>,
  );
  await user.type(screen.getByLabelText("Commentaire"), "Brouillon conservé");

  // When
  await rerender(
    <ThemeProvider>
      <Text>Dernier résultat consultable</Text>
      <TextField label="Commentaire" defaultValue="" />
      <RequestError message="La relecture a échoué. Votre brouillon est conservé." />
    </ThemeProvider>,
  );

  // Then
  expect(screen.getByText("Dernier résultat consultable")).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Brouillon conservé")).toBeOnTheScreen();
  expect(
    screen.getByRole("alert", {
      name: "La relecture a échoué. Votre brouillon est conservé.",
    }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  expect(onRetry).not.toHaveBeenCalled();
});

it("explains a denied permission without suggesting a technical retry", async () => {
  // Given
  await render(
    <ThemeProvider>
      <AccessDenied />
    </ThemeProvider>,
  );

  // When
  const refusal = screen.getByRole("alert", { name: "Accès refusé" });

  // Then
  expect(refusal).toBeOnTheScreen();
  expect(
    screen.getByText("Cette action nécessite une permission dédiée."),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  expect(screen.queryByText(/Une erreur est survenue/)).not.toBeOnTheScreen();
});
