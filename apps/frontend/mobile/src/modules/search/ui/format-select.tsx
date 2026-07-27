import React from "react";

import { SelectControl } from "@/src/shared/ui/form/select-control";
import type { SelectOption } from "@/src/shared/ui/form/select-sheet";
import {
  FormatEnum,
  FormatLabels,
} from "@/src/shared/view-models/format-labels";

const formatOptions: readonly SelectOption<FormatEnum>[] = [
  { value: FormatEnum.SIX, label: FormatLabels[FormatEnum.SIX] },
  { value: FormatEnum.FOUR, label: FormatLabels[FormatEnum.FOUR] },
  { value: FormatEnum.TWO, label: FormatLabels[FormatEnum.TWO] },
];

export type FormatSelectProps = {
  selectedValue?: FormatEnum | null;
  onValueChange: (value: FormatEnum | null) => void;
  testID?: string;
};

/**
 * Supplies format-specific options and copy to the canonical select control.
 */
export default function FormatSelect({
  selectedValue,
  onValueChange,
  testID,
}: FormatSelectProps) {
  return (
    <SelectControl
      title="Choisir un format"
      placeholder="Format"
      icon="account-group-outline"
      options={formatOptions}
      selectedValue={selectedValue ?? null}
      onValueChange={onValueChange}
      testID={testID}
    />
  );
}
