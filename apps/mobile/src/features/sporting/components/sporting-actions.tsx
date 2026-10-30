import type {
  SportingSeasonResponse,
  SupportTargetRequest,
} from "../../../../.generated/schemas/index.zod";
import { useRouter } from "expo-router";
import { Flag } from "lucide-react-native";
import { IconButton } from "../../../shared/components/icon-button";
import { supportHref } from "../../support";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import {
  FollowButton,
  FollowerCount,
  type FollowingTarget,
} from "../../following";

/** Current public target/season; other action owners retain their existing slots. */
export interface SportingActionsProps {
  target: FollowingTarget;
  season: SportingSeasonResponse;
}

/** F03's separated action region matches the entity profile; the private read stays with F06. */
export function SportingActions(props: SportingActionsProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.actions, { borderColor: colors.border }]}>
      <FollowButton {...props} />
      <FollowerCount target={props.target} />
    </View>
  );
}

/** Attempted navigation identity; no successful detail read or invented public name is required. */
export interface SportingSupportActionProps {
  target: SupportTargetRequest;
}

/** Keeps the shared support form reachable from every existing sporting detail state. */
export function SportingSupportAction({ target }: SportingSupportActionProps) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <IconButton
      label="Signaler un problème"
      onPress={() =>
        router.push(
          supportHref({
            screen: target.type,
            targetType: target.type,
            targetId: target.id,
          }),
        )
      }
    >
      <Flag accessible={false} size={tokens.size.icon.lg} color={colors.icon} />
    </IconButton>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spacing.md,
    borderTopWidth: tokens.border.thin,
    paddingTop: tokens.spacing.md,
  },
});

/** Match contribution entry stays owned by F08; other sporting actions retain their owners. */
export {
  ContributionEntry as MatchContributionAction,
  useContributionEntry as useMatchContributionAction,
} from "../../contributions/entry";
