import { prepareSportingLogo } from "../images/prepare-sporting-logo";

// Only native file/encoding I/O is controlled; the size decision and returned draft are real.
jest.mock("expo-file-system", () => ({
  File: jest.fn((uri: string) =>
    uri === "file:///original.jpg" ? mockJpeg : mockPng,
  ),
}));
jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: {
    manipulate: () => ({
      renderAsync: async () => ({
        saveAsync: async () => ({ uri: "file:///rendered.png" }),
        release: jest.fn(),
      }),
      release: jest.fn(),
    }),
  },
  SaveFormat: { PNG: "png" },
}));
const mockJpeg = new Blob([new Uint8Array(2_521_838)], { type: "image/jpeg" });
const mockPng = new Blob([new Uint8Array(12_273_912)], { type: "image/png" });

it("preserves an admissible JPEG instead of refusing its larger lossless PNG encoding", async () => {
  // Given
  const asset = {
    uri: "file:///original.jpg",
    width: 2048,
    height: 2048,
    mimeType: "image/jpeg",
  };
  const session = { generation: "original", isCurrent: () => true };

  // When
  const prepared = await prepareSportingLogo(asset, session);

  // Then
  expect(prepared.uri).toBe(asset.uri);
  expect(prepared.file.size).toBe(2_521_838);
  expect(prepared.file.type).toBe("image/jpeg");
});
