import { useQuery } from "@tanstack/react-query";
import { Globe, MapPin } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useConsultationQueries } from "../api/use-consultation-queries";
import {
  ResourceCard,
  ResourceFeedback,
  ResourcePage,
  ResourceText,
} from "../components/resource-page";
import { resourceUnavailable } from "../model/consultation-availability";
import {
  ContactLink,
  mapDestination,
  safeWebsite,
} from "../components/contact-link";
import { MatchSummary } from "../components/match-summary";

/** Exact dated public match identity; document/contribution/support integrations remain owner work. */
export interface MatchScreenProps {
  matchId: string;
}

/** Presents independent accepted match facts; a missing secondary section never replaces another. */
export function MatchScreen({ matchId }: MatchScreenProps) {
  const queries = useConsultationQueries();
  const match = useQuery({
    ...queries.match(matchId),
    refetchOnMount: "always",
    retryOnMount: true,
  });
  const { colors } = useTheme();
  const data = resourceUnavailable(match.error) ? undefined : match.data;
  return (
    <ResourcePage title="Match">
      <ResourceFeedback query={match} />
      {data && (
        <>
          <MatchSummary match={data.match} />
          <ResourceCard>
            <Text
              accessibilityRole="header"
              style={[styles.heading, { color: colors.text }]}
            >
              Score
            </Text>
            {data.sets ? (
              data.sets.items.length ? (
                data.sets.items.map((set, index) => (
                  <View
                    key={index}
                    accessible
                    accessibilityLabel={`Set ${index + 1} : ${set.home} à ${set.away}`}
                    style={styles.set}
                  >
                    <Text style={[styles.points, { color: colors.text }]}>
                      {set.home}
                    </Text>
                    <ResourceText>SET {index + 1}</ResourceText>
                    <Text style={[styles.points, { color: colors.text }]}>
                      {set.away}
                    </Text>
                  </View>
                ))
              ) : (
                <ResourceText>Aucun set joué</ResourceText>
              )
            ) : (
              <ResourceText>Détail des sets indisponible</ResourceText>
            )}
          </ResourceCard>
          <ResourceCard>
            <Text
              accessibilityRole="header"
              style={[styles.heading, { color: colors.text }]}
            >
              Informations
            </Text>
            {data.venueName || data.venueAddress ? (
              <ContactLink
                label="Lieu du match"
                value={[data.venueName, data.venueAddress]
                  .filter(Boolean)
                  .join(" · ")}
                destination={
                  data.venueAddress
                    ? mapDestination(data.venueAddress)
                    : undefined
                }
                icon={MapPin}
              />
            ) : (
              <ResourceText>Lieu non renseigné</ResourceText>
            )}
            <ResourceText>
              {data.referees?.length
                ? `Arbitres : ${data.referees.join(", ")}`
                : "Arbitres non renseignés"}
            </ResourceText>
            {data.officialCalendarUrl && (
              <ContactLink
                label="Calendrier officiel FFVB"
                value={data.officialCalendarUrl}
                destination={safeWebsite(data.officialCalendarUrl)}
                icon={Globe}
              />
            )}
          </ResourceCard>
        </>
      )}
    </ResourcePage>
  );
}

const styles = StyleSheet.create({
  heading: { ...tokens.typography.heading },
  set: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
  },
  points: { ...tokens.typography.heading },
});
