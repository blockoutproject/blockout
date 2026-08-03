import {
  GenderEnum,
  GenderLabels,
} from "@/src/shared/view-models/gender-labels";

export type EntityPillPresentation = {
  label: string;
  color: string;
};

export type EntityPillPalette = {
  female: string;
  male: string;
  mixed: string;
  neutral: string;
};

export const toGenderPillPresentation = (
  gender: GenderEnum,
  palette: EntityPillPalette,
): EntityPillPresentation => {
  const color =
    gender === GenderEnum.M
      ? palette.male
      : gender === GenderEnum.F
        ? palette.female
        : palette.mixed;

  return {
    label: GenderLabels[gender],
    color,
  };
};

export const toNeutralPillPresentation = (
  label: string,
  palette: EntityPillPalette,
): EntityPillPresentation => ({
  label,
  color: palette.neutral,
});
