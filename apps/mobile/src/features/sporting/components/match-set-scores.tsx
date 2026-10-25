import { Image } from "expo-image";
import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  MatchSetsResponse,
  MatchSummaryResponse,
} from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { MatchSurface } from "./match-surface";
import { SportingLogo } from "./sporting-identity";

/** Accepted set sequence and its original home/away identities; missing detail never becomes zeros. */
export interface MatchSetScoresProps {
  match: MatchSummaryResponse;
  sets?: MatchSetsResponse;
}

/** Approved Set Scores pattern; no empty score panel before any result or set detail is accepted. */
export function MatchSetScores({ match, sets }: MatchSetScoresProps) {
  const { colors } = useTheme();
  if (!match.result && !sets) return null;
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
              {[
                {
                  team: match.home,
                  side: "Domicile",
                  halo: require("../../../../assets/sporting/crest-halo-home.svg"),
                },
                {
                  team: match.away,
                  side: "Extérieur",
                  halo: require("../../../../assets/sporting/crest-halo-away.svg"),
                },
              ].map(({ team, side, halo }, index) => (
                <Fragment key={side}>
                  {index > 0 && <View style={styles.columnGap} />}
                  <View style={styles.team}>
                    <Image
                      accessible={false}
                      source={halo}
                      contentFit="contain"
                      style={styles.halo}
                    />
                    <SportingLogo
                      kind="team"
                      identity={team}
                      size={tokens.sporting.setLogo}
                    />
                    <Text
                      numberOfLines={2}
                      style={[styles.name, { color: colors.text }]}
                    >
                      {team.name}
                    </Text>
                    <Text
                      style={[styles.side, { color: colors.secondaryText }]}
                    >
                      {side}
                    </Text>
                  </View>
                </Fragment>
              ))}
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
                      borderTopWidth: tokens.borderWidth,
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
                    style={[styles.number, { color: colors.secondaryText }]}
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

const styles = StyleSheet.create({
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.md },
  heading: { ...tokens.typography.heading },
  teams: { flexDirection: "row", alignItems: "flex-start" },
  columnGap: { width: tokens.sporting.setTeamGap },
  team: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: tokens.spacing.label,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.sporting.setTeamBottom,
  },
  halo: {
    position: "absolute",
    width: tokens.sporting.haloSize,
    height: tokens.sporting.haloSize,
    top: tokens.sporting.haloTop,
    alignSelf: "center",
  },
  name: {
    ...tokens.typography.setTeam,
    textAlign: "center",
    alignSelf: "stretch",
    minHeight: tokens.sporting.setNameMinHeight,
  },
  side: { ...tokens.typography.setLabel, textAlign: "center" },
  set: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.sporting.setRowInline,
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
    width: tokens.sporting.setLabelWidth,
    textAlign: "center",
  },
});
