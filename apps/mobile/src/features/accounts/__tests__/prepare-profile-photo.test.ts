import {
  ImageManipulator,
  SaveFormat,
  type ImageManipulatorContext,
} from "expo-image-manipulator";
import { File } from "expo-file-system";
import { ApiError } from "../../../shared/api/api-fetch";
import { createSessionGeneration } from "../session/session-generation";
import { prepareProfilePhoto } from "../profile/prepare-profile-photo";

jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { PNG: "png" },
}));
jest.mock("expo-file-system", () => ({ File: jest.fn() }));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

const context = {
  resize: jest.fn(),
  renderAsync: jest.fn(),
  release: jest.fn(),
};
const image = { saveAsync: jest.fn(), release: jest.fn() };
const prepared = {
  uri: "file:///prepared.png",
  size: 128,
  type: "image/png",
  exists: true,
  delete: jest.fn(),
};
const session = createSessionGeneration();
const asset = {
  uri: "file:///original.heic",
  width: 2400,
  height: 2400,
  fileSize: 20_000_000,
};

beforeEach(() => {
  jest.clearAllMocks();
  // The native resource is a narrow controlled double; these tests do not qualify native encoding.
  jest
    .mocked(ImageManipulator.manipulate)
    .mockReturnValue(context as unknown as ImageManipulatorContext);
  context.renderAsync.mockResolvedValue(image);
  image.saveAsync.mockResolvedValue({
    uri: "file:///prepared.png",
    width: 1024,
    height: 1024,
  });
  jest.mocked(File).mockImplementation(() => prepared as unknown as File);
});

it("adapts a large cropped source once and checks the prepared PNG instead of the original size", async () => {
  // Given
  const captured = { ...session, ...session.getSnapshot() };

  // When
  const result = await prepareProfilePhoto(asset, captured);

  // Then
  expect(ImageManipulator.manipulate).toHaveBeenCalledTimes(1);
  expect(ImageManipulator.manipulate).toHaveBeenCalledWith(asset.uri);
  expect(context.resize).toHaveBeenCalledWith({ width: 1024 });
  expect(image.saveAsync).toHaveBeenCalledWith({ format: SaveFormat.PNG });
  expect(result.uri).toBe("file:///prepared.png");
  expect(asset.uri).toBe("file:///original.heic");
  expect(context.release).toHaveBeenCalled();
  expect(image.release).toHaveBeenCalled();
  expect(prepared.delete).not.toHaveBeenCalled();
});

it("does not enlarge small squares", async () => {
  // Given
  image.saveAsync.mockResolvedValue({
    uri: "file:///prepared.png",
    width: 64,
    height: 64,
  });

  // When
  await prepareProfilePhoto(
    { ...asset, width: 64, height: 64 },
    { ...session, ...session.getSnapshot() },
  );

  // Then
  expect(context.resize).toHaveBeenCalledWith({ width: 64 });
});

it.each([0, 5 * 1024 * 1024 + 1])(
  "rejects a prepared output of %i bytes",
  async (size) => {
    // Given
    jest
      .mocked(File)
      .mockImplementation(() => ({ ...prepared, size }) as unknown as File);

    // When / Then
    await expect(
      prepareProfilePhoto(asset, { ...session, ...session.getSnapshot() }),
    ).rejects.toThrow();
    expect(prepared.delete).toHaveBeenCalledTimes(1);
  },
);

it("discards preparation completed after an A to guest to A transition", async () => {
  // Given
  const captured = { ...session, ...session.getSnapshot() };
  image.saveAsync.mockImplementation(async () => {
    session.invalidate();
    session.setAccount(session.getSnapshot().generation, "same-account");
    return { uri: "file:///prepared.png", width: 1024, height: 1024 };
  });

  // When / Then
  await expect(
    prepareProfilePhoto(asset, captured),
  ).rejects.toMatchObject<ApiError>({ kind: "cancelled" } as ApiError);
  expect(prepared.delete).toHaveBeenCalledTimes(1);
});

it.each([
  [1200, 900],
  [0, 0],
])("refuses a non-square crop %i x %i", async (width, height) => {
  // Given / When / Then
  await expect(
    prepareProfilePhoto(
      { ...asset, width, height },
      { ...session, ...session.getSnapshot() },
    ),
  ).rejects.toThrow();
  expect(ImageManipulator.manipulate).not.toHaveBeenCalled();
});
