import { useRouter } from "expo-router";
import { Check, Plus } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import type { SportingSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { useFollowStateQuery } from "../api/use-follow-state-query";
import { useFollowMutation } from "../api/follow-mutations";
import { AccountSessionFeedback } from "../../accounts/current-account";
import type { FollowingTarget } from "../api/following-keys";

/** Exact viewable target and its season; a deliberate press changes only its desired follow state. */
export interface FollowButtonProps {
  target: FollowingTarget;
  season: SportingSeasonResponse;
}
/** Query owns confirmed availability; native mutation state drives provisional progress and shared failure feedback. */
export function FollowButton({ target, season }: FollowButtonProps) {
  const context = useFollowStateQuery(target);
  const action = useFollowMutation(target, context);
  const router = useRouter();
  const feedback = useActionFeedback();
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
  return (
    <View style={styles.control}>
      <Button
        label={following ? "Suivi" : "Suivre"}
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
          !guest && (!usable || following === undefined || query.isError)
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
              await action.mutateAsync(!following);
            } catch {
              feedback.error();
            }
          }
        }}
      />
      {query.isError ? (
        <ReadFeedback query={query} loadingContent={loadingContent} />
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({ control: { gap: tokens.spacing.sm } });
