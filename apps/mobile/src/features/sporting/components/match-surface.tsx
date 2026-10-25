import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import type { SportingDivisionResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";

/** Figma's match surfaces share the current division border; content owns its internal insets. */
export interface MatchSurfaceProps extends PropsWithChildren {
  division?: SportingDivisionResponse;
}

/** Flat 22 px surface; the canonical six-digit division color receives Context border/default alpha. */
export function MatchSurface({ division, children }: MatchSurfaceProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.surface, { backgroundColor: colors.surface }]}>
      {children}
      <View
        pointerEvents="none"
        accessible={false}
        style={[
          styles.stroke,
          {
            borderColor: division
              ? `${division.color}${tokens.sporting.borderAlpha}`
              : colors.border,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: tokens.radius.sheet,
    overflow: "hidden",
  },
  // Figma's inside stroke overlays content instead of shrinking its full-width slots.
  stroke: {
    ...StyleSheet.absoluteFill,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
  },
});
