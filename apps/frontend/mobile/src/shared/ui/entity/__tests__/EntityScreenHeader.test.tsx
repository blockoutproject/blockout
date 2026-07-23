import { render, userEvent } from "@testing-library/react-native";
import React from "react";

import {ThemeProvider} from "@/src/shared/theme";
import EntityScreenHeader from "@/src/shared/ui/entity/EntityScreenHeader";

const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe("EntityScreenHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("exposes the entity title and concrete screen actions", async () => {
    const onEdit = jest.fn();
    const onOpenReport = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <EntityScreenHeader
          title="Blockout Volley"
          onEdit={onEdit}
          onOpenReport={onOpenReport}
          testID="team-header"
          backActionTestID="team-back-action"
          editActionTestID="team-edit-action"
          reportActionTestID="team-report-action"
        />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole("header", { name: "Blockout Volley" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retour" })).toBe(
      screen.getByTestId("team-back-action"),
    );

    await user.press(screen.getByRole("button", { name: "Retour" }));
    await user.press(screen.getByRole("button", { name: "Modifier" }));
    await user.press(
      screen.getByRole("button", { name: "Signaler un problème" }),
    );

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onOpenReport).toHaveBeenCalledTimes(1);
  });

  it("does not expose the edit action without permission", async () => {
    const screen = await render(
      <ThemeProvider>
        <EntityScreenHeader
          title="Poule A"
          onOpenReport={jest.fn()}
          testID="pool-header"
          backActionTestID="pool-back-action"
          editActionTestID="pool-edit-action"
          reportActionTestID="pool-report-action"
        />
      </ThemeProvider>,
    );

    expect(screen.queryByRole("button", { name: "Modifier" })).toBeNull();
    expect(screen.queryByTestId("pool-edit-action")).toBeNull();
  });
});
