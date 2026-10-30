import { StyleSheet, Text, View } from "react-native";
import type {
  StreamQuotaResponse,
  StreamSubmissionEligibilityResponse,
} from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import {
  currentSportingTimeZone,
  formatSportingTime,
} from "../../sporting/notification-presentation";

/** Accepted original-account projection; the moderation grant explains exemptions but never enables a command. */
export interface ContributionQuotaProps {
  quota: StreamQuotaResponse;
  eligibility: StreamSubmissionEligibilityResponse;
  moderator: boolean;
}

/** Presents server usage and local deadlines without deriving eligibility, resetting usage or scheduling reads. */
export function ContributionQuota({
  quota,
  eligibility,
  moderator,
}: ContributionQuotaProps) {
  const { colors } = useTheme();
  const textStyle = [
    tokens.typography.metadata,
    { color: colors.secondaryText },
  ];
  return (
    <View style={styles.summary}>
      <Text
        style={textStyle}
        accessibilityHint="La limite de trois versions par match ne se renouvelle pas. Une adresse identique déjà publiée ou en attente ne consomme aucun quota supplémentaire. Un refus ne consomme rien ; annuler ou retirer une version ne restitue aucun quota."
      >
        {quota.versionsUsed}/3 versions pour ce match · {quota.dailyMatchesUsed}
        /3 matchs aujourd’hui (Paris)
      </Text>
      <Text style={textStyle}>
        {quota.matchCountedToday
          ? "Ce match est déjà compté aujourd’hui."
          : "Ce match n’est pas encore compté aujourd’hui."}
      </Text>
      {moderator && (
        <Text style={textStyle}>
          Les publications de modération sont exemptées de ces quotas.
        </Text>
      )}
      <Text style={textStyle}>
        Journée de Paris jusqu’au {formatDeadline(quota.dayEndsAt)}.
      </Text>
      {!eligibility.canSubmit && eligibility.reason && (
        <Text style={textStyle}>{eligibility.reason}</Text>
      )}
      {!eligibility.canSubmit && eligibility.eligibleAt && (
        <Text style={textStyle}>
          À revérifier à partir du {formatDeadline(eligibility.eligibleAt)}.
        </Text>
      )}
    </View>
  );
}

/** Formats an established server instant with F03's time formatter and an absolute local date; never consults the current time. */
function formatDeadline(instant: string): string {
  const zone = currentSportingTimeZone();
  const date = new Intl.DateTimeFormat("fr-FR", {
    timeZone: zone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(instant));
  return `${date} à ${formatSportingTime(instant, zone)} (${zone})`;
}

const styles = StyleSheet.create({
  summary: { gap: tokens.spacing.tight },
});
