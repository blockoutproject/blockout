import React from "react";
import {StyleSheet, Text, View} from "react-native";

import {useAppTheme} from "@/src/context/ThemeProvider";
import type {EnrichedPoolDTO} from "@/src/types/Pool";

type Props = {
  enrichedPool: EnrichedPoolDTO;
};

/**
 * Keep pool details renderable on the local web characterization surface.
 * Interactive maps remain a native iOS and Android capability.
 */
const PoolMapCard: React.FC<Props> = ({enrichedPool}) => {
  const theme = useAppTheme();
  const locatedTeams = enrichedPool.ranking.filter(
    (team) =>
      typeof team.latitude === "number" && typeof team.longitude === "number",
  ).length;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: enrichedPool.division.mainColor,
        },
      ]}
    >
      <Text style={[styles.title, {color: theme.text}]}>Carte native</Text>
      <Text style={[styles.message, {color: theme.textInactive}]}>
        {locatedTeams} équipe{locatedTeams > 1 ? "s" : ""} localisée
        {locatedTeams > 1 ? "s" : ""} sur iOS et Android.
      </Text>
    </View>
  );
};

export default PoolMapCard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    borderWidth: 2,
    padding: 24,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
  },
  message: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
  },
});
