import { z } from "zod";
import type { PreparedProfilePhoto } from "../profile/prepare-profile-photo";

/** Validates the editable username and explicit photo intent before request conversion. */
export const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9._-]{3,32}$/,
      "Utilisez 3 à 32 lettres, chiffres, points, tirets ou tirets bas.",
    ),
  photo: z.discriminatedUnion("action", [
    z.object({ action: z.literal("keep") }),
    z.object({ action: z.literal("remove") }),
    z.object({
      action: z.literal("replace"),
      prepared: z.custom<PreparedProfilePhoto>(),
    }),
  ]),
});
/** Form-owned values keep the prepared native image separate from transport metadata. */
export type ProfileValues = z.infer<typeof profileSchema>;
