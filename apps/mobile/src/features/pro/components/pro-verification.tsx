import { View, StyleSheet } from "react-native";
import { Button } from "../../../shared/components/button";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { usePro } from "../pro-provider";

/** The destination owner supplies existing support navigation; no diagnostic payload is attached. */
export interface ProVerificationProps {
  onSupport?: () => void;
}

/** Inline Pro-only verification/recovery; it never replaces independent rights or public navigation. */
export function ProVerification({ onSupport }: ProVerificationProps) {
  const { state, refreshing, verificationFailed, retry } = usePro();
  if (state.status === "guest") return null;
  const uncertain =
    ["purchasing", "pending", "uncertain", "already-owned"].includes(
      state.operation,
    ) ||
    (state.operation === "purchased" && state.status !== "active");
  if (state.status !== "unavailable" && !verificationFailed && !uncertain)
    return null;
  const waiting =
    state.status === "unavailable" &&
    (state.reason === "association-pending" ||
      (refreshing && !verificationFailed));
  let message =
    "La vérification de vos droits Pro est indisponible. Réessayez ou contactez l’assistance.";
  if (state.operation === "purchased" && state.status !== "active")
    message =
      "Paiement confirmé. L’activation Pro reste à vérifier. Vérifiez vos droits sans acheter à nouveau.";
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
      ) : (
        <RequestError message={message} onRetry={retry} retrying={refreshing} />
      )}
      {onSupport && (
        <Button label="Contacter l’assistance" onPress={() => onSupport()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ feedback: { gap: tokens.spacing.md } });
