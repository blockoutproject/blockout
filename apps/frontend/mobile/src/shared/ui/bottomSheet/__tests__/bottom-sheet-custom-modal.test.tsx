import { render } from "@testing-library/react-native";
import React from "react";
import { Text, View } from "react-native";

import { ThemeProvider } from "@/src/shared/theme";
import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/bottom-sheet-custom-modal";

jest.mock("@gorhom/bottom-sheet", () => {
  const ReactModule = require("react") as typeof React;
  const { View: NativeView } = require("react-native");

  return {
    BottomSheetBackdrop: NativeView,
    BottomSheetModal: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(NativeView, null, children),
  };
});

describe("BottomSheetCustomModal", () => {
  it("composes the canonical sheet header with feature-owned content", async () => {
    const screen = await render(
      <ThemeProvider>
        <BottomSheetCustomModal
          title="Modifier le profil"
          message="Personnalise ta photo et ton pseudo."
        >
          <View>
            <Text>Contenu du formulaire</Text>
          </View>
        </BottomSheetCustomModal>
      </ThemeProvider>,
    );

    expect(
      screen.getByRole("header", { name: "Modifier le profil" }),
    ).toBeTruthy();
    expect(
      screen.getByText("Personnalise ta photo et ton pseudo."),
    ).toBeTruthy();
    expect(screen.getByText("Contenu du formulaire")).toBeTruthy();
  });
});
