import { ErrorState } from "../../../shared/components/state-card";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "../../../shared/components/button";
import { ProReadLoading } from "./pro-read-loading";
import { tokens } from "../../../shared/theme/tokens";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { usePro } from "../pro-provider";
import type { ProState } from "../pro-state";

/** Identifies actual store facts that remain separate from entitlement activation. */
export function hasUnsettledProOperation(state: ProState): boolean {
  return (
    state.status !== "guest" &&
    ["pending", "already-owned", "purchased"].includes(state.operation)
  );
}

/** The destination owner supplies existing support navigation; no diagnostic payload is attached. */
export interface ProVerificationProps {
  onSupport?: () => void;
}

/** Identifies initial association/rights loading only; known entitlements and native operations keep their own feedback. */
export function isProVerificationLoading(
  state: ProState,
  refreshing: boolean,
  verificationFailed: boolean,
): boolean {
  return (
    state.status === "unavailable" &&
    (state.reason === "association-pending" ||
      (refreshing && !verificationFailed))
  );
}

/** Pro-owned verification/recovery; it never changes independent rights or public navigation. */
export function ProVerification({ onSupport }: Readonly<ProVerificationProps>) {
  const { state, refreshing, verificationFailed, retry } = usePro();
  const { colors } = useTheme();
  const feedback = useActionFeedback();

  /** A failed explicit verification retains known rights and the original business outcome. */
  async function verify() {
    feedback.clear();
    const known =
      state.status === "active" || state.status === "inactive" || unsettled;
    if ((await retry()) === false && known) {
      feedback.error();
    }
  }

  if (state.status === "guest") {
    return null;
  }
  const unsettled = hasUnsettledProOperation(state);
  if (
    state.status !== "unavailable" &&
    !unsettled &&
    state.operation !== "restored"
  ) {
    return null;
  }
  const waiting = isProVerificationLoading(
    state,
    refreshing,
    verificationFailed,
  );
  const message = verificationMessage(state);
  const operation = state.operation;

  /** Shows the returned restoration result directly; unfinished payment and unavailable reads retain recovery. */
  function renderFeedback() {
    if (waiting) {
      return <ProReadLoading label="Vérification des droits Pro" />;
    }
    if (unsettled || operation === "restored") {
      return (
        <>
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={[tokens.typography.body, { color: colors.text }]}
          >
            {message}
          </Text>
          {["pending", "already-owned", "purchased"].includes(operation) && (
            <Button
              label="Vérifier mes droits"
              onPress={() => void verify()}
              loading={refreshing}
            />
          )}
        </>
      );
    }
    return <ErrorState onRetry={() => void verify()} retrying={refreshing} />;
  }

  return (
    <View style={styles.feedback}>
      {renderFeedback()}
      {onSupport && (
        <Button label="Contacter l’assistance" onPress={() => onSupport()} />
      )}
    </View>
  );
}

/** Describes the current native outcome without treating operation completion as an active entitlement. */
function verificationMessage(state: Exclude<ProState, { status: "guest" }>) {
  let message = "";
  if (state.operation === "restored") {
    message =
      "Restauration terminée. Aucun droit Pro actif n’a été établi pour ce compte.";
  } else if (state.operation === "purchased") {
    message =
      state.status === "active"
        ? "Paiement confirmé. Les droits liés à cet achat restent à vérifier. Vérifiez vos droits sans acheter à nouveau."
        : "Paiement confirmé. L’activation Pro reste à vérifier. Vérifiez vos droits sans acheter à nouveau.";
  } else if (state.operation === "already-owned") {
    message =
      "Cet achat est déjà détenu. Vérifiez vos droits ou retrouvez la restauration dans la gestion des achats.";
  } else if (state.operation === "pending") {
    message =
      "Le paiement est en attente de validation du store. Vérifiez vos droits sans renouveler l’achat.";
  }
  return message;
}

const styles = StyleSheet.create({
  feedback: { width: "100%", gap: tokens.spacing.md },
});
