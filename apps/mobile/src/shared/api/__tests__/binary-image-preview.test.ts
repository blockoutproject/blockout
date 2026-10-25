import { binaryImagePreview } from "../binary-image-preview";

const originalReader = Object.getOwnPropertyDescriptor(
  globalThis,
  "FileReader",
);

/** Controlled native decoder; its completion and abort are the boundary exercised by these tests. */
class ImageReader {
  static LOADING = 1;
  readyState = 0;
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  abort = jest.fn(() => {
    this.readyState = 2;
  });

  /** Retains the pending read until the test supplies the native completion. */
  readAsDataURL() {
    this.readyState = ImageReader.LOADING;
  }
}

let reader: ImageReader;
beforeEach(() => {
  reader = new ImageReader();
  Object.defineProperty(globalThis, "FileReader", {
    configurable: true,
    value: Object.assign(
      jest.fn(() => reader),
      { LOADING: ImageReader.LOADING },
    ),
  });
});
afterEach(() => {
  if (originalReader)
    Object.defineProperty(globalThis, "FileReader", originalReader);
  else Reflect.deleteProperty(globalThis, "FileReader");
});

it("rejects cancellation after HTTP completion without admitting the late decoded image", async () => {
  // Given
  const controller = new AbortController();
  const result = binaryImagePreview(new Blob(["synthetic"]), controller.signal);
  const lateCompletion = reader.onload;

  // When
  controller.abort();
  reader.result = "data:image/png;base64,c3ludGhldGlj";
  lateCompletion?.();

  // Then
  await expect(result).rejects.toMatchObject({ kind: "cancelled" });
  expect(reader.abort).toHaveBeenCalledTimes(1);
});

it("returns a decoded image and releases cancellation after successful completion", async () => {
  // Given
  const controller = new AbortController();
  const result = binaryImagePreview(new Blob(["synthetic"]), controller.signal);
  reader.result = "data:image/png;base64,c3ludGhldGlj";

  // When
  reader.onload?.();
  controller.abort();

  // Then
  await expect(result).resolves.toBe("data:image/png;base64,c3ludGhldGlj");
  expect(reader.abort).not.toHaveBeenCalled();
});

it("exposes only a safe failure when the native decoder rejects", async () => {
  // Given
  const result = binaryImagePreview(new Blob(["synthetic"]));

  // When
  reader.onerror?.();

  // Then
  await expect(result).rejects.toMatchObject({ kind: "network" });
});

it("releases cancellation when starting the native decoder throws", async () => {
  // Given
  const controller = new AbortController();
  jest.spyOn(reader, "readAsDataURL").mockImplementation(() => {
    throw new Error("Native decoder unavailable");
  });

  // When
  const result = binaryImagePreview(new Blob(["synthetic"]), controller.signal);
  controller.abort();

  // Then
  await expect(result).rejects.toMatchObject({ kind: "network" });
  expect(reader.abort).not.toHaveBeenCalled();
});
