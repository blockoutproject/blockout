import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { pickSquarePngImage } from "@/src/shared/ui/form/image-picker-adapter";

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { PNG: "png" },
}));

const mockPicker = jest.mocked(ImagePicker.launchImageLibraryAsync);
const mockManipulate = jest.mocked(
  ImageManipulator.ImageManipulator.manipulate,
);

describe("pickSquarePngImage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns no upload when native selection is cancelled", async () => {
    mockPicker.mockResolvedValue({
      canceled: true,
      assets: null,
    });

    await expect(pickSquarePngImage("club.png")).resolves.toBeNull();
    expect(mockManipulate).not.toHaveBeenCalled();
  });

  it("normalizes a selected image into the requested PNG upload", async () => {
    const resize = jest.fn();
    const saveAsync = jest.fn().mockResolvedValue({
      uri: "file:///normalized.png",
    });
    const renderAsync = jest.fn().mockResolvedValue({ saveAsync });
    mockPicker.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///selected.jpg" }],
    } as never);
    mockManipulate.mockReturnValue({
      resize,
      renderAsync,
    } as never);

    await expect(pickSquarePngImage("club.png")).resolves.toEqual({
      uri: "file:///normalized.png",
      name: "club.png",
      type: "image/png",
    });

    expect(mockPicker).toHaveBeenCalledWith({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    expect(mockManipulate).toHaveBeenCalledWith("file:///selected.jpg");
    expect(resize).toHaveBeenCalledWith({ width: 512 });
    expect(saveAsync).toHaveBeenCalledWith({
      format: "png",
      compress: 1,
    });
  });
});
