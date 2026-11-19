import type { ImagePickerAsset } from "expo-image-picker";
import { File, Paths } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { deleteOwnedImage } from "./delete-owned-image";
import { ImageValidationError } from "./image-validation-error";

/** Copies admissible selected bytes into the draft's ownership; the picker source remains borrowed. */
export async function copySelectedImage(
  asset: ImagePickerAsset,
): Promise<File> {
  const original = new File(asset.uri);
  const mediaType = asset.mimeType ?? original.type;
  const size = original.size;
  if ((mediaType !== "image/png" && mediaType !== "image/jpeg") || size < 1) {
    throw new ImageValidationError("invalid");
  }
  if (size > 5 * 1024 * 1024) {
    throw new ImageValidationError("too-large");
  }
  const copy = new File(
    Paths.cache,
    `selected-image-${randomUUID()}.${mediaType === "image/jpeg" ? "jpg" : "png"}`,
  );
  try {
    await original.copy(copy);
    return copy;
  } catch (error) {
    deleteOwnedImage(copy);
    throw error;
  }
}
