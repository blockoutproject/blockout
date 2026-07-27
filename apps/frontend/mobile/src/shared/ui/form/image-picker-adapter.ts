import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import type { ImageUpload } from "@/src/shared/api/image-upload";

export async function pickSquarePngImage(
  fileName: string,
): Promise<ImageUpload | null> {
  const pickerResult = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  if (pickerResult.canceled) {
    return null;
  }

  const selected = pickerResult.assets[0];
  if (!selected?.uri) {
    return null;
  }

  const manipulation = ImageManipulator.ImageManipulator.manipulate(
    selected.uri,
  );
  manipulation.resize({ width: 512 });
  const rendered = await manipulation.renderAsync();
  const saved = await rendered.saveAsync({
    format: ImageManipulator.SaveFormat.PNG,
    compress: 1,
  });

  return {
    uri: saved.uri,
    name: fileName,
    type: "image/png",
  };
}
