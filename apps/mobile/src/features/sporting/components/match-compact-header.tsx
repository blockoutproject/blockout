import type { ReactNode } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import type { MatchSummaryResponse } from "../../../../.generated/schemas/index.zod";
import { PageHeader } from "../../../shared/components/page-header";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useReducedMotion } from "../../../shared/theme/use-reduced-motion";
import { formatSportingSchedule } from "../model/sporting-time";
import { SportingLogo } from "./sporting-identity";

/** Actual summary geometry and the chrome's native offset drive one decorative handoff; actions remain independent. */
export interface MatchCompactHeaderProps {
  match: MatchSummaryResponse;
  scrollY: SharedValue<number>;
  teamsTop?: number;
  displayTimeZone: string;
  action?: ReactNode;
}

/** Approved compact team/score recap, revealed just before the full team rows reach fixed navigation. */
export function MatchCompactHeader({
  match,
  scrollY,
  teamsTop,
  displayTimeZone,
  action,
}: MatchCompactHeaderProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const result = match.result;
  const recap =
    result?.state === "final"
      ? `${result.homeSets ?? "-"} – ${result.awaySets ?? "-"}`
      : result?.state === "provisional"
        ? "Provisoire"
        : result?.state === "unconfirmed"
          ? "Non confirmé"
          : match.category === "completed"
            ? "-"
            : formatSportingSchedule(match.schedule, displayTimeZone).time;
  const fade = useAnimatedStyle(() => {
    // The prototype hands off across 40 points, beginning 28 points before the team rows meet the header.
    const progress =
      teamsTop === undefined
        ? 0
        : Math.min(1, Math.max(0, (scrollY.value - teamsTop + 28) / 40));
    return { opacity: reducedMotion ? (progress >= 1 ? 1 : 0) : progress };
  });
  return (
    <PageHeader
      title={`${match.home.name} · ${recap} · ${match.away.name}`}
      action={action}
    >
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.recap, fade]}
      >
        <SportingLogo kind="team" identity={match.home} size={28} />
        <Text numberOfLines={1} style={[styles.score, { color: colors.text }]}>
          {recap}
        </Text>
        <SportingLogo kind="team" identity={match.away} size={28} />
      </Animated.View>
    </PageHeader>
  );
}

const styles = StyleSheet.create({
  recap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.sm,
    maxWidth: "100%",
  },
  score: { ...tokens.typography.navigation, flexShrink: 1 },
});
