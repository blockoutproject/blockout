import { useSportingNavigation } from "../navigation";
import { CalendarDays, FileText } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import type {
  MatchDetailResponse,
  MatchDocumentKindEnum,
} from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { formatSportingSchedule } from "../model/sporting-time";
import {
  ContactLink,
  InformationRow,
  mapDestination,
  safeWebsite,
} from "./contact-link";
import { matchDocumentLabels } from "../api/match-document";
import { MatchSurface } from "./match-surface";

/** Independent current match facts and explicitly offered document actions. */
export interface MatchInformationProps {
  detail: MatchDetailResponse;
  displayTimeZone?: string;
  /** An explicit document opening uses the screen-owned full-screen reader. */
  onDocumentOpen(kind: MatchDocumentKindEnum): void;
}

/** Approved information order: division, schedule, referees, pool, venue and qualified source. */
export function MatchInformation({
  detail,
  displayTimeZone,
  onDocumentOpen,
}: MatchInformationProps) {
  const sporting = useSportingNavigation();
  const { colors } = useTheme();
  const match = detail.match;
  const division = match.pool.classification.division;
  const information = detail.documents.some(
    (document) => document.kind === "information",
  );
  const schedule = formatSportingSchedule(match.schedule, displayTimeZone);
  return (
    <MatchSurface division={division}>
      <View style={styles.heading}>
        <Text
          accessibilityRole="header"
          style={[tokens.typography.heading, { color: colors.text }]}
        >
          Informations
        </Text>
      </View>
      <InformationRow
        label="Division"
        value={division?.name ?? "-"}
        separated={false}
      />
      <InformationRow
        label="Date et heure"
        value={`${schedule.date}${match.schedule.instant ? " à " : "\n"}${schedule.time}`}
      />
      <InformationRow
        label="Arbitres"
        value={detail.referees?.length ? detail.referees.join("\n") : "-"}
      />
      <InformationRow
        label="Poule"
        value={match.pool.pool.name}
        supporting={
          [match.pool.competitionName, match.pool.phaseName]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        onPress={() => void sporting.navigate("pool", match.pool.pool.id)}
      />
      {information ? (
        <InformationRow
          label="Lieu"
          value={
            [detail.venueName, detail.venueAddress]
              .filter(Boolean)
              .join(" · ") || matchDocumentLabels.information
          }
          supporting="Fiche d’information (PDF)"
          icon={FileText}
          onPress={() => onDocumentOpen("information")}
        />
      ) : (
        <ContactLink
          presentation="information"
          label="Lieu"
          value={
            [detail.venueName, detail.venueAddress]
              .filter(Boolean)
              .join(" · ") || undefined
          }
          destination={
            detail.venueAddress
              ? mapDestination(detail.venueAddress)
              : undefined
          }
        />
      )}
      {detail.officialCalendarUrl && (
        <ContactLink
          presentation="information"
          label="Source"
          value="Calendrier officiel"
          destination={safeWebsite(detail.officialCalendarUrl)}
          icon={CalendarDays}
        />
      )}
      {detail.documents
        .filter((document) => document.kind !== "information")
        .map((document) => (
          <InformationRow
            key={document.kind}
            label="Document"
            value={matchDocumentLabels[document.kind]}
            supporting="PDF"
            icon={FileText}
            onPress={() => onDocumentOpen(document.kind)}
          />
        ))}
    </MatchSurface>
  );
}

const styles = StyleSheet.create({
  heading: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
  },
});
