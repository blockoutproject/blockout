import { File } from "expo-file-system";
import { copySelectedImage } from "../copy-selected-image";

jest.mock("expo-file-system", () => ({
  File: jest.fn(),
  Paths: { cache: "file:///cache" },
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

const original = {
  size: 2048,
  type: "image/png",
  copy: jest.fn<Promise<void>, [File]>(),
  delete: jest.fn(),
};
const owned = { exists: true, delete: jest.fn() };
const asset = { uri: "file:///selected.png", width: 1200, height: 800 };

beforeEach(() => {
  jest.clearAllMocks();
  original.size = 2048;
  original.type = "image/png";
  original.copy.mockResolvedValue(undefined);
  jest
    .mocked(File)
    .mockImplementation(
      (...parts) => (parts.length === 1 ? original : owned) as unknown as File,
    );
});

it("copies a rectangular selection into draft ownership without changing the borrowed source", async () => {
  // Given: native file I/O is controlled; the selection and its dimensions are real inputs.

  // When
  const copy = await copySelectedImage(asset);

  // Then
  expect(copy).toBe(owned);
  expect(original.copy).toHaveBeenCalledWith(owned);
  expect(original.delete).not.toHaveBeenCalled();
  expect(owned.delete).not.toHaveBeenCalled();
});

it("waits for copying before delivering the owned file", async () => {
  // Given
  const copying = Promise.withResolvers<void>();
  original.copy.mockReturnValue(copying.promise);
  let delivered = false;

  // When
  const selection = copySelectedImage(asset).then((file) => {
    delivered = true;
    return file;
  });
  await Promise.resolve();

  // Then
  expect(delivered).toBe(false);
  expect(original.delete).not.toHaveBeenCalled();

  // When
  copying.resolve();
  const copy = await selection;

  // Then
  expect(copy).toBe(owned);
});

it.each([
  { type: "image/png", size: 0 },
  { type: "image/jpeg", size: 5 * 1024 * 1024 + 1 },
  { type: "image/webp", size: 2048 },
])(
  "refuses inadmissible selected content: $type / $size bytes",
  async ({ type, size }) => {
    // Given
    original.type = type;
    original.size = size;

    // When
    const selection = copySelectedImage(asset);

    // Then
    await expect(selection).rejects.toThrow("PNG or JPEG");
    expect(original.copy).not.toHaveBeenCalled();
    expect(original.delete).not.toHaveBeenCalled();
  },
);

it("releases a failed destination without deleting the borrowed source", async () => {
  // Given
  original.copy.mockRejectedValue(new Error("Native copy failed"));

  // When
  const selection = copySelectedImage(asset);

  // Then
  await expect(selection).rejects.toThrow("Native copy failed");
  expect(owned.delete).toHaveBeenCalledTimes(1);
  expect(original.delete).not.toHaveBeenCalled();
});
