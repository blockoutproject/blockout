import { StyleSheet, Text } from "react-native";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { Button } from "../../../shared/components/button";
import {
  Page,
  PageContent,
  PageScrollView,
} from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { ScreenState } from "../../../shared/components/screen-state";
import { usePro } from "../pro-provider";
import type { useProOffering } from "../api/use-pro-offering";
import { ProOfferingFeedback } from "./pro-offering-feedback";
import { hasAssociatedCustomer } from "../pro-presentation-state";
import {
  ProVerification,
  hasUnsettledProOperation,
  isProVerificationLoading,
} from "./pro-verification";

/** Safe read recovery and independent restoration/management/support actions supplied by the current host. */
export interface ProRecoveryProps {
  showPaywall: boolean;
  offering: ReturnType<typeof useProOffering>;
  restoring: boolean;
  onRetry: () => void;
  onRestore: () => void;
  onManagement: () => void;
  onSupport?: () => void;
}

/** Presents catalogue or rights recovery without taking ownership of native operations or route callbacks. */
export function ProRecovery({
  showPaywall,
  offering,
  restoring,
  onRetry,
  onRestore,
  onManagement,
  onSupport,
}: ProRecoveryProps) {
  const { state, refreshing, verificationFailed } = usePro();
  const { colors } = useTheme();
  const associated = hasAssociatedCustomer(state);
  const operation = state.status === "guest" ? "idle" : state.operation;
  const loadingOffer =
    offering.isFetching &&
    (!offering.isFetchedAfterMount || offering.data !== null);
  const loading = showPaywall
    ? loadingOffer
    : isProVerificationLoading(state, refreshing, verificationFailed);
  const Content = loading ? PageContent : ScreenState;
  const contextualOutcome =
    !showPaywall &&
    (state.status !== "unavailable" ||
      hasUnsettledProOperation(state) ||
      operation === "restored");
  return (
    <Page accessibilityViewIsModal header={<PageHeader title="Blockout Pro" />}>
      <PageScrollView>
        <Content style={contextualOutcome ? styles.centered : undefined}>
          {showPaywall ? (
            <ProOfferingFeedback
              loading={loadingOffer}
              failed={
                offering.isError ||
                !offering.isFetchedAfterMount ||
                offering.data === undefined
              }
              retrying={offering.isFetching}
              onRetry={onRetry}
            />
          ) : (
            <ProVerification />
          )}
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            La restauration peut associer les achats du store à ce compte, y
            compris le reçu entier. Elle ne récupère ni votre ancien profil ni
            vos cadeaux. Un achat d’une autre boutique peut nécessiter
            l’assistance.
          </Text>
          <Button
            label="Restaurer mes achats"
            onPress={onRestore}
            disabled={
              !associated || ["restoring", "purchasing"].includes(operation)
            }
            loading={restoring || operation === "restoring"}
          />
          {associated && (
            <Button
              label="Gérer ou restaurer mes achats"
              onPress={onManagement}
            />
          )}
          {onSupport && (
            <Button label="Contacter l’assistance" onPress={onSupport} />
          )}
        </Content>
      </PageScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({ centered: { justifyContent: "center" } });
