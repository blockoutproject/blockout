import { StyleSheet, View } from "react-native";
import type { FollowOptionsResponse } from "../../../../.generated/schemas/index.zod";
import { SeasonSelector } from "../../../shared/components/season-selector";

/** Controlled season trigger; its caller owns navigation and the sole accepted personal-space choice. */
export interface PersonalSeasonSelectorProps {
  options?: FollowOptionsResponse;
  seasonId?: string;
  disabled?: boolean;
  onPress: () => void;
}

/** Adapts personal labels to the shared trigger while reserving space beside Home's tabs. */
export function PersonalSeasonSelector({
  options,
  seasonId,
  disabled = false,
  onPress,
}: PersonalSeasonSelectorProps) {
  const label = !options
    ? "Saison"
    : (options.seasons.find((season) => season.id === seasonId)?.label ??
      (seasonId ? "Saison" : "Toutes saisons"));
  return (
    <View style={styles.container}>
      <SeasonSelector
        label={label}
        accessibilityLabel="Saison des suivis"
        disabled={disabled}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { maxWidth: "50%" },
});
