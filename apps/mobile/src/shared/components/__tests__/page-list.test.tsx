import "@/shared/native/test-support/tab-view-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { LoadingGroup } from "../loading-group";
import { PageList } from "../page-list";

function Results({
  items,
  loading,
  onReady,
}: Readonly<{
  items: string[];
  loading: boolean;
  onReady?: () => void;
}>) {
  return (
    <PageList
      testID="results-list"
      data={items}
      keyExtractor={(item) => item}
      renderItem={({ item }) => <Text>{item}</Text>}
      ListHeaderComponent={<Text>Results</Text>}
      ListEmptyComponent={<Text>No results</Text>}
      loadingFeedback={{
        active: loading,
        content: (
          <LoadingGroup label="Loading results">
            <Text>Placeholders</Text>
          </LoadingGroup>
        ),
      }}
      onReady={onReady}
    />
  );
}

it("keeps decorative placeholders until the populated list is ready", async () => {
  // Given
  const onReady = jest.fn();
  const view = await render(<Results items={[]} loading onReady={onReady} />);
  expect(
    screen.getByRole("progressbar", { name: "Loading results" }),
  ).toBeOnTheScreen();

  // When
  await view.rerender(
    <Results items={["First match"]} loading={false} onReady={onReady} />,
  );

  // Then
  expect(screen.getByText("First match")).toBeOnTheScreen();
  expect(
    screen.getByText("Placeholders", { includeHiddenElements: true }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("progressbar")).toBeNull();

  // When
  await fireEvent(screen.getByTestId("results-list"), "ready");

  // Then
  expect(onReady).toHaveBeenCalledTimes(1);
  expect(
    screen.queryByText("Placeholders", { includeHiddenElements: true }),
  ).toBeNull();
});

it("releases loading feedback immediately for a successful empty list", async () => {
  // Given
  const view = await render(<Results items={[]} loading />);
  expect(screen.getByRole("progressbar")).toBeOnTheScreen();

  // When
  await view.rerender(<Results items={[]} loading={false} />);

  // Then
  expect(screen.getByText("No results")).toBeOnTheScreen();
  expect(
    screen.queryByText("Placeholders", { includeHiddenElements: true }),
  ).toBeNull();
});
