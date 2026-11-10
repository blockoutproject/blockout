import { Text } from "react-native";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { ThemeProvider } from "../../theme/theme-provider";
import { LoadingGroup } from "../loading-group";
import { Skeleton } from "../skeleton";
import { ReadFeedback } from "../read-feedback";
import { ListContinuation } from "../list-continuation";

it.each([
  { isPending: true, isError: false, isFetching: false },
  { isPending: true, isError: false, isFetching: true },
  { isPending: false, isError: true, isFetching: false },
])("does not load or retry a disabled read: %j", async (state) => {
  // Given
  const refetch = jest.fn();

  // When
  await render(
    <ThemeProvider>
      <ReadFeedback
        query={{
          ...state,
          isEnabled: false,
          refetch,
        }}
        loadingContent={
          <LoadingGroup label="Chargement des matchs">
            <Skeleton />
          </LoadingGroup>
        }
      />
    </ThemeProvider>,
  );

  // Then
  expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
  if (state.isError) {
    expect(screen.getByRole("alert")).toBeOnTheScreen();
  } else {
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  }
  expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  expect(refetch).not.toHaveBeenCalled();
});

/** Real Query state drives read feedback; the controlled boundary is never executed while paused. */
function PausedRead({ read }: Readonly<{ read: () => Promise<string> }>) {
  const query = useQuery({ queryKey: ["paused-read"], queryFn: read });
  return query.data ? (
    <Text>{query.data}</Text>
  ) : (
    <ReadFeedback
      query={query}
      loadingContent={
        <LoadingGroup label="Chargement des matchs">
          <Skeleton />
        </LoadingGroup>
      }
    />
  );
}

it("offers non-busy recovery for a suspended read and admits its result after native Query resumes", async () => {
  // Given
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  const read = jest.fn().mockResolvedValue("Match accepté");
  onlineManager.setOnline(false);
  try {
    await render(
      <ThemeProvider>
        <QueryClientProvider client={client}>
          <PausedRead read={read} />
        </QueryClientProvider>
      </ThemeProvider>,
    );

    // When
    await userEvent.press(
      screen.getByRole("button", { name: "Réessayer", busy: false }),
    );

    // Then
    expect(
      screen.getByRole("alert", { name: "Une erreur est survenue" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
    expect(read).not.toHaveBeenCalled();

    // When
    await act(() => onlineManager.setOnline(true));

    // Then
    expect(await screen.findByText("Match accepté")).toBeOnTheScreen();
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
    expect(read).toHaveBeenCalledTimes(1);
  } finally {
    onlineManager.setOnline(true);
    client.clear();
  }
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

  // When
  const { rerender } = await render(
    <ThemeProvider>
      <ReadFeedback query={query} loadingContent={loadingContent} />
    </ThemeProvider>,
  );

  // Then
  expect(
    screen.getAllByRole("progressbar", {
      name: "Chargement des matchs",
      busy: true,
    }),
  ).toHaveLength(1);
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

  // When
  const { rerender } = await render(
    <ThemeProvider>
      <Text>Match conservé</Text>
      <ListContinuation loading failed={false} onRetry={onRetry} />
    </ThemeProvider>,
  );

  // Then
  expect(
    await screen.findByRole("progressbar", {
      name: "Chargement de la suite…",
      busy: true,
    }),
  ).toBeOnTheScreen();
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
