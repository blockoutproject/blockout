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
  if (
    (mediaType !== "image/png" && mediaType !== "image/jpeg") ||
    original.size < 1 ||
    original.size > 5 * 1024 * 1024
  ) {
    throw new ImageValidationError("Choose a PNG or JPEG up to 5 MiB.");
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
