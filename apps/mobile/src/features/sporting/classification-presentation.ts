import type {
  SportFormatEnum,
  SportGenderEnum,
} from "../../../.generated/schemas/index.zod";

/** Public sporting presentation vocabulary shared by consultation, discovery and administration. */
export const sportingGenderLabels: Readonly<Record<SportGenderEnum, string>> = {
  female: "Féminin",
  male: "Masculin",
  mixed: "Mixte",
};

/** Labels only established classification; an absent value has no invented gender. */
export function genderLabel(
  gender: SportGenderEnum | undefined,
): string | undefined {
  return gender === undefined ? undefined : sportingGenderLabels[gender];
}

/** Renders the contract-owned format as a multiplication label; absent context remains absent. */
export function formatLabel(format: SportFormatEnum): string;
export function formatLabel(
  format: SportFormatEnum | undefined,
): string | undefined;
export function formatLabel(
  format: SportFormatEnum | undefined,
): string | undefined {
  return format?.replace("x", " × ");
}
