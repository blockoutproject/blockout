import { Check } from "lucide-react-native";
import { EntryRow } from "./entry-row";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";

/** Native single choice; callers retain the selected value and any navigation or commit behavior. */
export interface SelectionRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}

/** Uses the shared entry anatomy with a semantic radio state and a decorative trailing check. */
export function SelectionRow({
  label,
  selected,
  onPress,
  disabled,
}: SelectionRowProps) {
  const { colors } = useTheme();
  return (
    <EntryRow
      label={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      disabled={disabled}
      trailing={
        selected ? (
          <Check
            accessible={false}
            size={tokens.size.icon.md}
            color={colors.icon}
          />
        ) : undefined
      }
    />
  );
}
