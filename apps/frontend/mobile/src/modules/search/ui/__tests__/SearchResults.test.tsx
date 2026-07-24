import { render, userEvent } from "@testing-library/react-native";
import React from "react";
import { Pressable, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import SearchResults from "@/src/modules/search/ui/search-results";
import {ThemeProvider} from "@/src/shared/theme";

jest.mock("@gorhom/bottom-sheet", () => {
  const { TextInput } = require("react-native");
  return { BottomSheetTextInput: TextInput };
});

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

describe("SearchResults", () => {
  it("renders accessible search results and clears the controlled query", async () => {
    const setSearch = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <SearchResults
            search="Volley"
            setSearch={setSearch}
            data={[{ id: 7, name: "Blockout Volley" }]}
            isLoading={false}
            isError={false}
            refetch={jest.fn()}
            placeholder="Rechercher une équipe..."
            exampleLabel="Exemples d’équipes"
            emptyMessage="Aucune équipe trouvée."
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.name}
                testID={`search-team-item-${item.id}`}
              >
                <Text>{item.name}</Text>
              </Pressable>
            )}
            testID="search-team-results"
            inputTestID="search-team-input"
            listTestID="search-team-list"
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByLabelText("Rechercher une équipe...")).toBe(
      screen.getByTestId("search-team-input"),
    );
    expect(screen.getByTestId("search-team-list")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Blockout Volley" })).toBe(
      screen.getByTestId("search-team-item-7"),
    );

    await user.press(
      screen.getByRole("button", { name: "Effacer la recherche" }),
    );

    expect(setSearch).toHaveBeenCalledWith("");
  });

  it("exposes retry behavior without rendering a false empty state", async () => {
    const refetch = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider>
          <SearchResults
            search="Volley"
            setSearch={jest.fn()}
            isLoading={false}
            isError
            refetch={refetch}
            placeholder="Rechercher une équipe..."
            exampleLabel="Exemples d’équipes"
            emptyMessage="Aucune équipe trouvée."
            renderItem={() => null}
            testID="search-team-results"
            inputTestID="search-team-input"
            listTestID="search-team-list"
          />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(screen.getByTestId("search-error")).toBeTruthy();
    expect(screen.queryByText("Aucune équipe trouvée.")).toBeNull();

    await user.press(screen.getByRole("button", { name: "Réessayer" }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
