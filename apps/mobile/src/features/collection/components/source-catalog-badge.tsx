import { StyleSheet, Text } from "react-native";
import type { SourceCatalogStatusEnum } from "../../../../.generated/schemas/index.zod";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { sourceCatalogLabels } from "../model/source-catalogue";

export function SourceCatalogBadge({
  status,
}: Readonly<{ status: SourceCatalogStatusEnum }>) {
  const { colors } = useTheme();
  const tones = {
    complete: [colors.onSuccessSubtle, colors.successSubtle],
    partial: [colors.warningOnSurface, colors.warningSubtle],
    unavailable: [colors.error, colors.errorSubtle],
    "not-read": [colors.secondaryText, colors.subtle],
  };
  const [color, backgroundColor] = tones[status];
  return (
    <Text
      style={[
        styles.badge,
        { color, backgroundColor, borderColor: colors.border },
      ]}
    >
      {sourceCatalogLabels[status]}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    ...tokens.typography.metadata,
    alignSelf: "flex-start",
    flexShrink: 1,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.optical,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.sm,
  },
});
