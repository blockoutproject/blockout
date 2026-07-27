import React from "react";

import { SelectControl } from "@/src/shared/ui/form/select-control";
import type { SelectOption } from "@/src/shared/ui/form/select-sheet";

export type SeasonSelectProps = {
  options: readonly SelectOption<string>[];
  selectedValue?: string | null;
  onValueChange: (value: string | null) => void;
  testID?: string;
};

/**
 * Supplies season-specific options and copy to the canonical select control.
 */
export default function SeasonSelect({
  options,
  selectedValue,
  onValueChange,
  testID,
}: SeasonSelectProps) {
  return (
    <SelectControl
      title="Choisir une saison"
      placeholder="Saison"
      icon="calendar-month-outline"
      options={options}
      selectedValue={selectedValue ?? null}
      onValueChange={onValueChange}
      testID={testID}
    />
  );
}
