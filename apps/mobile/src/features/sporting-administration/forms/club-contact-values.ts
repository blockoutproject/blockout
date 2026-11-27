import { z } from "zod";
import type { ClubContactPatch, ClubContacts } from "../api/club-contacts";

export const clubContactLabels = {
  address: "Adresse",
  city: "Commune",
  postalCode: "Code postal",
  email: "Adresse e-mail",
  phone: "Téléphone",
  website: "Site web",
} as const;

type ClubContactKey = keyof typeof clubContactLabels;

export const clubContactKeys = Object.keys(
  clubContactLabels,
) as ClubContactKey[];

const contact = z.object({
  mode: z.enum(["keep", "source", "manual", "hidden"]),
  value: z.string(),
});

export const clubContactDraftSchema = z
  .object({
    address: contact,
    city: contact,
    postalCode: contact,
    email: contact,
    phone: contact,
    website: contact,
  })
  .superRefine(({ email, website }, context) => {
    if (
      email.mode === "manual" &&
      email.value &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())
    ) {
      context.addIssue({
        code: "custom",
        path: ["email"],
        message: "Indiquez une adresse e-mail valide.",
      });
    }
    if (website.mode === "manual" && website.value) {
      const value = website.value.trim();
      let url: URL | undefined;
      try {
        url = new URL(value);
      } catch {
        // A partially edited URL is allowed until Save.
      }
      if (
        !url ||
        !/^https?:\/\/[^/]/i.test(value) ||
        url.username ||
        url.password
      ) {
        context.addIssue({
          code: "custom",
          path: ["website"],
          message: "Indiquez une adresse web HTTP ou HTTPS valide.",
        });
      }
    }
  });

export type ClubContactDraft = z.infer<typeof clubContactDraftSchema>;

/** Clean fields read their effective values from the authorized query. */
export function clubContactValues(): ClubContactDraft {
  return Object.fromEntries(
    clubContactKeys.map((key) => [key, { mode: "keep", value: "" }]),
  ) as ClubContactDraft;
}

/** Source intent sends only its mode so the server can resolve the latest eligible value. */
export function clubContactPatch(
  draft: ClubContactDraft,
  contacts: ClubContacts,
): ClubContactPatch {
  const change: ClubContactPatch = {};
  for (const key of clubContactKeys) {
    const desired = draft[key];
    const current = contacts[key];
    const value = desired.value.trim();
    if (desired.mode === "manual") {
      if (
        value &&
        (current.mode !== "manual" || value !== current.manualValue)
      ) {
        change[key] = { mode: "manual", value };
      }
    } else if (desired.mode !== "keep" && desired.mode !== current.mode) {
      change[key] = { mode: desired.mode };
    }
  }
  return change;
}
