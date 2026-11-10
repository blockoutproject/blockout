import { hashKey } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Check, Plus, RotateCw } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SportingSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { controlOpacity } from "../../../shared/components/control-styles";
import { LoadingIndicator } from "../../../shared/components/loading-indicator";
import { useTheme } from "../../../shared/theme/theme-provider";
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

/** Keeps the action/audience row stable while only private action and recovery lifetimes follow the captured owner. */
export function FollowControl({
  target,
  season,
  read,
  audience,
}: Readonly<FollowControlProps>) {
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
  const failedRead =
    !guest &&
    (unavailable || query.isError || (query.isPending && !query.isFetching));
  const privateKey = hashKey(read.options.queryKey);

  return (
    <View style={styles.control}>
      <View style={styles.row}>
        <FollowAction
          key={privateKey}
          target={target}
          season={season}
          read={read}
          following={following}
          initialLoading={initialLoading}
          unavailable={unavailable}
        />
        {audience}
      </View>
      {failedRead ? (
        <FollowReadRecovery
          key={privateKey}
          read={read}
          following={following}
        />
      ) : null}
    </View>
  );
}

/** Confirmed presentation accompanies the original target/read; replacing its owner cannot retain a prior command's pending state. */
interface FollowActionProps {
  target: FollowingTarget;
  season: SportingSeasonResponse;
  read: FollowStateRead;
  following: boolean | undefined;
  initialLoading: boolean;
  unavailable: boolean;
}

/** Owns one explicit mutation and guest invitation without remounting the adjacent public audience. */
function FollowAction({
  target,
  season,
  read,
  following,
  initialLoading,
  unavailable,
}: Readonly<FollowActionProps>) {
  const action = useFollowMutation(target, read);
  const router = useRouter();
  const feedback = useActionFeedback();
  const guest = read.sessionStatus === "guest";
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

/** Local safe-read feedback shares the captured relationship and owns no public audience or mutation state. */
interface FollowReadRecoveryProps {
  read: FollowStateRead;
  following: boolean | undefined;
}

/** Keys only this explicit Retry gesture to the private read, with no command replay or observer-owned progress. */
function FollowReadRecovery({
  read,
  following,
}: Readonly<FollowReadRecoveryProps>) {
  const { colors } = useTheme();
  const [retrying, setRetrying] = useState(false);
  const { query, usable } = read;
  const canRetry = usable && query.isEnabled;
  const busy = retrying && query.isFetching;

  /** Joins the captured pending or paused read; only this gesture's actual fetch shows progress and no mutation is replayed. */
  async function retryRead() {
    if (!canRetry || busy) {
      return;
    }
    setRetrying(true);
    try {
      await query.refetch({ cancelRefetch: false });
    } finally {
      setRetrying(false);
    }
  }

  return (
    <View style={styles.recovery}>
      <Text
        accessibilityLiveRegion="polite"
        style={[
          styles.recoveryText,
          styles.message,
          { color: colors.secondaryText },
        ]}
      >
        {following === undefined
          ? "Suivi indisponible."
          : "Actualisation du suivi indisponible."}
      </Text>
      {canRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Réessayer le suivi"
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          onPress={() => void retryRead()}
          style={({ pressed }) => [
            styles.retry,
            { opacity: controlOpacity(busy, pressed) },
          ]}
        >
          {busy ? (
            <LoadingIndicator color={colors.secondaryText} />
          ) : (
            <RotateCw
              accessible={false}
              size={tokens.size.icon.md}
              color={colors.secondaryText}
            />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  control: { alignSelf: "stretch", minWidth: 0, gap: tokens.spacing.xs },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: tokens.spacing.md,
    rowGap: tokens.spacing.sm,
  },
  recovery: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.xs,
  },
  // Pattern / Follow Controls uses the existing 12-point regular type with its 18-point line.
  recoveryText: {
    ...tokens.typography.body,
    fontSize: tokens.typography.metadata.fontSize,
    lineHeight: tokens.typography.label.lineHeight,
  },
  message: { flex: 1, minWidth: 0 },
  retry: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    minHeight: tokens.touch.minimum,
    minWidth: tokens.touch.minimum,
  },
});
