import { ErrorState } from "../../../shared/components/state-card";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "../../../shared/components/button";
import { RequestLoading } from "../../../shared/components/request-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { usePro } from "../pro-provider";
import type { ProState } from "../pro-state";

/** Unsettled native operations require verification even when an independent entitlement is active. */
export function hasUnsettledProOperation(state: ProState): boolean {
  return (
    state.status !== "guest" &&
    [
      "purchasing",
      "pending",
      "uncertain",
      "already-owned",
      "purchased",
    ].includes(state.operation)
  );
}

/** The destination owner supplies existing support navigation; no diagnostic payload is attached. */
export interface ProVerificationProps {
  onSupport?: () => void;
}

/** Pro-owned verification/recovery; it never changes independent rights or public navigation. */
export function ProVerification({ onSupport }: ProVerificationProps) {
  const { state, refreshing, verificationFailed, retry } = usePro();
  const { colors } = useTheme();
  const feedback = useActionFeedback();

  /** A failed explicit verification retains known rights and the original business outcome. */
  async function verify() {
    feedback.clear();
    const known =
      state.status === "active" || state.status === "inactive" || uncertain;
    if ((await retry()) === false && known) feedback.error();
  }
  if (state.status === "guest") return null;
  const uncertain = hasUnsettledProOperation(state);
  if (state.status !== "unavailable" && !uncertain) return null;
  const waiting =
    state.status === "unavailable" &&
    (state.reason === "association-pending" ||
      (refreshing && !verificationFailed));
  let message = "";
  if (state.operation === "purchased")
    message =
      state.status === "active"
        ? "Paiement confirmé. Les droits liés à cet achat restent à vérifier. Vérifiez vos droits sans acheter à nouveau."
        : "Paiement confirmé. L’activation Pro reste à vérifier. Vérifiez vos droits sans acheter à nouveau.";
  else if (state.operation === "already-owned")
    message =
      "Cet achat est déjà détenu. Vérifiez vos droits ou retrouvez la restauration dans la gestion des achats.";
  else if (uncertain)
    message =
      state.operation === "pending"
        ? "Le paiement est en attente de validation du store. Vérifiez vos droits sans renouveler l’achat."
        : "Le résultat de l’achat est incertain. Vérifiez vos droits sans acheter à nouveau.";
  return (
    <View style={styles.feedback}>
      {waiting ? (
        <RequestLoading />
      ) : uncertain ? (
        <>
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[tokens.typography.body, { color: colors.text }]}
          >
            {message}
          </Text>
          <Button
            label="Vérifier mes droits"
            onPress={() => void verify()}
            loading={refreshing}
          />
        </>
      ) : (
        <ErrorState onRetry={() => void verify()} retrying={refreshing} />
      )}
      {onSupport && (
        <Button label="Contacter l’assistance" onPress={() => onSupport()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  feedback: { width: "100%", gap: tokens.spacing.md },
});
