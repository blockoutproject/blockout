import { useOpenSignInInvitation } from "@/features/accounts/current-account";
import { hashKey } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { SportingSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { Button } from "@/shared/components/button";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import type { FollowStateRead } from "../api/use-follow-state-query";
import { useFollowMutation } from "../api/follow-mutations";
import type { FollowingTarget } from "../api/following-keys";

/** The supplied read belongs to this exact target; the route retains its one relationship observer. */
export interface FollowControlProps {
  target: FollowingTarget;
  season: SportingSeasonResponse;
  read: FollowStateRead;
  contextColor?: string;
  /** Appears beside the compact action and never becomes a private-read prerequisite. */
  audience?: ReactNode;
}

/** Keeps the independent audience mounted; the sporting page owns required relationship-read feedback. */
export function FollowControl({
  target,
  season,
  read,
  contextColor,
  audience,
}: Readonly<FollowControlProps>) {
  const privateKey = hashKey(read.options.queryKey);

  return (
    <View style={styles.row}>
      <FollowAction
        key={privateKey}
        target={target}
        season={season}
        read={read}
        contextColor={contextColor}
      />
      {audience}
    </View>
  );
}

/** Confirmed presentation accompanies the original target/read; replacing its owner cannot retain a prior command's pending state. */
interface FollowActionProps {
  target: FollowingTarget;
  season: SportingSeasonResponse;
  read: FollowStateRead;
  contextColor?: string;
}

/** Owns one explicit mutation and guest invitation without remounting the adjacent public audience. */
function FollowAction({
  target,
  season,
  read,
  contextColor,
}: Readonly<FollowActionProps>) {
  const action = useFollowMutation(target, read);
  const openSignInInvitation = useOpenSignInInvitation();
  const feedback = useActionFeedback();
  const { colors } = useTheme();
  const { query, usable, accountUsable, sessionStatus } = read;
  const guest = sessionStatus === "guest";
  const following = accountUsable ? query.data?.following : undefined;
  const initialLoading =
    !guest &&
    usable &&
    query.data === undefined &&
    query.isPending &&
    query.isFetching;
  const unavailable = !guest && following === undefined && !initialLoading;
  const followColor = unavailable || initialLoading ? undefined : contextColor;
  const followIcon = following ? Check : Plus;
  let label = "Suivre";
  if (unavailable) {
    label = "Indisponible";
  } else if (following) {
    label = "Suivi";
  }

  return (
    <Button
      label={label}
      size="compact"
      variant={following ? "secondary" : "solid"}
      contextColor={following ? colors.accentPrimary : followColor}
      leadingIcon={unavailable ? undefined : followIcon}
      selected={following}
      accessibilityHint={
        following && !action.isPending
          ? `Saison ${season.label}. Retrouvez ce suivi dans cette saison ou Toutes les saisons.`
          : `Saison ${season.label}.`
      }
      loading={action.isPending || initialLoading}
      disabled={!guest && (!read.usable || following === undefined)}
      onPress={async () => {
        if (guest) {
          openSignInInvitation("follow");
        } else if (read.usable && following !== undefined) {
          feedback.clear();
          try {
            await action.mutateAsync(!following);
          } catch {
            feedback.error();
          }
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: tokens.spacing.md,
    rowGap: tokens.spacing.sm,
  },
});
