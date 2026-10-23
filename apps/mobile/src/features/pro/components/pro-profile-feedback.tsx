import { useRouter } from "expo-router";
import { Text } from "react-native";
import { Button } from "../../../shared/components/button";
import { RequestError } from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useAccountSession } from "../../accounts/current-account";
import { usePro } from "../pro-provider";
import { canPurchasePro } from "../pro-offering";
import { useProOffering } from "../use-pro-offering";
import { ProVerification } from "./pro-verification";

/** App-owned operation feedback within the existing profile; all purchase/management content stays native. */
export function ProProfileFeedback() {
  const router = useRouter();
  const account = useAccountSession();
  const { state, retry } = usePro();
  const offering = useProOffering(false);
  const { colors } = useTheme();
  const session = account.getSnapshot();
  const connected =
    account.status === "authenticated" && session.accountId !== null;
  const associated =
    state.status === "active" ||
    state.status === "inactive" ||
    (state.status === "unavailable" && state.reason === "customer-info");

  return (
    <>
      {connected && (
        <>
          <ProVerification />
          {associated && (
            <Button
              label="Gérer ou restaurer mes achats"
              onPress={() => {
                if (account.isCurrent(session.generation))
                  router.push({
                    pathname: "/pro",
                    params: { management: "1" },
                  });
              }}
            />
          )}
          {state.status !== "guest" && state.operation === "cancelled" && (
            <Text
              accessibilityLiveRegion="polite"
              style={[tokens.typography.body, { color: colors.text }]}
            >
              Achat annulé.
            </Text>
          )}
          {state.status !== "guest" && state.operation === "failed" && (
            <RequestError
              message="L’achat n’a pas abouti. Aucun accès Pro supplémentaire n’est confirmé."
              onRetry={retry}
            />
          )}
          {state.status === "active" && state.operation === "purchased" && (
            <Text
              accessibilityLiveRegion="polite"
              style={[tokens.typography.body, { color: colors.text }]}
            >
              Blockout Pro est actif : les publicités Blockout sont désactivées.
            </Text>
          )}
          {canPurchasePro(state) &&
            (offering.isError || offering.data === null) && (
              <RequestError
                message={
                  offering.isError
                    ? "La lecture de l’offre Pro a échoué. Réessayez depuis Blockout Pro."
                    : "Aucune offre Pro n’est disponible. Réessayez depuis Blockout Pro."
                }
                onRetry={() => {
                  if (account.isCurrent(session.generation))
                    router.push("/pro");
                }}
              />
            )}
        </>
      )}
    </>
  );
}
