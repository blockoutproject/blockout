import type { File } from "expo-file-system";
import * as Sentry from "@sentry/react-native";
import { deletePreparedImage } from "../delete-prepared-image";

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

afterEach(() => jest.clearAllMocks());

it("leaves an already removed cache file alone", () => {
  // Given
  const file = { exists: false, delete: jest.fn() };

  // When
  deletePreparedImage(file as unknown as File);

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
  expect(() => deletePreparedImage(file as unknown as File)).not.toThrow();

  // Then
  expect(Sentry.captureException).toHaveBeenCalledWith(
    new Error("Prepared image cleanup failed"),
  );
  expect(Sentry.captureException).toHaveBeenCalledTimes(1);
});
