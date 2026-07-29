import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";

import { ThemeProvider } from "@/src/shared/theme";
import AdministrationControlCard from "@/src/modules/administration/ui/administration-control-card";

describe("AdministrationControlCard", () => {
  it("composes one accessible administration responsibility", async () => {
    const screen = await render(
      <ThemeProvider>
        <AdministrationControlCard testID="administration-maintenance-card">
          <Text>Mode maintenance</Text>
          <Text>Contrôle la disponibilité de l’application.</Text>
          <Text>Activé</Text>
          <Text>Configuration</Text>
        </AdministrationControlCard>
      </ThemeProvider>,
    );

    expect(screen.getByTestId("administration-maintenance-card")).toBeTruthy();
    expect(screen.getByText("Mode maintenance")).toBeTruthy();
    expect(
      screen.getByText("Contrôle la disponibilité de l’application."),
    ).toBeTruthy();
    expect(screen.getByText("Activé")).toBeTruthy();
    expect(screen.getByText("Configuration")).toBeTruthy();
  });
});
