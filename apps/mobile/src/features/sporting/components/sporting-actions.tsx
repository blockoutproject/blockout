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
    borderTopWidth: tokens.borderWidth,
    paddingTop: tokens.spacing.md,
  },
});
