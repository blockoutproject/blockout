import { StyleSheet, Text, View } from "react-native";
import type {
  CollectionResultResponse,
  CollectionResultSourceResponse,
} from "../../../../.generated/schemas/index.zod";
import { LoadingGroup } from "@/shared/components/loading-group";
import { Skeleton } from "@/shared/components/skeleton";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/shared/components/status-badge";
import { Surface } from "@/shared/components/surface";
import { TextSkeleton } from "@/shared/components/text-skeleton";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import {
  outcomeLabels,
  stageLabels,
} from "../model/collection-result-presentation";
import { formatCollectionTimestamp } from "../model/collection-time";
import { CollectionLink } from "./collection-link";

const outcomeTones = {
  success: "success",
  partial: "warning",
  failed: "error",
  unconfirmed: "warning",
} satisfies Record<CollectionResultResponse["outcome"], StatusBadgeTone>;

// These fixed collector reasons also appear on results retained before this presentation.
const geocodingBadgeByReason = new Map<
  string,
  { label: string; tone: StatusBadgeTone }
>([
  ["IGN location: empty", { label: "Aucun point trouvé", tone: "neutral" }],
  ["IGN location: ambiguous", { label: "Résultats ambigus", tone: "warning" }],
  ["IGN location: located", { label: "Localisé", tone: "success" }],
]);

/** One accepted outcome. A contextual link needs an established source from this very row. */
export function CollectionBilanResult({
  result,
  onViewSource,
}: Readonly<{
  result: CollectionResultResponse;
  onViewSource?: (source: CollectionResultSourceResponse) => void;
}>) {
  const { colors } = useTheme();
  const { source, reason, reasonType, lastSuccessAt } = result;
  const geocodingBadge =
    result.stage === "geocoding" &&
    result.phase === "acquisition" &&
    result.outcome === "success" &&
    reason
      ? geocodingBadgeByReason.get(reason)
      : undefined;
  const sourceLink =
    onViewSource && result.outcome !== "success" ? source : undefined;
  const outlinedBadge =
    result.outcome === "success" || result.outcome === "failed";
  const lastUsefulSuccess =
    lastSuccessAt &&
    (result.outcome !== "success" || lastSuccessAt !== result.observedAt);
  const counts = [
    result.obtainedCount === undefined
      ? undefined
      : `Obtenus : ${result.obtainedCount}`,
    result.rejectedCount === undefined
      ? undefined
      : `Rejetés : ${result.rejectedCount}`,
  ]
    .filter((count) => count !== undefined)
    .join(" - ");

  return (
    <Surface style={styles.card}>
      <View style={styles.headline}>
        <View style={styles.identity}>
          <Text
            accessibilityRole="header"
            style={[tokens.typography.strong, { color: colors.text }]}
          >
            {result.scopeLabel}
          </Text>
          <View style={styles.metadata}>
            <Text
              style={[
                tokens.typography.metadata,
                { color: colors.secondaryText },
              ]}
            >
              {stageLabels[result.stage]} -{" "}
              {result.phase === "integration" ? "Intégration" : "Acquisition"}
            </Text>
            <Text
              style={[
                tokens.typography.metadata,
                { color: colors.secondaryText },
              ]}
            >
              {formatCollectionTimestamp(result.observedAt, "compact")}
            </Text>
          </View>
        </View>
        <StatusBadge
          label={geocodingBadge?.label ?? outcomeLabels[result.outcome]}
          tone={geocodingBadge?.tone ?? outcomeTones[result.outcome]}
          outlined={outlinedBadge}
          style={styles.badge}
        />
      </View>
      {!!reason && !geocodingBadge && (
        <Text style={[tokens.typography.body, { color: colors.text }]}>
          {reason}
        </Text>
      )}
      {lastUsefulSuccess && (
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          Dernier succès : {formatCollectionTimestamp(lastSuccessAt)}
        </Text>
      )}
      {!!counts && (
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          {counts}
        </Text>
      )}
      {!!(reasonType || sourceLink) && (
        <View style={styles.footer}>
          {!!reasonType && (
            <Text
              style={[
                styles.code,
                sourceLink && styles.codeBesideLink,
                { backgroundColor: colors.subtle, color: colors.secondaryText },
              ]}
            >
              {reasonType}
            </Text>
          )}
          {sourceLink && onViewSource && (
            <CollectionLink
              label="Voir la source"
              accessibilityHint={sourceLink.label}
              onPress={() => onViewSource(sourceLink)}
            />
          )}
        </View>
      )}
    </Surface>
  );
}

/** Reserves the ordinary compact cards before status and optional evidence are known. */
export function CollectionBilanResultsLoading() {
  return (
    <LoadingGroup
      label="Chargement des résultats de collecte"
      style={styles.loadingRows}
    >
      {[0, 1].map((row) => (
        <Surface key={row} style={styles.card}>
          <View style={styles.headline}>
            <View style={styles.identity}>
              <TextSkeleton width="80%" />
              <TextSkeleton width="88%" role="metadata" />
            </View>
            <Skeleton
              width={tokens.size.control.default}
              height={tokens.size.icon.lg}
            />
          </View>
        </Surface>
      ))}
    </LoadingGroup>
  );
}

const styles = StyleSheet.create({
  loadingRows: { gap: tokens.layout.list.gap },
  card: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    borderRadius: tokens.radius.panelInset,
  },
  headline: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.spacing.sm,
  },
  identity: { flex: 1, minWidth: 0, gap: tokens.spacing.xs },
  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: tokens.spacing.sm,
  },
  badge: {
    maxWidth: "48%",
    paddingHorizontal: tokens.spacing.sm - tokens.border.thin,
    paddingVertical: tokens.spacing.xs - tokens.border.thin,
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: tokens.spacing.sm,
  },
  code: {
    ...tokens.typography.metadata,
    flexShrink: 1,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.control,
  },
  codeBesideLink: { flexGrow: 1, flexBasis: "55%" },
});
