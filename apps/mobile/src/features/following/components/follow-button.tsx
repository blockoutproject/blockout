import { ErrorState } from "../../../shared/components/state-card";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useRouter } from "expo-router";
import { Check, Plus } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import type { SportingSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { isUncertainMutationFailure } from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";

import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useFollowStateQuery } from "../api/use-follow-state-query";
import {
  useFollowMutation,
  isFollowRestriction,
} from "../api/follow-mutations";
import type { FollowingTarget } from "../api/following-keys";

/** Exact viewable target and its season; confirmation never changes a personal-space filter. */
export interface FollowButtonProps {
  target: FollowingTarget;
  season: SportingSeasonResponse;
}

/** Uses the borderless compact inverse action and F05 invitation without a Pro gate or extra success panel. */
export function FollowButton({ target, season }: FollowButtonProps) {
  const context = useFollowStateQuery(target);
  const action = useFollowMutation(target, context);
  const router = useRouter();
  const feedback = useActionFeedback();
  const { colors } = useTheme();
  const { query, profile, usable, sessionStatus } = context;
  const latest = action.latest;
  const failed = latest?.status === "error";
  const restriction = [query.error, latest?.error].find(
    (error) => isAccessDenied(error) || isFollowRestriction(error),
  );
  const unavailable = restriction !== undefined;
  /** A fresh read releases only the existing availability guard; it never repeats a write. */
  async function reread() {
    feedback.clear();
    const result = await query.refetch();
    if (
      context.owner?.isCurrent(context.owner.generation) &&
      result.isError &&
      result.data
    )
      feedback.error();
  }
  if (query.isError && query.data === undefined)
    return (
      <ErrorState onRetry={() => void reread()} retrying={query.isFetching} />
    );
  const provisional =
    action.pending && typeof latest?.variables === "boolean"
      ? latest.variables
      : undefined;
  const following = provisional ?? query.data?.following;
  const uncertain = failed && isUncertainMutationFailure(latest.error);
  // A failed bounded observation preserves the original explicit same-command retry.
  // Query still exposes the read failure; current permission/visibility refusals were handled above.
  const canRepeatUncertain = uncertain && query.data !== undefined;
  const guest = sessionStatus === "guest";
  return (
    <View style={styles.control}>
      <Button
        label={
          uncertain ? "Réessayer le suivi" : following ? "Suivi" : "Suivre"
        }
        size="compact"
        variant="inverse"
        bordered={false}
        leadingIcon={following ? Check : Plus}
        selected={following ?? false}
        accessibilityHint={
          following && !action.pending
            ? `Saison ${season.label}. Retrouvez ce suivi dans cette saison ou Toutes les saisons.`
            : `Saison ${season.label}.`
        }
        loading={
          action.pending ||
          (!guest && usable && query.isPending && !query.isError)
        }
        disabled={
          !guest &&
          (unavailable ||
            !usable ||
            following === undefined ||
            (query.isError && !canRepeatUncertain))
        }
        onPress={async () => {
          if (guest)
            router.push({
              pathname: "/sign-in-invitation",
              params: { reason: "follow" },
            });
          else {
            feedback.clear();
            try {
              await action.start(
                failed && typeof latest.variables === "boolean"
                  ? latest.variables
                  : !following,
              );
            } catch (error) {
              if (
                context.owner?.isCurrent(context.owner.generation) &&
                !isUncertainMutationFailure(error)
              )
                feedback.error();
            }
          }
        }}
      />
      {profile.isError && !profile.data ? (
        <ErrorState
          onRetry={() => void profile.refetch()}
          retrying={profile.isFetching}
        />
      ) : query.isError && !canRepeatUncertain ? (
        <Button
          label="Réessayer"
          onPress={() => void reread()}
          loading={query.isFetching}
        />
      ) : uncertain ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[tokens.typography.body, { color: colors.text }]}
        >
          Le résultat du suivi n’a pas pu être confirmé. Vous pouvez réessayer
          la même demande.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ control: { gap: tokens.spacing.sm } });
