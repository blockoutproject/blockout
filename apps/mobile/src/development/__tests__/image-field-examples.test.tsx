import { act, render, screen, userEvent } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import type { PropsWithChildren } from "react";
import { ActionFeedbackProvider } from "../../shared/components/action-feedback";
import { ThemeProvider } from "../../shared/theme/theme-provider";
import { ImageFieldExamplesScreen } from "../image-field-examples";

jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock("expo-file-system", () => ({
  File: jest.fn((uri: string) => ({
    uri,
    get exists() {
      return !mockDeletedFiles.has(uri);
    },
    delete: () => {
      mockDeletedFiles.add(uri);
      mockDeleteFile(uri);
    },
    base64: () => mockReadBase64(uri),
  })),
  Paths: {
    cache: { uri: "file:///cache/" },
    normalize: jest.requireActual("expo-file-system").Paths.normalize,
  },
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

// Separate File handles observe the same native path after deletion.
const mockDeletedFiles = new Set<string>();
const mockDeleteFile = jest.fn<void, [string]>();
const mockReadBase64 = jest.fn<Promise<string>, [string]>();
const launch = jest.mocked(ImagePicker.launchImageLibraryAsync);
const photo: ImagePicker.ImagePickerAsset = {
  uri: "file:///cache/ImagePicker/selection.jpg",
  width: 1200,
  height: 800,
  mimeType: "image/jpeg",
  fileSize: 2048,
};

beforeEach(() => {
  mockDeletedFiles.clear();
  mockDeleteFile.mockReset();
  mockReadBase64.mockReset();
  launch.mockReset();
});

/** The demonstration uses the real theme, feedback, selection and preview owners. */
function MediaProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <ActionFeedbackProvider scopeKey="image-example-test">
        {children}
      </ActionFeedbackProvider>
    </ThemeProvider>
  );
}

it("keeps the demonstration preview in memory after its picker cache copy is released", async () => {
  // Given
  launch.mockResolvedValue({ canceled: false, assets: [photo] });
  const bytes = Promise.withResolvers<string>();
  mockReadBase64.mockReturnValue(bytes.promise);
  const user = userEvent.setup();
  await render(
    <MediaProviders>
      <ImageFieldExamplesScreen />
    </MediaProviders>,
  );

  // When
  await user.press(screen.getByRole("button", { name: "Choisir une image" }));

  // Then
  expect(mockReadBase64).toHaveBeenCalledWith(photo.uri);
  expect(mockDeleteFile).not.toHaveBeenCalled();

  // When
  await act(async () => bytes.resolve("cHJldmlldw=="));

  // Then
  expect(
    await screen.findByRole("button", { name: "Aperçu : Image 1" }),
  ).toBeOnTheScreen();
  expect(mockDeleteFile).toHaveBeenCalledWith(photo.uri);

  // When
  await user.press(screen.getByRole("button", { name: "Aperçu : Image 1" }));

  // Then
  // Expo Image receives independent bytes; Jest does not decode them in a native image view.
  expect(screen.getByRole("image", { name: "Image 1" })).toHaveProp("source", [
    expect.objectContaining({ uri: "data:image/jpeg;base64,cHJldmlldw==" }),
  ]);

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  await user.press(
    screen.getByRole("button", { name: "Supprimer l’image : Image 1" }),
  );

  // Then
  expect(
    screen.queryByRole("button", { name: "Aperçu : Image 1" }),
  ).not.toBeOnTheScreen();
  expect(mockDeleteFile).toHaveBeenCalledTimes(1);
});
