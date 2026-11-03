import { useRouter } from "expo-router";
import { Check, Plus } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import type { SportingSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { isUncertainMutationFailure } from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useFollowStateQuery } from "../api/use-follow-state-query";
import { useFollowMutation } from "../api/follow-mutations";
import { AccountSessionFeedback } from "../../accounts/current-account";
import type { FollowingTarget } from "../api/following-keys";

/** Exact viewable target and its season; confirmation never changes a personal-space filter. */
export interface FollowButtonProps {
  target: FollowingTarget;
  season: SportingSeasonResponse;
}
/** Query owns confirmed availability and read recovery; the native mutation alone owns provisional writes and explicit replay. */
export function FollowButton({ target, season }: FollowButtonProps) {
  const context = useFollowStateQuery(target);
  const action = useFollowMutation(target, context);
  const router = useRouter();
  const feedback = useActionFeedback();
  const { colors } = useTheme();
  const { query, profile, usable, admitted, sessionStatus } = context;
  const guest = sessionStatus === "guest";
  const loadingContent = (
    <Button
      label="Suivre"
      size="compact"
      variant="inverse"
      bordered={false}
      leadingIcon={Plus}
      onPress={undefined}
      loading
      disabled
    />
  );
  if (!guest && sessionStatus !== "authenticated")
    return <AccountSessionFeedback loadingContent={loadingContent} />;
  if (!guest && admitted && !usable)
    return (
      <ReadFeedback
        query={{ ...profile, isEnabled: admitted && profile.isEnabled }}
        loadingContent={loadingContent}
      />
    );
  if (!guest && query.data === undefined)
    return <ReadFeedback query={query} loadingContent={loadingContent} />;
  const provisional =
    action.isPending && typeof action.variables === "boolean"
      ? action.variables
      : undefined;
  const following = provisional ?? query.data?.following;
  const uncertain = action.isError && isUncertainMutationFailure(action.error);
  // An explicit retry uses the same desired boolean; the server owns replacement idempotence.
  const canRepeatUncertain = uncertain && query.data !== undefined;
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
          following && !action.isPending
            ? `Saison ${season.label}. Retrouvez ce suivi dans cette saison ou Toutes les saisons.`
            : `Saison ${season.label}.`
        }
        loading={action.isPending}
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
              await action.mutateAsync(
                canRepeatUncertain && typeof action.variables === "boolean"
                  ? action.variables
                  : !following,
              );
            } catch (error) {
              if (!isUncertainMutationFailure(error)) feedback.error();
            }
          }
        }}
      />
      {query.isError && !canRepeatUncertain ? (
        <ReadFeedback query={query} loadingContent={loadingContent} />
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
