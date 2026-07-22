import {GenderEnum} from "@/src/shared/generated/models";

export {GenderEnum} from "@/src/shared/generated/models";

/** User-facing labels for the generated transport gender values. */
export const GenderLabels: Record<GenderEnum, string> = {
  [GenderEnum.M]: "Masculin",
  [GenderEnum.F]: "Féminin",
  [GenderEnum.O]: "Mixte / Autre",
};
