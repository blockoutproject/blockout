import type { PropsWithChildren } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

export const notificationTeamLines = 2;

export const notificationScoreSize = { width: 30, height: 26 };

/** Equal rows keep the independent match action's scores aligned at the device's text size. */
export function useNotificationTeamHeight() {
  const { fontScale } = useWindowDimensions();
  return Math.max(
    tokens.touch.minimum,
    tokens.typography.label.lineHeight * notificationTeamLines * fontScale,
  );
}

export function NotificationCard({
  divisionColor,
  children,
}: Readonly<PropsWithChildren<{ divisionColor?: string }>>) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        notificationCardLayout.card,
        {
          backgroundColor: colors.surface,
          borderColor: divisionColor
            ? `${divisionColor}${colors.contextBorderAlpha}`
            : colors.border,
          boxShadow: colors.cardShadow,
        },
      ]}
    >
      {children}
    </View>
  );
}

export const notificationCardLayout = StyleSheet.create({
  card: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panelInset,
    overflow: "hidden",
    gap: tokens.spacing.optical,
    paddingVertical: tokens.spacing.tight,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
  },
  inset: { marginHorizontal: tokens.spacing.md },
  pool: {
    flex: 1,
    minWidth: 0,
    minHeight: tokens.touch.minimum,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.compact,
  },
  identity: { flex: 1, minWidth: 0, gap: tokens.spacing.optical },
  participants: { flexDirection: "row", gap: tokens.spacing.sm },
  teams: { flex: 1, minWidth: 0 },
  team: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  teamCopy: { flex: 1, minWidth: 0 },
  match: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: tokens.spacing.xs,
    minWidth: tokens.touch.minimum,
  },
  scores: { alignSelf: "stretch" },
  scoreSlot: { flex: 1, justifyContent: "center" },
});
