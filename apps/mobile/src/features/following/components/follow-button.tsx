import { isAccessDenied } from "../../../shared/api/access-denied";
import { useRouter } from "expo-router";
import { Check, Plus } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import type { SportingSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { isUncertainMutationFailure } from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import {
  AccessDenied,
  RequestError,
} from "../../../shared/components/request-feedback";
import { tokens } from "../../../shared/theme/tokens";
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
  /** Public F02 accent used by the approved follow action's contextual border. */
  contextColor?: string;
}

/** Uses the compact inverse Figma action and F05 invitation without a Pro gate or extra success panel. */
export function FollowButton({
  target,
  season,
  contextColor,
}: FollowButtonProps) {
  const context = useFollowStateQuery(target);
  const action = useFollowMutation(target, context);
  const router = useRouter();
  const feedback = useActionFeedback();
  const { query, profile, usable, sessionStatus } = context;
  const latest = action.latest;
  const failed = latest?.status === "error";
  const restriction = [query.error, latest?.error].find(
    (error) => isAccessDenied(error) || isFollowRestriction(error),
  );
  const unavailable = restriction !== undefined;
  if (unavailable)
    return (
      <View style={styles.control}>
        {isAccessDenied(restriction) ? (
          <AccessDenied message="Le suivi est indisponible pour cette ressource." />
        ) : (
          <RequestError message="Le suivi est indisponible pour cette ressource." />
        )}
        {usable && (
          <Button
            label={
              isAccessDenied(restriction)
                ? "Vérifier l’accès"
                : "Vérifier la disponibilité"
            }
            onPress={() => void query.refetch()}
            loading={query.isFetching}
          />
        )}
      </View>
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
        contextColor={contextColor}
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
          (!usable ||
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
                !isUncertainMutationFailure(error) &&
                !isFollowRestriction(error)
              )
                feedback.error();
            }
          }
        }}
      />
      {isAccessDenied(profile.error) ? (
        <AccessDenied message="Votre profil n’est pas accessible. Le suivi est suspendu." />
      ) : profile.isError ? (
        <RequestError
          message="Votre profil est indisponible. Le suivi est suspendu."
          onRetry={() => void profile.refetch()}
          retrying={profile.isFetching}
        />
      ) : query.isError && !canRepeatUncertain ? (
        <RequestError
          message="Impossible de lire le suivi."
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : uncertain ? (
        <RequestError message="Le résultat du suivi n’a pas pu être confirmé. Vous pouvez réessayer la même demande." />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ control: { gap: tokens.spacing.sm } });
