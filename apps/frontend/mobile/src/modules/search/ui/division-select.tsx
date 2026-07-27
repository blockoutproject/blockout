import React from "react";

import { SelectControl } from "@/src/shared/ui/form/select-control";
import type { SelectOption } from "@/src/shared/ui/form/select-sheet";

export type DivisionSelectProps = {
  options: readonly SelectOption<number>[];
  selectedValue?: number | null;
  onValueChange: (value: number | null) => void;
  testID?: string;
};

/**
 * Supplies division-specific options and copy to the canonical select control.
 */
export default function DivisionSelect({
  options,
  selectedValue,
  onValueChange,
  testID,
}: DivisionSelectProps) {
  return (
    <SelectControl
      title="Choisir une division"
      placeholder="Division"
      icon="trophy-outline"
      options={options}
      selectedValue={selectedValue ?? null}
      onValueChange={onValueChange}
      testID={testID}
    />
  );
}
