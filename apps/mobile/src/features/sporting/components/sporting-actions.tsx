import type {
  SportingSeasonResponse,
  SupportTargetRequest,
} from "../../../../.generated/schemas/index.zod";
import { useRouter } from "expo-router";
import { Flag } from "lucide-react-native";
import { IconButton } from "@/shared/components/icon-button";
import { supportHref } from "@/features/support";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import {
  FollowButton,
  FollowControl,
  FollowerCount,
  type FollowStateRead,
  type FollowingTarget,
} from "@/features/following";

/** Current public target/season; F06 owns the private relationship and independent public count. */
export interface SportingActionsProps {
  target: FollowingTarget;
  season: SportingSeasonResponse;
  /** The route shares this same reader with F03's initial composition. */
  read?: FollowStateRead;
}

/** F06 keeps the shared action/audience row stable inside the identity card and resets only its private control state. */
export function SportingActions(props: Readonly<SportingActionsProps>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.actions, { borderTopColor: colors.border }]}>
      {props.read ? (
        <FollowControl
          target={props.target}
          season={props.season}
          read={props.read}
          audience={<FollowerCount target={props.target} />}
        />
      ) : (
        <FollowButton
          target={props.target}
          season={props.season}
          audience={<FollowerCount target={props.target} />}
        />
      )}
    </View>
  );
}

/** Attempted navigation identity; no successful detail read or invented public name is required. */
export interface SportingSupportActionProps {
  target: SupportTargetRequest;
}

/** Keeps the shared support form reachable from every existing sporting detail state. */
export function SportingSupportAction({
  target,
}: Readonly<SportingSupportActionProps>) {
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
    minHeight: tokens.touch.minimum,
    borderTopWidth: tokens.border.thin,
    paddingTop: tokens.spacing.md,
  },
});

/** Match contribution entry stays owned by F08; other sporting actions retain their owners. */
export {
  ContributionEntry as MatchContributionAction,
  useContributionEntry as useMatchContributionAction,
} from "@/features/contributions/entry";

/** F02 owns presentation editing and F12 owns its current capability; no match/result editor is exposed. */
export { PresentationEntry as SportingPresentationAction } from "@/features/sporting-administration/entry";
