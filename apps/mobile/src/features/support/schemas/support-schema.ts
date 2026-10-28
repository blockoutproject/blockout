import { z } from "zod";
import {
  SupportRequestKindEnum,
  SupportRequestSubjectEnum,
} from "../../../../.generated/schemas/index.zod";

/** Editing validation preserves the explanation and enforces canonical UTF-16 bounds without truncation. */
export const supportSchema = z.object({
  kind: SupportRequestKindEnum,
  subject: z.union([z.literal(""), SupportRequestSubjectEnum]),
  title: z
    .string()
    .trim()
    .min(1, "Indiquez un titre.")
    .max(200, "Le titre est trop long."),
  description: z
    .string()
    .refine((value) => value.trim().length > 0, "Décrivez votre demande.")
    .pipe(z.string().max(10000, "La description est trop longue.")),
  replyEmail: z
    .string()
    .trim()
    .min(1, "Indiquez une adresse e-mail de réponse.")
    .email("Indiquez une adresse e-mail valide.")
    .max(254, "L’adresse e-mail est trop longue."),
});

/** The editable optional subject uses an empty control value; transport omission belongs to the request mapper. */
export type SupportValues = z.infer<typeof supportSchema>;
