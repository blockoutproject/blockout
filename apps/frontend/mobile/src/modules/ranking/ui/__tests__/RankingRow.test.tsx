import {render, userEvent} from "@testing-library/react-native";
import React from "react";

import RankingRow from "@/src/modules/ranking/ui/RankingRow";
import {ThemeProvider} from "@/src/shared/providers/ThemeProvider";
import {darkTheme} from "@/src/shared/theme/themes";

describe("RankingRow", () => {
  it("renders ranking facts and opens the selected team", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <RankingRow
          item={{
            id: 7,
            name: "Blockout Volley",
            shortName: "Blockout",
            logoUrl: null,
            points: 18,
            played: 8,
            wins: 6,
            losses: 2,
            pointsPenalty: 0,
            coefSets: 1.4,
            coefPoints: 1.2,
            longitude: null,
            latitude: null,
          }}
          index={1}
          theme={darkTheme}
          highlightTeams={[{teamId: 7, color: "#123456"}]}
          gradient={["#123456", "#234567"]}
          onPress={onPress}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText("18")).toBeTruthy();
    const teamAction = screen.getByRole("button", {
      name: "Ouvrir l'équipe Blockout, classée 2",
    });
    expect(teamAction).toBe(screen.getByTestId("ranking-team-item-7"));

    await user.press(teamAction);

    expect(onPress).toHaveBeenCalledWith(7);
  });
});
