import { Text } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";

/** Field-owned validation takes precedence over optional guidance; no request error belongs here. */
export interface FieldMessageProps {
  error?: string;
  helper?: string;
  disabled?: boolean;
}

/** Keeps validation announcement and supporting typography identical across native controls. */
export function FieldMessage({ error, helper, disabled }: FieldMessageProps) {
  const { colors } = useTheme();
  const message = error || helper;
  if (!message) return null;
  return (
    <Text
      accessibilityRole={error ? "alert" : undefined}
      accessibilityLiveRegion={error ? "polite" : undefined}
      style={[
        tokens.typography.metadata,
        {
          color: error ? colors.error : colors.secondaryText,
          opacity: disabled ? tokens.opacity.disabled : 1,
        },
      ]}
    >
      {message}
    </Text>
  );
}
