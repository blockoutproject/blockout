import type { CreateSupportRequestBody } from "../../../../.generated/schemas/index.zod";

/**
 * Supplies Orval's supported FormData hook with a typed JSON part and repeated files.
 * Expo Fetch owns multipart encoding and its boundary; this function performs no I/O or validation.
 */
export function supportFormData(body: CreateSupportRequestBody): FormData {
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(body.metadata)], { type: "application/json" }),
  );
  for (const image of body.images ?? []) form.append("images", image);
  return form;
}
