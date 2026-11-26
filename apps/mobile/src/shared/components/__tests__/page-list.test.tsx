import "@/shared/native/test-support/tab-view-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { LoadingGroup } from "../loading-group";
import { PageList } from "../page-list";
import { useContentReveal } from "../content-reveal";

function Results({
  items,
  loading,
  onReady,
  reveal,
}: Readonly<{
  items: string[];
  loading: boolean;
  onReady?: () => void;
  reveal?: { active: boolean };
}>) {
  const presentation = useContentReveal();
  return (
    <PageList
      testID="results-list"
      data={items}
      reveal={reveal && { ...reveal, presentation }}
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

it.each([
  { scene: "an ordinary list", reveal: undefined },
  { scene: "a retained scene awaiting reveal", reveal: { active: false } },
])(
  "keeps decorative placeholders until $scene has laid out its content",
  async ({ reveal }) => {
    // Given
    const onReady = jest.fn();
    const view = await render(
      <Results items={[]} loading onReady={onReady} reveal={reveal} />,
      { wrapper: ThemeProvider },
    );
    expect(
      screen.getByRole("progressbar", { name: "Loading results" }),
    ).toBeOnTheScreen();

    // When
    await view.rerender(
      <Results
        items={["First match"]}
        loading={false}
        onReady={onReady}
        reveal={reveal}
      />,
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
    expect(screen.getByText("First match")).toBeOnTheScreen();
    expect(
      screen.queryByText("Placeholders", { includeHiddenElements: true }),
    ).toBeNull();
  },
);

it("releases loading feedback immediately for a successful empty list", async () => {
  // Given
  const view = await render(<Results items={[]} loading />, {
    wrapper: ThemeProvider,
  });
  expect(screen.getByRole("progressbar")).toBeOnTheScreen();

  // When
  await view.rerender(<Results items={[]} loading={false} />);

  // Then
  expect(screen.getByText("No results")).toBeOnTheScreen();
  expect(
    screen.queryByText("Placeholders", { includeHiddenElements: true }),
  ).toBeNull();
});
