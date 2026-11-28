import type { MaintenanceSettingsResponse } from "../../../../.generated/schemas/index.zod";
import type { MaintenanceValues } from "../schemas/maintenance-schema";

/** Starts an editing snapshot without turning a missing image into a submitted removal. */
export function maintenanceValues(
  settings: MaintenanceSettingsResponse,
): MaintenanceValues {
  return { message: settings.message, imageUrl: settings.imageUrl ?? "" };
}
