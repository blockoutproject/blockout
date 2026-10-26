import type { FieldNamesMarkedBoolean } from "react-hook-form";
import type { ChangeApplicationVersionsRequest } from "../../../../.generated/schemas/index.zod";
import type { ApplicationVersionsValues } from "../schemas/application-versions-schema";

/** Preserves nested PATCH omission and encodes explicit empty editing values as removals. */
export function toApplicationVersionsRequest(
  revision: ChangeApplicationVersionsRequest["revision"],
  values: ApplicationVersionsValues,
  dirty: FieldNamesMarkedBoolean<ApplicationVersionsValues>,
): ChangeApplicationVersionsRequest {
  const body: ChangeApplicationVersionsRequest = { revision };
  for (const platform of ["ios", "android"] as const) {
    const fields = dirty[platform];
    if (!fields?.minimumVersion && !fields?.storeUrl) continue;
    body[platform] = {};
    if (fields.minimumVersion)
      body[platform].minimumVersion = values[platform].minimumVersion || null;
    if (fields.storeUrl)
      body[platform].storeUrl = values[platform].storeUrl || null;
  }
  if (dirty.message) body.message = values.message || null;
  return body;
}
