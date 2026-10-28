import type { SportingSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { FollowButton, type FollowingTarget } from "../../following";

/** Current public target/season; other action owners retain their existing slots. */
export interface SportingActionsProps {
  target: FollowingTarget;
  season: SportingSeasonResponse;
  contextColor?: string;
}

/** F03's separated action region matches the entity profile; the private read stays with F06. */
export function SportingActions(props: SportingActionsProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.actions, { borderColor: colors.border }]}>
      <FollowButton {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    borderTopWidth: tokens.border.thin,
    paddingTop: tokens.spacing.md,
  },
});

/** Match contribution entry stays owned by F08; other sporting actions retain their owners. */
export { ContributionEntry as MatchContributionAction } from "../../contributions/entry";
