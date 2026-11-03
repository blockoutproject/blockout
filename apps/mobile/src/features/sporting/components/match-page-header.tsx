import { useContext, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useDerivedValue } from "react-native-reanimated";
import type { MatchSummaryResponse } from "../../../../.generated/schemas/index.zod";
import { NavigationScrollOffsetContext } from "../../../shared/components/navigation-backdrop";
import { PageHeader } from "../../../shared/components/page-header";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { matchHeaderLabel } from "../model/match-presentation";
import { SportingLogo } from "./sporting-identity";

/** Accepted public match facts supply the compact center; contextual actions remain independent. */
export interface MatchPageHeaderProps {
  match: MatchSummaryResponse;
  action?: ReactNode;
}

/** The ordinary page's existing native offset reveals ordered logos and accepted result context without measuring the summary. */
export function MatchPageHeader({ match, action }: MatchPageHeaderProps) {
  const offset = useContext(NavigationScrollOffsetContext);
  const progress = useDerivedValue(() =>
    Math.min(1, Math.max(0, offset?.get() ?? 0) / tokens.layout.header),
  );
  const { colors } = useTheme();
  const label = matchHeaderLabel(match);
  return (
    <PageHeader
      title={`${match.home.name} · ${label} · ${match.away.name}`}
      revealProgress={progress}
      action={action}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.recap}
      >
        <SportingLogo kind="team" identity={match.home} size={28} />
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.label, { color: colors.text }]}
        >
          {label}
        </Text>
        <SportingLogo kind="team" identity={match.away} size={28} />
      </View>
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
  label: { ...tokens.typography.navigation, flexShrink: 1 },
});
