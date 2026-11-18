import { StyleSheet, Text, View } from "react-native";
import type {
  MatchSetsResponse,
  MatchSummaryResponse,
  SportingIdentityResponse,
} from "../../../../.generated/schemas/index.zod";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { MatchSurface } from "./match-surface";
import { useSportingLogo } from "../api/use-sporting-logo";
import { SportingAtmosphere, SportingMedia } from "./sporting-media";

const scoreHaloSize = tokens.sporting.atmosphere.crestSize;

/** Accepted set sequence and its original home/away identities; missing detail never becomes zeros. */
export interface MatchSetScoresProps {
  match: MatchSummaryResponse;
  sets?: MatchSetsResponse;
}

/** Approved Set Scores pattern; no empty score panel before any result or set detail is accepted. */
export function MatchSetScores({ match, sets }: Readonly<MatchSetScoresProps>) {
  const { colors } = useTheme();
  if (!match.result && !sets) {
    return null;
  }
  return (
    <MatchSurface division={match.pool.classification.division}>
      <View style={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.heading, { color: colors.text }]}
        >
          Score
        </Text>
        {sets?.items.length ? (
          <>
            <View style={styles.teams}>
              <MatchScoreTeam identity={match.home} side="home" />
              <View style={styles.centerColumn} />
              <MatchScoreTeam identity={match.away} side="away" />
            </View>
            <View>
              {sets.items.map((set, index) => (
                <View
                  key={index}
                  accessible
                  accessibilityLabel={`Set ${index + 1} : ${set.home} à ${set.away}`}
                  style={[
                    styles.set,
                    index > 0 && {
                      borderTopWidth: tokens.border.thin,
                      borderTopColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.points,
                      {
                        color:
                          set.home >= set.away
                            ? colors.text
                            : colors.secondaryText,
                      },
                    ]}
                  >
                    {set.home}
                  </Text>
                  <Text
                    style={[
                      styles.number,
                      styles.centerColumn,
                      { color: colors.secondaryText },
                    ]}
                  >
                    SET {index + 1}
                  </Text>
                  <Text
                    style={[
                      styles.points,
                      {
                        color:
                          set.away >= set.home
                            ? colors.text
                            : colors.secondaryText,
                      },
                    ]}
                  >
                    {set.away}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            {sets ? "Aucun set joué" : "Détail des sets indisponible"}
          </Text>
        )}
      </View>
    </MatchSurface>
  );
}

/** Shares the current admitted source while keeping optional light failure independent from the sharp crest. */
function MatchScoreTeam({
  identity,
  side,
}: Readonly<{
  identity: SportingIdentityResponse;
  side: "home" | "away";
}>) {
  const { colors } = useTheme();
  const logo = useSportingLogo(identity, "team");
  return (
    <View style={styles.team}>
      {logo.uri && (
        <View pointerEvents="none" accessible={false} style={styles.halo}>
          <SportingAtmosphere
            key={logo.uri}
            uri={logo.uri}
            layout="crest"
            testID={`match-score-atmosphere-${identity.id}`}
          />
        </View>
      )}
      <SportingMedia
        key={`${identity.id}:${identity.logoUrl ?? ""}`}
        identity={identity}
        kind="team"
        size={tokens.sporting.setLogo}
        uri={logo.uri}
        loading={logo.loading}
        error={logo.error}
      />
      <Text
        numberOfLines={2}
        accessibilityLabel={identity.name}
        style={[styles.name, { color: colors.text }]}
      >
        {identity.name}
      </Text>
      <Text style={[styles.side, { color: colors.secondaryText }]}>
        {side === "home" ? "Domicile" : "Extérieur"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.md },
  heading: { ...tokens.typography.heading },
  teams: { flexDirection: "row", alignItems: "stretch" },
  // Header identities and every score row use the same three-column proportions.
  centerColumn: { width: "24%" },
  team: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: tokens.spacing.tight,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.sporting.setTeamBottom,
  },
  halo: {
    position: "absolute",
    width: scoreHaloSize,
    height: scoreHaloSize,
    top: tokens.spacing.md + (tokens.sporting.setLogo - scoreHaloSize) / 2,
  },
  name: {
    ...tokens.typography.setTeam,
    textAlign: "center",
    alignSelf: "stretch",
    flexGrow: 1,
  },
  side: { ...tokens.typography.setLabel, textAlign: "center" },
  set: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: tokens.spacing.md,
  },
  points: {
    ...tokens.typography.setScore,
    flex: 1,
    minWidth: 0,
    textAlign: "center",
  },
  number: {
    ...tokens.typography.setNumber,
    textAlign: "center",
  },
});
