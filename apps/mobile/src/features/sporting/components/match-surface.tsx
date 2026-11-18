import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import type { SportingDivisionResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";

/** Figma's match surfaces share the current division border; content owns its internal insets. */
export interface MatchSurfaceProps extends PropsWithChildren {
  division?: SportingDivisionResponse;
  /** The primary consultation card is raised; informational copies remain flat. */
  raised?: boolean;
}

/** Clips its content to the rounded outline while the main card's shadow sits outside it. */
export function MatchSurface({
  division,
  raised = false,
  children,
}: Readonly<MatchSurfaceProps>) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: colors.surface,
          boxShadow: raised ? colors.cardShadow : undefined,
        },
      ]}
    >
      {children}
      <View
        pointerEvents="none"
        accessible={false}
        style={[
          styles.stroke,
          {
            borderColor: division
              ? `${division.color}${colors.contextBorderAlpha}`
              : colors.border,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: tokens.radius.panel,
    overflow: "hidden",
  },
  // Figma's inside stroke overlays content instead of shrinking its full-width slots.
  stroke: {
    ...StyleSheet.absoluteFill,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
  },
});
