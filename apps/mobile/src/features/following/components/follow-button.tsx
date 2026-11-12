import { hashKey } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Check, Plus } from "lucide-react-native";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { SportingSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { tokens } from "../../../shared/theme/tokens";
import {
  useFollowStateQuery,
  type FollowStateRead,
} from "../api/use-follow-state-query";
import { useFollowMutation } from "../api/follow-mutations";
import type { FollowingTarget } from "../api/following-keys";

/** Exact public target/season and optional independent audience content; a deliberate press changes only its follow state. */
export interface FollowButtonProps {
  target: FollowingTarget;
  season: SportingSeasonResponse;
  /** Appears beside the compact action and never becomes a private-read prerequisite. */
  audience?: ReactNode;
}

/** The supplied read must belong to this target; the owning route retains its one relationship observer. */
export interface FollowControlProps extends FollowButtonProps {
  read: FollowStateRead;
}

/** Connects standalone consumers to F06's read while the independent audience retains its own lifetime. */
export function FollowButton(props: Readonly<FollowButtonProps>) {
  const read = useFollowStateQuery(props.target);
  return <FollowControl {...props} read={read} />;
}

/** Keeps the independent audience mounted; the sporting page owns required relationship-read feedback. */
export function FollowControl({
  target,
  season,
  read,
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
}

/** Owns one explicit mutation and guest invitation without remounting the adjacent public audience. */
function FollowAction({ target, season, read }: Readonly<FollowActionProps>) {
  const action = useFollowMutation(target, read);
  const router = useRouter();
  const feedback = useActionFeedback();
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
      variant="inverse"
      bordered={false}
      leadingIcon={unavailable ? undefined : followIcon}
      selected={following}
      accessibilityHint={
        following && !action.isPending
          ? `Saison ${season.label}. Retrouvez ce suivi dans cette saison ou Toutes les saisons.`
          : `Saison ${season.label}.`
      }
      loading={action.isPending || initialLoading}
      loadingIndicator={action.isPending ? "spinner" : "skeleton"}
      disabled={!guest && (!read.usable || following === undefined)}
      onPress={async () => {
        if (guest) {
          router.push({
            pathname: "/sign-in-invitation",
            params: { reason: "follow" },
          });
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
