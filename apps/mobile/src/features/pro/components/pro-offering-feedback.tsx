import { RefreshCw } from "lucide-react-native";
import { Button } from "../../../shared/components/button";
import { EmptyState, ErrorState } from "../../../shared/components/state-card";
import { ProReadLoading } from "./pro-read-loading";

/** Catalogue-read feedback only; retries never purchase or restore anything. */
export interface ProOfferingFeedbackProps {
  loading: boolean;
  failed: boolean;
  retrying: boolean;
  onRetry: () => void;
}

/** Reserves the read, then presents safe retry or the provider's explicitly empty catalogue. */
export function ProOfferingFeedback({
  loading,
  failed,
  retrying,
  onRetry,
}: Readonly<ProOfferingFeedbackProps>) {
  if (loading) {
    return <ProReadLoading label="Chargement des offres Pro" />;
  }
  if (failed) {
    return <ErrorState onRetry={onRetry} retrying={retrying} />;
  }
  return (
    <EmptyState
      title="Aucune offre Pro disponible"
      description="Réessayez plus tard."
    >
      <Button
        label="Actualiser"
        leadingIcon={RefreshCw}
        onPress={onRetry}
        loading={retrying}
      />
    </EmptyState>
  );
}
