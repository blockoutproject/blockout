import type { ImagePickerAsset } from "expo-image-picker";
import { File, Paths } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import { deleteOwnedImage } from "../../../shared/images/delete-owned-image";
import { ImageValidationError } from "../../../shared/images/image-validation-error";
import {
  ImageManipulator,
  SaveFormat,
  type ImageRef,
} from "expo-image-manipulator";
import { ApiError, type ApiFetchOptions } from "../../../shared/api/api-fetch";

/** Returns an app-owned cache File by copying admissible PNG/JPEG bytes or preparing one bounded PNG; rejected output is deleted. Borrowed input remains with the selection owner until preparation settles; the library original is untouched. */
export async function prepareSportingLogo(
  asset: ImagePickerAsset,
  session: NonNullable<ApiFetchOptions["session"]>,
): Promise<File> {
  if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
  if (
    !Number.isSafeInteger(asset.width) ||
    !Number.isSafeInteger(asset.height) ||
    asset.width < 1 ||
    asset.height < 1
  )
    throw new ImageValidationError("Invalid dimensions");
  const original = new File(asset.uri);
  const mediaType = asset.mimeType ?? original.type;
  if (
    (mediaType === "image/png" || mediaType === "image/jpeg") &&
    asset.width * asset.height <= 4_194_304 &&
    original.size > 0 &&
    original.size <= 5_242_880
  ) {
    const file = new File(
      Paths.cache,
      `prepared-logo-${randomUUID()}.${mediaType === "image/jpeg" ? "jpg" : "png"}`,
    );
    try {
      original.copy(file);
      if (!session.isCurrent(session.generation))
        throw new ApiError("cancelled");
      return file;
    } catch (error) {
      deleteOwnedImage(file);
      throw error;
    }
  }
  // Picker MIME/dimensions guide preparation only; the backend still validates actual submitted content.
  const context = ImageManipulator.manipulate(asset.uri);
  let rendered: ImageRef | undefined;
  let file: File | undefined;
  try {
    if (asset.width * asset.height > 4_194_304)
      context.resize({
        width: Math.max(
          1,
          Math.floor(
            asset.width * Math.sqrt(4_194_304 / (asset.width * asset.height)),
          ),
        ),
      });
    rendered = await context.renderAsync();
    const output = await rendered.saveAsync({ format: SaveFormat.PNG });
    file = new File(output.uri);
    if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
    if (file.size < 1 || file.size > 5_242_880)
      throw new ImageValidationError("Prepared image exceeds the upload limit");
    return file;
  } catch (error) {
    deleteOwnedImage(file);
    throw error;
  } finally {
    rendered?.release();
    context.release();
  }
}
