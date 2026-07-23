import React from "react";
import {render, userEvent} from "@testing-library/react-native";

import PdfViewerHeader from "@/src/modules/pdf/ui/PdfViewerHeader";
import {ThemeProvider} from "@/src/shared/theme";

const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({back: mockBack}),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));

describe("PdfViewerHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("closes the viewer and opens its report action", async () => {
    const onOpenReport = jest.fn();
    const user = userEvent.setup();
    const screen = await render(
      <ThemeProvider>
        <PdfViewerHeader title="Feuille de match" onOpenReport={onOpenReport}/>
      </ThemeProvider>,
    );

    expect(screen.getByText("Feuille de match")).toBeTruthy();
    expect(
      screen.getByRole("button", {name: "Fermer le document"}),
    ).toBe(screen.getByTestId("pdf-viewer-close-action"));

    await user.press(screen.getByRole("button", {name: "Fermer le document"}));
    await user.press(
      screen.getByRole("button", {
        name: "Signaler un problème avec ce document",
      }),
    );

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(onOpenReport).toHaveBeenCalledTimes(1);
  });
});
