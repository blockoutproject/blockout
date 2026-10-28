import { z } from "zod";

/** Recognizes provider hosts locally without asserting that the address contains an available live stream. */
function supportedAddress(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      (["youtu.be", "fb.watch"].includes(host) ||
        ["youtube.com", "twitch.tv", "facebook.com"].some(
          (domain) => host === domain || host.endsWith(`.${domain}`),
        ))
    );
  } catch {
    return false;
  }
}
/** Editing validation only; the backend rechecks current rights, sporting facts and literal address policy. */
export const contributionSchema = z.object({
  url: z
    .string()
    .refine(
      supportedAddress,
      "Utilisez une adresse HTTP(S) YouTube, Twitch ou Facebook sans identifiants.",
    ),
});
/** Local address draft, independent of revision and private owner projections. */
export type ContributionValues = z.infer<typeof contributionSchema>;
