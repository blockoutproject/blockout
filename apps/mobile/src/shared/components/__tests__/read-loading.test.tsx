import { Text } from "react-native";
import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { ThemeProvider } from "../../theme/theme-provider";
import { LoadingGroup } from "../loading-group";
import { Skeleton } from "../skeleton";
import { hasReadError, ReadFeedback } from "../read-feedback";
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

it("does not invent an Error or loading state before a suspended first read runs", async () => {
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

    // Then
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button")).not.toBeOnTheScreen();
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

/** A real Query drives both accepted content and shared feedback; only its transport is controlled. */
function RecoveringRead({
  read,
  resource = "matches",
}: Readonly<{ read: () => Promise<string[]>; resource?: string }>) {
  const query = useQuery({ queryKey: [resource], queryFn: read });
  if (!hasReadError(query) && query.data) {
    return <Text>{query.data.join(", ") || "Aucun match"}</Text>;
  }
  return (
    <ReadFeedback
      key={resource}
      query={query}
      loadingContent={
        <LoadingGroup label="Chargement des matchs">
          <Skeleton />
        </LoadingGroup>
      }
    />
  );
}

it("keeps the first Error card while an explicit retry pauses, resumes and confirms Empty", async () => {
  // Given: the real query has exhausted its first read without accepted data.
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  const response = Promise.withResolvers<string[]>();
  const read = jest
    .fn()
    .mockRejectedValueOnce(new Error("Unavailable"))
    .mockImplementationOnce(() => response.promise);
  const user = userEvent.setup();
  await render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <RecoveringRead read={read} />
      </QueryClientProvider>
    </ThemeProvider>,
  );
  await screen.findByRole("alert");

  try {
    // When: Query owns suspension; the attempted safe read has not reached the transport.
    await act(() => onlineManager.setOnline(false));
    await user.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    expect(screen.getByRole("alert")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Réessayer", busy: false }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("progressbar")).not.toBeOnTheScreen();
    expect(read).toHaveBeenCalledTimes(1);

    // When
    await act(() => onlineManager.setOnline(true));

    // Then
    expect(
      await screen.findByRole("button", {
        name: "Réessayer",
        busy: true,
        disabled: true,
      }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("alert")).toBeOnTheScreen();
    expect(
      screen.queryByRole("progressbar", { name: "Chargement des matchs" }),
    ).not.toBeOnTheScreen();

    // When
    await act(() => response.resolve([]));

    // Then
    expect(await screen.findByText("Aucun match")).toBeOnTheScreen();
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
    expect(read).toHaveBeenCalledTimes(2);
  } finally {
    onlineManager.setOnline(true);
    await act(() => response.resolve([]));
    client.clear();
  }
});

it("keeps authorized cached data hidden after background failure and never animates the card for background recovery", async () => {
  // Given: accepted data stays in Query while its later read fails.
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  client.setQueryData(["matches"], ["Match conservé"]);
  const response = Promise.withResolvers<string[]>();
  const read = jest
    .fn()
    .mockRejectedValueOnce(new Error("Unavailable"))
    .mockImplementationOnce(() => response.promise);
  await render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <RecoveringRead read={read} />
      </QueryClientProvider>
    </ThemeProvider>,
  );
  await screen.findByRole("alert");

  try {
    // When: automatic recovery is not an explicit card action.
    let recovery: Promise<void>;
    await act(() => {
      recovery = client.refetchQueries({ queryKey: ["matches"] });
    });

    // Then
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(
      screen.getByRole("button", { name: "Réessayer", busy: false }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Match conservé")).not.toBeOnTheScreen();
    expect(client.getQueryData(["matches"])).toEqual(["Match conservé"]);

    // When
    await act(async () => {
      response.resolve(["Match confirmé"]);
      await recovery;
    });

    // Then
    expect(await screen.findByText("Match confirmé")).toBeOnTheScreen();
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  } finally {
    await act(() => response.resolve([]));
    client.clear();
  }
});

it("leaves Retry available after another failed explicit read and starts a new resource with its own skeleton", async () => {
  // Given
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  const next = Promise.withResolvers<string[]>();
  const read = jest.fn().mockRejectedValue(new Error("Unavailable"));
  const view = (resource: string, transport: () => Promise<string[]>) => (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <RecoveringRead resource={resource} read={transport} />
      </QueryClientProvider>
    </ThemeProvider>
  );
  const result = await render(view("first", read));
  await screen.findByRole("alert");

  try {
    // When
    await userEvent.press(screen.getByRole("button", { name: "Réessayer" }));

    // Then
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole("button", { name: "Réessayer", busy: false }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("alert")).toBeOnTheScreen();

    // When
    await result.rerender(view("second", () => next.promise));

    // Then
    expect(
      await screen.findByRole("progressbar", { name: "Chargement des matchs" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();

    // When
    await act(() => next.resolve(["Autre contexte"]));

    // Then
    expect(await screen.findByText("Autre contexte")).toBeOnTheScreen();
  } finally {
    await act(() => next.resolve([]));
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
