import { useRouter } from "expo-router";
import { Check, Plus } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import type { SportingSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { isUncertainMutationFailure } from "../../../shared/api/api-fetch";
import { Button } from "../../../shared/components/button";
import { RequestError } from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useFollowState } from "../api/follow-state";
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

/** Uses the existing F05 invitation and F13 busy/success controls without a Pro gate. */
export function FollowButton({ target, season }: FollowButtonProps) {
  const context = useFollowState(target);
  const action = useFollowMutation(target, context);
  const router = useRouter();
  const { colors } = useTheme();
  const { query, profile, usable, sessionStatus } = context;
  const latest = action.latest;
  const failed = latest?.status === "error";
  const unavailable = [query.error, latest?.error].some(isFollowRestriction);
  if (unavailable)
    return (
      <RequestError
        message="Le suivi est indisponible pour cette ressource."
        onRetry={usable ? () => void query.refetch() : undefined}
        retrying={query.isFetching}
      />
    );
  const provisional =
    action.pending && typeof latest?.variables === "boolean"
      ? latest.variables
      : undefined;
  const following = provisional ?? query.data?.following;
  const uncertain = failed && isUncertainMutationFailure(latest.error);
  const guest = sessionStatus === "guest";
  return (
    <View style={styles.control}>
      <Button
        label={
          uncertain ? "Réessayer le suivi" : following ? "Suivi" : "Suivre"
        }
        variant={following && !uncertain ? "success" : "primary"}
        trailingIcon={following && !uncertain ? Check : Plus}
        loading={
          action.pending ||
          (!guest && usable && query.isPending && !query.isError)
        }
        disabled={
          !guest && (!usable || following === undefined || query.isError)
        }
        onPress={() => {
          if (guest)
            router.push({
              pathname: "/sign-in-invitation",
              params: { reason: "follow" },
            });
          else
            action.replace(
              failed && typeof latest.variables === "boolean"
                ? latest.variables
                : !following,
            );
        }}
      />
      {profile.isError ? (
        <RequestError
          message="Votre profil est indisponible. Le suivi est suspendu."
          onRetry={() => void profile.refetch()}
          retrying={profile.isFetching}
        />
      ) : query.isError ? (
        <RequestError
          message="Impossible de lire le suivi."
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : failed ? (
        <RequestError
          message={
            uncertain
              ? "Le résultat du suivi n’a pas pu être confirmé. Vous pouvez réessayer la même demande."
              : "La demande de suivi a échoué. Vous pouvez réessayer."
          }
        />
      ) : latest?.status === "success" && following ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[tokens.typography.body, { color: colors.text }]}
        >
          {latest.observed
            ? "État actuel : suivi. Une demande retardée peut encore aboutir."
            : `Suivi confirmé pour la saison ${season.label}. Retrouvez-le dans cette saison ou Toutes les saisons.`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ control: { gap: tokens.spacing.sm } });
