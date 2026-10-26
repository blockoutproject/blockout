import type { FieldNamesMarkedBoolean } from "react-hook-form";
import type { ChangeAccountProfileBody } from "../../../../.generated/schemas/index.zod";
import type { ProfileValues } from "../schemas/profile-schema";

/** Encodes supplied editing intent; keeping the photo submits the username even for an unchanged form. */
export function toProfileBody(
  values: ProfileValues,
  dirty: FieldNamesMarkedBoolean<ProfileValues>,
): ChangeAccountProfileBody {
  const metadata: ChangeAccountProfileBody["metadata"] = {};
  if (dirty.username || values.photo.action === "keep")
    metadata.username = values.username;
  if (values.photo.action !== "keep")
    metadata.photoAction = values.photo.action;
  return {
    metadata,
    ...(values.photo.action === "replace"
      ? { image: values.photo.prepared }
      : {}),
  };
}
