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
  onSupport(): void;
}

/** Inline Pro-only verification/recovery; it never replaces independent rights or public navigation. */
export function ProVerification({ onSupport }: ProVerificationProps) {
  const { state, refreshing, verificationFailed, retry } = usePro();
  if (state.status === "guest") return null;
  const uncertain =
    state.operation === "pending" || state.operation === "uncertain";
  if (state.status !== "unavailable" && !verificationFailed && !uncertain)
    return null;
  const waiting =
    state.status === "unavailable" &&
    (state.reason === "association-pending" ||
      (refreshing && !verificationFailed));
  return (
    <View style={styles.feedback}>
      {waiting ? (
        <RequestLoading />
      ) : (
        <RequestError
          message={
            uncertain
              ? "Votre opération est en attente de vérification. Vérifiez vos droits ou contactez l’assistance."
              : "La vérification de vos droits Pro est indisponible. Réessayez ou contactez l’assistance."
          }
          onRetry={retry}
          retrying={refreshing}
        />
      )}
      <Button label="Contacter l’assistance" onPress={() => onSupport()} />
    </View>
  );
}

const styles = StyleSheet.create({ feedback: { gap: tokens.spacing.md } });
