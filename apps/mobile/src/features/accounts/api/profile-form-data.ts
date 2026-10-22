import type { ChangeAccountProfileBody } from "../../../../.generated/schemas/index.zod";

/** Orval's native multipart hook: typed JSON metadata and a binary part only for replacement. */
export function profileFormData(body: ChangeAccountProfileBody): FormData {
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(body.metadata)], { type: "application/json" }),
  );
  if (body.image !== undefined) form.append("image", body.image);
  return form;
}
