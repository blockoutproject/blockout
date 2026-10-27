/** Generated image-write envelope; each operation owns the metadata schema and image intent. */
export interface ImageFormDataBody {
  metadata: object;
  image?: Blob;
}

/**
 * Orval's multipart hook for one JSON metadata part and an optional binary image.
 * Native Fetch owns encoding and the boundary; absent images remain absent.
 */
export function imageFormData(body: ImageFormDataBody): FormData {
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(body.metadata)], { type: "application/json" }),
  );
  if (body.image !== undefined) form.append("image", body.image);
  return form;
}
