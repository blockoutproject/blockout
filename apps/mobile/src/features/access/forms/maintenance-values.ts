import { z } from "zod";
import type { MaintenanceSettingsResponse } from "../../../../.generated/schemas/index.zod";

/** Optional image editing accepts an empty removal or a credential-free HTTPS URL. */
export const maintenanceImageSchema = z.string().refine((value) => {
  if (value === "") return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}, "Utilisez une URL HTTPS d’image sans identifiant ni suivi personnalisé.");
/** Content validation is independent of maintenance activation. */
export const maintenanceSchema = z.object({
  message: z.string().trim().min(1, "Saisissez un message de maintenance."),
  imageUrl: maintenanceImageSchema,
});
/** RHF snapshot; empty image input means explicit removal only when dirty. */
export type MaintenanceValues = z.infer<typeof maintenanceSchema>;

/** Starts an editing snapshot without turning a missing image into a submitted removal. */
export function maintenanceValues(
  settings: MaintenanceSettingsResponse,
): MaintenanceValues {
  return { message: settings.message, imageUrl: settings.imageUrl ?? "" };
}
