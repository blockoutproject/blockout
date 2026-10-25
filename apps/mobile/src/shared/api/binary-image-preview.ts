import { ApiError } from "./api-fetch";

/** Converts a successful binary image response into an ephemeral native data URI; read failures reject safely. */
export function binaryImagePreview(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ApiError("network"));
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new ApiError("schema"));
    reader.readAsDataURL(blob);
  });
}
