import { formatCollectionTimestamp } from "../model/collection-time";
import { Text } from "react-native";
import type { CollectionResultResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { PreparationCard } from "./preparation-layout";

/** Current evidence for one scope/stage/phase; diagnostics are already filtered by the backend contract. */
export interface CollectionResultProps {
  result: CollectionResultResponse;
  diagnostics: boolean;
}

/** A result never borrows success, counts or recovery from a different scope or acquisition phase. */
export function CollectionResult({
  result,
  diagnostics,
}: CollectionResultProps) {
  const { colors } = useTheme();
  const stage = {
    discovery: "Découverte",
    calendar: "Calendrier",
    details: "Détails",
    standings: "Classement",
    "club-sheet": "Fiche club",
    geocoding: "Géocodage",
    logo: "Logo",
  }[result.stage];
  const outcome =
    result.phase === "integration"
      ? {
          success: "Intégration réussie",
          partial: "Intégration partielle",
          failed: "Échec de l’intégration",
          unconfirmed: "Intégration non confirmée",
        }[result.outcome]
      : {
          success: "Acquisition réussie",
          partial: "Acquisition partielle",
          failed: "Échec de l’acquisition",
          unconfirmed: "Acquisition non confirmée",
        }[result.outcome];
  return (
    <PreparationCard>
      <Text
        accessibilityRole="header"
        style={[tokens.typography.strong, { color: colors.text }]}
      >
        {result.scopeLabel} · {stage}
      </Text>
      <Text
        style={[
          tokens.typography.strong,
          {
            color:
              result.outcome === "failed" || result.outcome === "unconfirmed"
                ? colors.error
                : colors.text,
          },
        ]}
      >
        {outcome}
      </Text>
      <Text
        style={[tokens.typography.metadata, { color: colors.secondaryText }]}
      >
        Observé le {formatCollectionTimestamp(result.observedAt)}
      </Text>
      <Text
        style={[tokens.typography.metadata, { color: colors.secondaryText }]}
      >
        Dernier succès de ce périmètre :{" "}
        {result.lastSuccessAt
          ? formatCollectionTimestamp(result.lastSuccessAt)
          : "aucun"}
      </Text>
      <Text
        style={[tokens.typography.metadata, { color: colors.secondaryText }]}
      >
        Obtenus : {result.obtainedCount ?? "non mesuré"} · Rejetés :{" "}
        {result.rejectedCount ?? "non mesuré"}
      </Text>
      {result.reason && (
        <Text style={[tokens.typography.body, { color: colors.text }]}>
          {result.reason}
        </Text>
      )}
      {diagnostics && (
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          {result.reasonType ??
            (result.reason
              ? "Aucune trace technique supplémentaire disponible."
              : "Diagnostic indisponible.")}
        </Text>
      )}
    </PreparationCard>
  );
}
