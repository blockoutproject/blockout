import type { PropsWithChildren } from "react";
import { Text } from "react-native";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
/** Readable copy for unavailable/partial facts; missing information never becomes a fabricated value. */
export function ResourceText({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return (
    <Text style={[tokens.typography.body, { color: colors.secondaryText }]}>
      {children}
    </Text>
  );
}
