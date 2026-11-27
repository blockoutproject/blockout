import "@/shared/native/test-support/tab-view-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { createRef } from "react";
import { Text } from "react-native";
import type { LegendListRef } from "@legendapp/list/react-native";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { LoadingGroup } from "../loading-group";
import { PageList } from "../page-list";
import { useContentReveal } from "../content-reveal";
import { PageViewport } from "../navigation-backdrop";

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
  const presentation = useContentReveal(reveal?.active ?? false);
  return (
    <PageList
      testID="results-list"
      data={items}
      reveal={reveal && { presentation }}
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

it("excludes a row scrolled entirely behind the page header from the first presentation", async () => {
  // Given
  const list = createRef<LegendListRef>();
  const sampled = jest.fn();

  function ScrolledResults() {
    const presentation = useContentReveal(true);
    return (
      <PageViewport header={<Text>Results</Text>} headerMinHeight={60}>
        <PageList
          ref={list}
          testID="results-list"
          data={["Covered", "Visible"]}
          keyExtractor={(item) => item}
          renderItem={({ item }) => <Text>{item}</Text>}
          reveal={{ presentation: { ...presentation, start: sampled } }}
        />
      </PageViewport>
    );
  }

  await render(<ScrolledResults />, { wrapper: ThemeProvider });
  const viewport = list.current!;
  jest.spyOn(viewport, "getState").mockReturnValue({
    ...viewport.getState(),
    scroll: 60,
    scrollLength: 400,
    start: 0,
    end: 1,
    positionAtIndex: (index) => index * 60,
    sizeAtIndex: () => 60,
  });

  // When
  await fireEvent(screen.getByTestId("results-list"), "ready");

  // Then
  expect(sampled).toHaveBeenCalledWith(["Visible"]);
});
