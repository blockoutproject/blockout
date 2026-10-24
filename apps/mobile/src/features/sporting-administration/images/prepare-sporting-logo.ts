import type { ImagePickerAsset } from "expo-image-picker";
import { File } from "expo-file-system";
import {
  ImageManipulator,
  SaveFormat,
  type ImageRef,
} from "expo-image-manipulator";
import { ApiError, type ApiFetchOptions } from "../../../shared/api/api-fetch";

/** An original admissible PNG/JPEG or one aspect-preserving prepared PNG; no profile crop or public storage. */
export interface PreparedSportingLogo {
  uri: string;
  file: File;
}

/** Preserves admissible originals; other inputs get one bounded native render, without compression/retry loops. */
export async function prepareSportingLogo(
  asset: ImagePickerAsset,
  session: NonNullable<ApiFetchOptions["session"]>,
): Promise<PreparedSportingLogo> {
  if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
  if (
    !Number.isSafeInteger(asset.width) ||
    !Number.isSafeInteger(asset.height) ||
    asset.width < 1 ||
    asset.height < 1
  )
    throw new Error("Invalid dimensions");
  const original = new File(asset.uri);
  const mediaType = asset.mimeType ?? original.type;
  if (
    (mediaType === "image/png" || mediaType === "image/jpeg") &&
    asset.width * asset.height <= 4_194_304 &&
    original.size > 0 &&
    original.size <= 5_242_880
  )
    return { uri: asset.uri, file: original };
  // Picker MIME/dimensions guide preparation only; the backend still validates actual submitted content.
  const context = ImageManipulator.manipulate(asset.uri);
  let rendered: ImageRef | undefined;
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
    if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
    const file = new File(output.uri);
    if (file.size < 1 || file.size > 5_242_880)
      throw new Error("Prepared image exceeds the upload limit");
    return { uri: output.uri, file };
  } finally {
    rendered?.release();
    context.release();
  }
}
