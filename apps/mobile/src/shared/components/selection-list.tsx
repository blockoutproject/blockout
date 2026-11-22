import { EntryGroup } from "./entry-group";
import { SelectionRow } from "./selection-row";

export function SelectionList<Value extends string | undefined>({
  options,
  selected,
  onSelect,
}: Readonly<{
  options: readonly { value: Value; label: string }[];
  selected: Value;
  onSelect: (value: Value) => void;
}>) {
  return (
    <EntryGroup>
      {options.map(({ value, label }) => (
        <SelectionRow
          key={value ?? ""}
          label={label}
          selected={selected === value}
          onPress={() => onSelect(value)}
        />
      ))}
    </EntryGroup>
  );
}
