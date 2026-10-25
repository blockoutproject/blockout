import type { FieldNamesMarkedBoolean } from "react-hook-form";
import type { ChangeMaintenanceRequest } from "../../../../.generated/schemas/index.zod";
import type { MaintenanceValues } from "../forms/maintenance-values";

/** Encodes only dirty content; an empty dirty image is null, while untouched fields stay absent. */
export function toMaintenanceRequest(
  revision: ChangeMaintenanceRequest["revision"],
  values: MaintenanceValues,
  dirty: FieldNamesMarkedBoolean<MaintenanceValues>,
): ChangeMaintenanceRequest {
  const body: ChangeMaintenanceRequest = { revision };
  if (dirty.message) body.message = values.message;
  if (dirty.imageUrl)
    body.imageUrl = values.imageUrl === "" ? null : values.imageUrl;
  return body;
}
