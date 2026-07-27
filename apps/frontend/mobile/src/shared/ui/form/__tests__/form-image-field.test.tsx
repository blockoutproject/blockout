import { render, userEvent } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";

import { ThemeProvider } from "@/src/shared/theme";
import {
  FormImageField,
  type FormImageValue,
} from "@/src/shared/ui/form/form-image-field";
import { pickSquarePngImage } from "@/src/shared/ui/form/image-picker-adapter";

jest.mock("@/src/shared/ui/form/image-picker-adapter", () => ({
  pickSquarePngImage: jest.fn(),
}));

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-image", () => ({ Image: "Image" }));

const mockPickSquarePngImage = jest.mocked(pickSquarePngImage);

const emptyValue: FormImageValue = {
  uri: null,
  upload: null,
  removed: false,
};

const renderField = (
  value: FormImageValue,
  onChange: (nextValue: FormImageValue) => void,
) => (
  <ThemeProvider>
    <FormImageField
      title="Logo"
      value={value}
      fileName="club.png"
      placeholder="Ajouter un logo"
      pickAccessibilityLabel="Choisir le logo du club"
      changeLabel="Changer le logo"
      removeLabel="Supprimer le logo"
      contentFit="contain"
      onChange={onChange}
      pickActionTestID="club-logo-picker-action"
      changeActionTestID="club-logo-change-action"
      removeActionTestID="club-logo-remove-action"
    />
  </ThemeProvider>
);

describe("FormImageField", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("coordinates image choose, replace, and remove values", async () => {
    const firstUpload = {
      uri: "file:///first.png",
      name: "club.png",
      type: "image/png",
    };
    const replacementUpload = {
      uri: "file:///replacement.png",
      name: "club.png",
      type: "image/png",
    };
    mockPickSquarePngImage
      .mockResolvedValueOnce(firstUpload)
      .mockResolvedValueOnce(replacementUpload);
    const onChange = jest.fn();
    const user = userEvent.setup();
    const screen = await render(renderField(emptyValue, onChange));

    await user.press(screen.getByTestId("club-logo-picker-action"));

    expect(onChange).toHaveBeenLastCalledWith({
      uri: firstUpload.uri,
      upload: firstUpload,
      removed: false,
    });

    await screen.rerender(
      renderField(
        {
          uri: firstUpload.uri,
          upload: firstUpload,
          removed: false,
        },
        onChange,
      ),
    );
    await user.press(screen.getByTestId("club-logo-change-action"));

    expect(onChange).toHaveBeenLastCalledWith({
      uri: replacementUpload.uri,
      upload: replacementUpload,
      removed: false,
    });

    await screen.rerender(
      renderField(
        {
          uri: replacementUpload.uri,
          upload: replacementUpload,
          removed: false,
        },
        onChange,
      ),
    );
    await user.press(screen.getByTestId("club-logo-remove-action"));

    expect(onChange).toHaveBeenLastCalledWith({
      uri: null,
      upload: null,
      removed: true,
    });
  });

  it("preserves the current value when selection is cancelled", async () => {
    mockPickSquarePngImage.mockResolvedValue(null);
    const onChange = jest.fn();
    const user = userEvent.setup();
    const screen = await render(renderField(emptyValue, onChange));

    await user.press(screen.getByTestId("club-logo-picker-action"));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the existing processing error when the adapter fails", async () => {
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    mockPickSquarePngImage.mockRejectedValue(new Error("native failure"));
    const user = userEvent.setup();
    const screen = await render(renderField(emptyValue, jest.fn()));

    await user.press(screen.getByTestId("club-logo-picker-action"));

    expect(alert).toHaveBeenCalledWith(
      "Erreur",
      "Impossible de traiter l’image.",
    );
  });
});
