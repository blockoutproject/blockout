import { z } from "zod";
import type { ApplicationVersionsResponse } from "../../../../.generated/schemas/index.zod";
import { parsePublishedVersion } from "../native/installed-version";

/** Checks the store destination locally; the backend and operator still own validation and availability. */
function validStore(value: string, ios: boolean) {
  try {
    if (value.trim() !== value || /\s/.test(value)) return false;
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    return ios
      ? url.hostname === "apps.apple.com" &&
          /^\/(?:[a-zA-Z]{2}\/)?app\/(?:[^/]+\/)?id[0-9]+$/.test(url.pathname)
      : url.hostname === "play.google.com" &&
          url.pathname === "/store/apps/details" &&
          url.searchParams.getAll("id").length === 1 &&
          url.searchParams.get("id") === "com.blockoutproject.blockout";
  } catch {
    return false;
  }
}
/** Validates the complete edited platform, including a retained minimum with a removed link. */
function platformSchema(ios: boolean) {
  return z
    .object({
      minimumVersion: z
        .string()
        .refine(
          (value) => value === "" || parsePublishedVersion(value) !== undefined,
          "Utilisez trois nombres, par exemple 2.10.0, ou laissez vide.",
        ),
      storeUrl: z
        .string()
        .refine(
          (value) => value === "" || validStore(value, ios),
          ios
            ? "Utilisez un lien HTTPS App Store iOS valide."
            : "Utilisez le lien HTTPS Google Play de Blockout.",
        ),
    })
    .superRefine((value, context) => {
      if (value.minimumVersion !== "" && value.storeUrl === "")
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["storeUrl"],
          message:
            "Un lien vers le store est requis avec une version minimale.",
        });
    });
}
/** Editing values use empty strings for explicit optional removal; transport omission is mapped on submit. */
export const applicationVersionsSchema = z.object({
  ios: platformSchema(true),
  android: platformSchema(false),
  message: z.string().trim(),
});
/** One RHF-owned draft for both platforms and the shared optional message. */
export type ApplicationVersionsValues = z.infer<
  typeof applicationVersionsSchema
>;

/** Detects an actual numeric increase or first minimum before requesting manual store verification. */
export function raisesMinimum(
  draft: ApplicationVersionsValues,
  baseline: ApplicationVersionsResponse,
) {
  return (["ios", "android"] as const).some((platform) => {
    const next = parsePublishedVersion(draft[platform].minimumVersion);
    if (!next) return false;
    const previous = parsePublishedVersion(baseline[platform].minimumVersion);
    if (!previous) return true;
    for (let index = 0; index < 3; index++) {
      if (next[index] !== previous[index]) return next[index] > previous[index];
    }
    return false;
  });
}
