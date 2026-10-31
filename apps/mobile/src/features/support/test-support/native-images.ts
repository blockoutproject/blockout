import type { ImagePickerAsset } from "expo-image-picker";

/** Controlled native cache with real Blob bytes for generated FormData integration tests. */
export const files = new Map<string, NativeImageFile>();

/** Models only native file ownership and Blob transport; no native decode is simulated. */
class NativeImageFile extends Blob {
  uri: string;
  exists = true;
  delete = jest.fn(() => {
    this.exists = false;
  });
  constructor(uri: string, size = 32) {
    super([new Uint8Array(size)], {
      type: uri.endsWith(".jpg") ? "image/jpeg" : "image/png",
    });
    this.uri = uri;
  }
}

/** Creates one fictional prepared native result, including exact byte boundary scenarios. */
export function preparedImage(uri: string, size = 32) {
  const file = new NativeImageFile(uri, size);
  files.set(uri, file);
  return file;
}

/** A fictional borrowed picker source; fileSize is deliberately unrelated to prepared bytes. */
export function pickedImage(index = 1): ImagePickerAsset {
  return {
    uri: `file:///library/${index}.heic`,
    width: 1200,
    height: 2400,
    fileSize: 99_000_000,
  };
}

/** Native File lookup keeps real Blob semantics without changing the generated multipart encoder. */
export const nativeFileSystem = {
  File: jest.fn((uri: string) => files.get(uri) ?? preparedImage(uri)),
  Paths: {
    cache: { uri: "file:///cache/" },
    normalize: (path: string) => path,
  },
};
/** System-picker outcomes are controlled without replacing the shared selection hook. */
export const picker = { launchImageLibraryAsync: jest.fn() };
/** Controlled native image reference; encoding completion remains explicit in each scenario. */
export const renderedImage = { saveAsync: jest.fn(), release: jest.fn() };
/** Only the installed manipulator's native operations are replaced. */
export const manipulation = {
  resize: jest.fn(),
  renderAsync: jest.fn(),
  release: jest.fn(),
};
/** SDK module facade with its actual supported save formats. */
export const manipulator = {
  ImageManipulator: { manipulate: jest.fn(() => manipulation) },
  SaveFormat: { PNG: "png", JPEG: "jpeg" },
};

/** Resets the native boundaries only; each scenario performs its own visible user actions. */
export function resetNativeImages() {
  files.clear();
  picker.launchImageLibraryAsync
    .mockReset()
    .mockResolvedValue({ canceled: true, assets: null });
  manipulation.renderAsync.mockReset().mockResolvedValue(renderedImage);
  manipulator.ImageManipulator.manipulate.mockClear();
  renderedImage.saveAsync
    .mockReset()
    .mockImplementation(async (options: { format: string }) => {
      const uri = `file:///cache/prepared-${files.size}.${options.format === "png" ? "png" : "jpg"}`;
      preparedImage(uri);
      return { uri, width: 1200, height: 2400 };
    });
}
