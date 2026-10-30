import { File } from "expo-file-system";
import { ImageManipulator } from "expo-image-manipulator";
import { prepareSportingLogo } from "../images/prepare-sporting-logo";

// Native file/encoding I/O is controlled; byte selection and resource ownership remain real.
jest.mock("expo-file-system", () => ({
  File: jest.fn(),
  Paths: { cache: "file:///cache" },
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { PNG: "png" },
}));
const original = {
  uri: "file:///original.jpg",
  size: 2_521_838,
  type: "image/jpeg",
  copy: jest.fn(),
  delete: jest.fn(),
};
const copy = {
  uri: "file:///cache/owned.jpg",
  size: original.size,
  type: original.type,
  exists: true,
  delete: jest.fn(),
};
const output = {
  uri: "file:///rendered.png",
  size: 12_273_912,
  type: "image/png",
  exists: true,
  delete: jest.fn(),
};
const image = { saveAsync: jest.fn(), release: jest.fn() };
const context = {
  renderAsync: jest.fn(),
  resize: jest.fn(),
  release: jest.fn(),
};
const asset = {
  uri: original.uri,
  width: 2048,
  height: 2048,
  mimeType: "image/jpeg",
};

beforeEach(() => {
  jest.clearAllMocks();
  output.size = 12_273_912;
  original.copy.mockReset();
  jest
    .mocked(File)
    .mockImplementation(
      (...parts) =>
        (parts.length === 2
          ? copy
          : parts[0] === original.uri
            ? original
            : output) as unknown as File,
    );
  jest
    .mocked(ImageManipulator.manipulate)
    .mockReturnValue(
      context as unknown as ReturnType<typeof ImageManipulator.manipulate>,
    );
  context.renderAsync.mockResolvedValue(image);
  image.saveAsync.mockResolvedValue({ uri: output.uri });
});

it("copies an admissible JPEG without encoding or taking ownership of the borrowed picker input", async () => {
  // Given
  const source = { ...asset };

  // When
  const prepared = await prepareSportingLogo(source);

  // Then
  expect(prepared).toBe(copy);
  expect(prepared.uri).not.toBe(asset.uri);
  expect(prepared.size).toBe(original.size);
  expect(prepared.type).toBe("image/jpeg");
  expect(original.copy).toHaveBeenCalledWith(copy);
  expect(ImageManipulator.manipulate).not.toHaveBeenCalled();
  expect(original.delete).not.toHaveBeenCalled();
  expect(copy.delete).not.toHaveBeenCalled();
});

it("deletes an invalid encoded output and releases native handles", async () => {
  // Given
  const source = { ...asset, width: 4096, height: 4096 };

  // When
  const preparation = prepareSportingLogo(source);

  // Then
  await expect(preparation).rejects.toThrow("upload limit");

  expect(output.delete).toHaveBeenCalledTimes(1);
  expect(image.release).toHaveBeenCalledTimes(1);
  expect(context.release).toHaveBeenCalledTimes(1);
  expect(original.delete).not.toHaveBeenCalled();
});

it("deletes a partially copied destination when native copying fails", async () => {
  // Given
  original.copy.mockImplementation(() => {
    throw new Error("Copy failed");
  });

  // When
  const preparation = prepareSportingLogo(asset);

  // Then
  await expect(preparation).rejects.toThrow("Copy failed");
  expect(copy.delete).toHaveBeenCalledTimes(1);
  expect(original.delete).not.toHaveBeenCalled();
});

it("returns admissible resized output and releases native handles without deleting the owned file", async () => {
  // Given
  output.size = 4_000_000;

  // When
  const prepared = await prepareSportingLogo({
    ...asset,
    width: 4096,
    height: 4096,
  });

  // Then
  expect(prepared).toBe(output);
  expect(context.resize).toHaveBeenCalledWith({ width: 2048 });
  expect(image.release).toHaveBeenCalledTimes(1);
  expect(context.release).toHaveBeenCalledTimes(1);
  expect(output.delete).not.toHaveBeenCalled();
  expect(original.delete).not.toHaveBeenCalled();
});
