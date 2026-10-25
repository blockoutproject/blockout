import { File } from "expo-file-system";
import * as Sentry from "@sentry/react-native";
import { deleteOwnedImage } from "../delete-owned-image";

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("expo-file-system", () => ({ File: jest.fn() }));

afterEach(() => jest.clearAllMocks());

it("leaves an already removed cache file alone", () => {
  // Given
  const file = { exists: false, delete: jest.fn() };

  // When
  deleteOwnedImage(file as unknown as File);

  // Then
  expect(file.delete).not.toHaveBeenCalled();
});

it("reports failed cleanup without exposing the native path or interrupting teardown", () => {
  // Given
  const file = {
    exists: true,
    delete: jest.fn(() => {
      throw new Error("file:///private-photo.png");
    }),
  };

  // When
  expect(() => deleteOwnedImage(file as unknown as File)).not.toThrow();

  // Then
  expect(Sentry.captureException).toHaveBeenCalledWith(
    new Error("Owned image cleanup failed"),
  );
  expect(Sentry.captureException).toHaveBeenCalledTimes(1);
});

it("contains native file construction errors when releasing an owned URI", () => {
  // Given
  jest.mocked(File).mockImplementation(() => {
    throw new Error("file:///private-source.png");
  });

  // When
  expect(() => deleteOwnedImage("file:///cache/owned.png")).not.toThrow();

  // Then
  expect(Sentry.captureException).toHaveBeenCalledWith(
    new Error("Owned image cleanup failed"),
  );
});
