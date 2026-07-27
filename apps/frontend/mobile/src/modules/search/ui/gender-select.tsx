import React from "react";

import { SelectControl } from "@/src/shared/ui/form/select-control";
import type { SelectOption } from "@/src/shared/ui/form/select-sheet";
import {
  GenderEnum,
  GenderLabels,
} from "@/src/shared/view-models/gender-labels";

const genderOptions: readonly SelectOption<GenderEnum>[] = [
  { value: GenderEnum.M, label: GenderLabels[GenderEnum.M] },
  { value: GenderEnum.F, label: GenderLabels[GenderEnum.F] },
  { value: GenderEnum.O, label: GenderLabels[GenderEnum.O] },
];

export type GenderSelectProps = {
  selectedValue?: GenderEnum | null;
  onValueChange: (value: GenderEnum | null) => void;
  testID?: string;
};

/**
 * Supplies gender-specific options and copy to the canonical select control.
 */
export default function GenderSelect({
  selectedValue,
  onValueChange,
  testID,
}: GenderSelectProps) {
  return (
    <SelectControl
      title="Choisir un genre"
      placeholder="Genre"
      icon="gender-male-female"
      options={genderOptions}
      selectedValue={selectedValue ?? null}
      onValueChange={onValueChange}
      testID={testID}
    />
  );
}
