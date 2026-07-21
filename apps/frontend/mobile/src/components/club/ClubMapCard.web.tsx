import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/src/context/ThemeProvider";
import type { Club } from "@/src/types/Club";

type Props = {
  club: Club;
};

/**
 * Keep the club details renderable on the local web characterization surface.
 * Interactive maps remain a native iOS and Android capability.
 */
const ClubMapCard: React.FC<Props> = ({ club }) => {
  const theme = useAppTheme();
  const hasCoordinates =
    typeof club.latitude === "number" && typeof club.longitude === "number";

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderColor: theme.primary },
      ]}
    >
      <Text style={[styles.title, { color: theme.text }]}>Carte native</Text>
      <Text style={[styles.message, { color: theme.textInactive }]}>
        {hasCoordinates
          ? "La localisation est disponible et sera affichée sur iOS et Android."
          : "Localisation indisponible pour ce club."}
      </Text>
    </View>
  );
};

export default ClubMapCard;

const styles = StyleSheet.create({
  container: {
    height: 220,
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
