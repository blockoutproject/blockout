import React, { useState } from "react";
import { Text, View } from "react-native";
import { render, userEvent } from "@testing-library/react-native";

import { ThemeProvider } from "@/src/shared/theme";
import Filters from "@/src/shared/ui/filters";
import { Filter } from "@/src/shared/view-models/filter";

const mockImpactAsync = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Medium: "medium" },
  impactAsync: () => mockImpactAsync(),
}));

const filterSeed: Filter[] = [
  { name: "Tous", isActive: true },
  { name: "En direct", isActive: false },
];

function FilterHarness() {
  const [filters, setFilters] = useState(filterSeed);

  return (
    <View>
      <Text testID="active-filter-state">
        {filters
          .filter((filter) => filter.isActive)
          .map((filter) => filter.name)
          .join(",")}
      </Text>
      <Filters filters={filters} setFilters={setFilters} singleSelect />
    </View>
  );
}

describe("Filters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps input filters and a reused seed immutable across mounts", async () => {
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <FilterHarness key="first-mount" />
      </ThemeProvider>,
    );

    await user.press(screen.getByRole("button", { name: "En direct" }));

    expect(screen.getByTestId("active-filter-state")).toHaveTextContent(
      "En direct",
    );
    expect(filterSeed).toEqual([
      { name: "Tous", isActive: true },
      { name: "En direct", isActive: false },
    ]);

    await screen.rerender(
      <ThemeProvider>
        <FilterHarness key="second-mount" />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("active-filter-state")).toHaveTextContent("Tous");
  });

  it("returns fresh objects when toggling a multi-select filter", async () => {
    const filters: Filter[] = [
      { name: "Tous", isActive: true },
      { name: "En direct", isActive: false },
    ];
    const setFilters = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <Filters filters={filters} setFilters={setFilters} />
      </ThemeProvider>,
    );

    await user.press(screen.getByRole("button", { name: "En direct" }));

    expect(setFilters).toHaveBeenCalledWith([
      { name: "Tous", isActive: true },
      { name: "En direct", isActive: true },
    ]);
    const updated = setFilters.mock.calls[0][0] as Filter[];
    expect(updated[0]).not.toBe(filters[0]);
    expect(updated[1]).not.toBe(filters[1]);
    expect(filters).toEqual([
      { name: "Tous", isActive: true },
      { name: "En direct", isActive: false },
    ]);
  });

  it("preserves single-select selection and deselection behavior", async () => {
    const filters: Filter[] = [
      { name: "Tous", isActive: true },
      { name: "En direct", isActive: false },
    ];
    const setFilters = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <Filters filters={filters} setFilters={setFilters} singleSelect />
      </ThemeProvider>,
    );

    await user.press(screen.getByRole("button", { name: "En direct" }));
    expect(setFilters).toHaveBeenLastCalledWith([
      { name: "Tous", isActive: false },
      { name: "En direct", isActive: true },
    ]);

    await user.press(screen.getByRole("button", { name: "Tous" }));
    expect(setFilters).toHaveBeenLastCalledWith([
      { name: "Tous", isActive: false },
      { name: "En direct", isActive: false },
    ]);
  });

  it("keeps the last required single selection active", async () => {
    const filters: Filter[] = [
      { name: "Tous", isActive: true },
      { name: "En direct", isActive: false },
    ];
    const setFilters = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <Filters
          filters={filters}
          setFilters={setFilters}
          singleSelect
          requireSelection
        />
      </ThemeProvider>,
    );

    await user.press(screen.getByRole("button", { name: "Tous" }));

    expect(setFilters).not.toHaveBeenCalled();
    expect(mockImpactAsync).not.toHaveBeenCalled();
    expect(filters).toEqual([
      { name: "Tous", isActive: true },
      { name: "En direct", isActive: false },
    ]);
  });
});
