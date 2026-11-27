import "@/shared/native/test-support/tab-view-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { createRef } from "react";
import { Text } from "react-native";
import type { LegendListRef } from "@legendapp/list/react-native";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { BottomContentInsetContext } from "../bottom-content-inset";
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

it("samples only rows between pinned chrome when a covered list first becomes active", async () => {
  // Given
  const list = createRef<LegendListRef>();
  const sampled = jest.fn();

  function ScrolledResults({ active }: Readonly<{ active: boolean }>) {
    const presentation = useContentReveal(active);
    return (
      <PageViewport header={<Text>Results</Text>} headerMinHeight={60}>
        <BottomContentInsetContext value={80}>
          <PageList
            ref={list}
            testID="results-list"
            data={["Above", "Visible", "Below"]}
            keyExtractor={(item) => item}
            renderItem={({ item }) => <Text>{item}</Text>}
            reveal={{ presentation: { ...presentation, start: sampled } }}
          />
        </BottomContentInsetContext>
      </PageViewport>
    );
  }

  const view = await render(<ScrolledResults active={false} />, {
    wrapper: ThemeProvider,
  });
  const viewport = list.current!;
  jest.spyOn(viewport, "getState").mockReturnValue({
    ...viewport.getState(),
    scroll: 60,
    scrollLength: 190,
    start: 0,
    end: 2,
    positionAtIndex: (index) => index * 60,
    sizeAtIndex: () => 60,
  });

  await fireEvent(screen.getByTestId("results-list"), "ready");
  expect(sampled).not.toHaveBeenCalled();

  // When
  await view.rerender(<ScrolledResults active />);

  // Then
  expect(sampled).toHaveBeenCalledWith(["Visible"]);
});
