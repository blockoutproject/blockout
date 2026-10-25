import { Link } from "expo-router";
import { StyleSheet } from "react-native";
import { useTheme } from "../../shared/theme/theme-provider";
import { tokens } from "../../shared/theme/tokens";
import { useAdministrationCapabilities } from "../access/api/use-administration-capabilities";
import type { PresentationTarget } from "./api/presentation";

/** Resource actions can compose this entry without importing the editor or duplicating F12's permission rules. */
export interface PresentationEntryProps {
  target: PresentationTarget;
}
/** Current action-specific link; route admission and server authorization remain independently enforced. */
export function PresentationEntry({ target }: PresentationEntryProps) {
  const { permissions } = useAdministrationCapabilities();
  const { colors } = useTheme();
  if (permissions?.manageSportingPresentation !== true) return null;
  return (
    <Link
      href={{
        pathname: "/administration/presentation/[kind]/[id]",
        params: { kind: target.kind, id: target.id },
      }}
      style={[
        styles.link,
        {
          color: colors.text,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
      ]}
    >
      Modifier la présentation
    </Link>
  );
}
const styles = StyleSheet.create({
  link: {
    ...tokens.typography.strong,
    minHeight: tokens.size.control,
    padding: tokens.spacing.lg,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.control,
  },
});
