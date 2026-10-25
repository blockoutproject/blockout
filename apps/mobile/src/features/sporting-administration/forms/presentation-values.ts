import { z } from "zod";
import type { File } from "expo-file-system";
import type { Presentation } from "../api/presentation";

const name = z
  .string()
  .refine(
    (v) => v === "" || v.trim().length > 0,
    "Saisissez un nom ou laissez le champ vide.",
  );
const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Utilisez une couleur au format #RRGGBB.");
/** Editing validation is distinct from generated requests: empty optional names restore automatic values. */
export const presentationSchema = z
  .object({
    kind: z.enum(["club", "team", "pool", "division"]),
    name,
    shortName: name,
    color: z.string(),
    gradient: z.tuple([z.string(), z.string(), z.string()]),
    logo: z.discriminatedUnion("action", [
      z.object({ action: z.literal("keep") }),
      z.object({ action: z.literal("automatic") }),
      z.object({
        action: z.literal("replace"),
        prepared: z.custom<File>(),
      }),
    ]),
  })
  .superRefine((values, context) => {
    if (values.kind !== "division") return;
    if (!values.name.trim())
      context.addIssue({
        code: "custom",
        path: ["name"],
        message: "Le nom de la division est requis.",
      });
    if (!color.safeParse(values.color).success)
      context.addIssue({
        code: "custom",
        path: ["color"],
        message: "Utilisez une couleur au format #RRGGBB.",
      });
    if (values.gradient.some((v) => v !== ""))
      values.gradient.forEach((value, index) => {
        if (!color.safeParse(value).success)
          context.addIssue({
            code: "custom",
            path: ["gradient", index],
            message:
              "Renseignez les trois couleurs au format #RRGGBB ou laissez-les toutes vides.",
          });
      });
  });
/** Caller-owned draft, including a prepared local image only when replacement is explicitly selected. */
export type PresentationValues = z.infer<typeof presentationSchema>;

/** Starts an editing snapshot from current manual values; automatic names are not copied into overrides. */
export function presentationValues(
  presentation: Presentation,
): PresentationValues {
  const division =
    presentation.kind === "division" ? presentation.data : undefined;
  const names =
    presentation.kind !== "division" ? presentation.data.names : undefined;
  return {
    kind: presentation.kind,
    name: division?.name ?? names?.manualName ?? "",
    shortName: names?.manualShortName ?? "",
    color: division?.color ?? "",
    gradient: division?.gradient
      ? [division.gradient[0], division.gradient[1], division.gradient[2]]
      : ["", "", ""],
    logo: { action: "keep" },
  };
}
