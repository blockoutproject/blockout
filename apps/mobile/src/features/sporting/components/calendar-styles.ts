import { StyleSheet } from "react-native";
import { tokens } from "@/shared/theme/tokens";

/** Layout shared by the virtualized calendar and its initial placeholders. */
export const calendarStyles = StyleSheet.create({
  dateHeading: {
    gap: tokens.spacing.xs,
    paddingTop: tokens.spacing.sm,
    paddingRight: tokens.spacing.xs,
  },
  stackedDate: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingBottom: tokens.spacing.sm,
  },
  poolHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
  },
  poolCopy: { flex: 1, minWidth: 0, gap: tokens.spacing.xs },
  matchInset: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
  },
  firstMatch: { paddingTop: tokens.spacing.lg },
  lastMatch: { paddingBottom: tokens.spacing.lg },
  matchCard: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.control,
    overflow: "hidden",
  },
  matchContent: { flexDirection: "row", alignItems: "stretch" },
  matchTeams: { flex: 1, minWidth: 0 },
  matchTeam: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    minHeight: tokens.sporting.calendarMatch.teamMinHeight,
    padding: tokens.spacing.sm,
  },
  matchTime: { padding: tokens.spacing.xs, justifyContent: "center" },
});
