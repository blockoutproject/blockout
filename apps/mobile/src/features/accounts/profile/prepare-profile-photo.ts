import type { ImagePickerAsset } from "expo-image-picker";
import { File } from "expo-file-system";
import {
  ImageManipulator,
  SaveFormat,
  type ImageRef,
} from "expo-image-manipulator";
import { ApiError, type ApiFetchOptions } from "../../../shared/api/api-fetch";

/** Prepared PNG and local preview; the library original is never changed. */
export interface PreparedProfilePhoto {
  uri: string;
  file: File;
}

/**
 * Adapts one ImageField native square crop to bounded PNG without modifying the library original.
 * A large source is allowed: size/type checks apply to the single prepared output. Native failures
 * reject without returning a draft value; obsolete generations reject as cancellations.
 */
export async function prepareProfilePhoto(
  asset: ImagePickerAsset,
  session: NonNullable<ApiFetchOptions["session"]>,
): Promise<PreparedProfilePhoto> {
  if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
  if (
    !Number.isSafeInteger(asset.width) ||
    asset.width < 1 ||
    asset.width !== asset.height
  )
    throw new Error("La photo doit être carrée.");
  const dimension = Math.min(asset.width, 1024);
  const context = ImageManipulator.manipulate(asset.uri);
  let rendered: ImageRef | undefined;
  try {
    context.resize({ width: dimension });
    rendered = await context.renderAsync();
    const output = await rendered.saveAsync({ format: SaveFormat.PNG });
    if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
    if (
      output.width !== output.height ||
      output.width < 1 ||
      output.width > dimension
    )
      throw new Error("La préparation de la photo a échoué.");
    const file = new File(output.uri);
    if (
      file.size < 1 ||
      file.size > 5 * 1024 * 1024 ||
      file.type !== "image/png"
    )
      throw new Error("La photo préparée doit être un PNG de 5 Mio maximum.");
    const bytes = await file.bytes();
    if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (!signature.every((value, index) => bytes[index] === value))
      throw new Error("La préparation de la photo a échoué.");
    return { uri: output.uri, file };
  } finally {
    rendered?.release();
    context.release();
  }
}
