import { ImageValidationError } from "../../../shared/images/image-validation-error";
import { deleteOwnedImage } from "../../../shared/images/delete-owned-image";
import type { ImagePickerAsset } from "expo-image-picker";
import { File } from "expo-file-system";
import {
  ImageManipulator,
  SaveFormat,
  type ImageRef,
} from "expo-image-manipulator";

/**
 * Adapts one ImageField native square crop to bounded PNG without modifying the library original.
 * A large source is allowed: the byte limit applies to the single prepared output. ImageManipulator
 * owns aspect-preserving resize and PNG encoding; the server validates actual content. Native failures
 * delete any prepared output before rejecting; the owning mounted form decides whether to display a completed preparation.
 * The returned File is owned by the draft/upload consumer and must be deleted when both release it.
 */
export async function prepareProfilePhoto(
  asset: ImagePickerAsset,
): Promise<File> {
  if (
    !Number.isSafeInteger(asset.width) ||
    asset.width < 1 ||
    asset.width !== asset.height
  )
    throw new ImageValidationError("La photo doit être carrée.");
  const dimension = Math.min(asset.width, 1024);
  const context = ImageManipulator.manipulate(asset.uri);
  let rendered: ImageRef | undefined;
  let file: File | undefined;
  try {
    context.resize({ width: dimension });
    rendered = await context.renderAsync();
    const output = await rendered.saveAsync({ format: SaveFormat.PNG });
    file = new File(output.uri);
    if (file.size < 1 || file.size > 5 * 1024 * 1024)
      throw new ImageValidationError(
        "La photo préparée doit être un PNG de 5 Mio maximum.",
      );
    return file;
  } catch (error) {
    deleteOwnedImage(file);
    throw error;
  } finally {
    rendered?.release();
    context.release();
  }
}
