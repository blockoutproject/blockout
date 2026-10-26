import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef } from "react";
import { Text } from "react-native";
import { Button } from "../../../shared/components/button";
import { RequestError } from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import type { SessionSnapshot } from "../../accounts";
import { useAccountSession } from "../../accounts/current-account";
import { usePro } from "../pro-provider";
import { canPurchasePro } from "../pro-offering";
import { useProOffering } from "../api/use-pro-offering";
import { ProEntry } from "./pro-entry";
import { ProVerification } from "./pro-verification";

/** Profile entry and app-owned operation feedback; all purchase/management content stays native. */
export function ProProfileEntry() {
  const router = useRouter();
  const account = useAccountSession();
  const { state } = usePro();
  const offering = useProOffering();
  const { colors } = useTheme();
  const session = account.getSnapshot();
  const request = useRef<SessionSnapshot | null>(null);
  useFocusEffect(
    useCallback(
      () => () => {
        request.current = null;
      },
      [],
    ),
  );
  const connected =
    account.status === "authenticated" && session.accountId !== null;
  const associated =
    state.status === "active" ||
    state.status === "inactive" ||
    (state.status === "unavailable" && state.reason === "customer-info");

  /** Keeps offer loading on the profile and abandons presentation intent when focus/session changes. */
  async function open() {
    if (!connected) return;
    const attempt = { ...account.getSnapshot() };
    if (
      request.current?.generation === attempt.generation &&
      request.current.accountId === attempt.accountId
    )
      return;
    // A previous session's pending read cannot block a new explicit opening.
    request.current = attempt;
    try {
      if (canPurchasePro(state)) {
        const result = await offering.refetch();
        if (result.isError || !result.data) return;
      }
      if (
        request.current === attempt &&
        account.isCurrent(attempt.generation) &&
        account.getSnapshot().accountId === attempt.accountId
      )
        router.navigate("/pro");
    } finally {
      if (request.current === attempt) request.current = null;
    }
  }

  return (
    <>
      <ProEntry
        opening={offering.isFetching}
        onOpenPresentation={() => void open()}
      />
      {connected && (
        <>
          <ProVerification />
          {associated && (
            <Button
              label="Gérer ou restaurer mes achats"
              onPress={() => {
                request.current = null;
                if (account.isCurrent(session.generation))
                  router.navigate({
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
          {state.status === "active" &&
            (state.operation === "purchased" ||
              state.operation === "completed") && (
              <Text
                accessibilityLiveRegion="polite"
                style={[tokens.typography.body, { color: colors.text }]}
              >
                Blockout Pro est actif : les publicités Blockout sont
                désactivées.
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
                onRetry={() => void open()}
                retrying={offering.isFetching}
              />
            )}
        </>
      )}
    </>
  );
}
