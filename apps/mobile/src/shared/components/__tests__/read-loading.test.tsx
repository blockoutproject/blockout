import { Text } from "react-native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/theme-provider";
import { LoadingGroup } from "../loading-group";
import { Skeleton } from "../skeleton";
import { ReadFeedback } from "../read-feedback";
import { ListContinuation } from "../list-continuation";

it("does not announce a disabled or idle pending read as loading", async () => {
  // Given
  const refetch = jest.fn();
  await render(
    <ThemeProvider>
      <ReadFeedback
        query={{ isPending: true, isError: false, isFetching: false, refetch }}
        loadingContent={
          <LoadingGroup label="Chargement des matchs">
            <Skeleton />
          </LoadingGroup>
        }
      />
    </ThemeProvider>,
  );

  // When
  const loading = screen.queryByRole("progressbar");

  // Then
  expect(loading).not.toBeOnTheScreen();
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  expect(refetch).not.toHaveBeenCalled();
});

it("announces the caller's known pending content once and leaves retry with the failed read", async () => {
  // Given
  const refetch = jest.fn();
  const query = { isPending: true, isError: false, isFetching: true, refetch };
  const loadingContent = (
    <LoadingGroup label="Chargement des matchs">
      <Skeleton />
    </LoadingGroup>
  );
  const { rerender } = await render(
    <ThemeProvider>
      <ReadFeedback query={query} loadingContent={loadingContent} />
    </ThemeProvider>,
  );

  // When
  const pending = screen.getAllByRole("progressbar", {
    name: "Chargement des matchs",
    busy: true,
  });

  // Then
  expect(pending).toHaveLength(1);
  expect(screen.queryByText("Chargement des matchs")).not.toBeOnTheScreen();
  expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  expect(refetch).not.toHaveBeenCalled();

  // When
  await rerender(
    <ThemeProvider>
      <ReadFeedback
        query={{ ...query, isPending: false, isError: true, isFetching: false }}
        loadingContent={loadingContent}
      />
    </ThemeProvider>,
  );
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
  expect(
    screen.getByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(refetch).toHaveBeenCalledTimes(1);
});

it("keeps accepted content beside compact continuation feedback and retries only on explicit activation", async () => {
  // Given
  const onRetry = jest.fn();
  const { rerender } = await render(
    <ThemeProvider>
      <Text>Match conservé</Text>
      <ListContinuation loading failed={false} onRetry={onRetry} />
    </ThemeProvider>,
  );

  // When
  await screen.findByRole("progressbar", {
    name: "Chargement de la suite…",
    busy: true,
  });

  // Then
  expect(screen.getAllByRole("progressbar")).toHaveLength(1);
  expect(screen.getByText("Chargement de la suite…")).toBeOnTheScreen();
  expect(screen.getByText("Match conservé")).toBeOnTheScreen();
  expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  expect(onRetry).not.toHaveBeenCalled();

  // When
  await rerender(
    <ThemeProvider>
      <Text>Match conservé</Text>
      <ListContinuation loading={false} failed disabled onRetry={onRetry} />
    </ThemeProvider>,
  );
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(screen.getByText("Match conservé")).toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
  expect(screen.getByText("Une erreur est survenue.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeDisabled();
  expect(onRetry).not.toHaveBeenCalled();

  // When
  await rerender(
    <ThemeProvider>
      <Text>Match conservé</Text>
      <ListContinuation loading={false} failed onRetry={onRetry} />
    </ThemeProvider>,
  );
  await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(onRetry).toHaveBeenCalledTimes(1);

  // When
  await rerender(
    <ThemeProvider>
      <Text>Match conservé</Text>
      <ListContinuation loading={false} failed={false} onRetry={onRetry} />
    </ThemeProvider>,
  );

  // Then
  expect(screen.getByText("Match conservé")).toBeOnTheScreen();
  expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  expect(screen.queryByText("Une erreur est survenue.")).not.toBeOnTheScreen();
});
