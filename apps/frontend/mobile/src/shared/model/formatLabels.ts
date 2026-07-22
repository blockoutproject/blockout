import {FormatEnum} from "@/src/shared/generated/models";

export {FormatEnum} from "@/src/shared/generated/models";

/** User-facing labels for the generated transport format values. */
export const FormatLabels: Record<FormatEnum, string> = {
  [FormatEnum.SIX]: "6x6",
  [FormatEnum.FOUR]: "4x4",
  [FormatEnum.TWO]: "2x2",
};
