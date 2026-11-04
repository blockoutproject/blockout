import { StyleSheet, View } from "react-native";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { Skeleton } from "../../../shared/components/skeleton";
import { TextSkeleton } from "../../../shared/components/text-skeleton";
import { MatchSummarySkeleton } from "../../sporting/match-consultation";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Two decorative match cards reserve the first read of the moderation queue. */
export function ModerationQueueLoading() {
  return (
    <LoadingGroup
      label="Chargement de la file de modération"
      style={styles.stack}
    >
      {Array.from({ length: 2 }, (_, index) => (
        <MatchPlaceholder key={index} />
      ))}
    </LoadingGroup>
  );
}

/** Detail pages retain the context/editor or context/version-list anatomy without inventing data or actions. */
export function ModerationMatchLoading({
  editor = false,
}: {
  editor?: boolean;
}) {
  return (
    <LoadingGroup label="Chargement des liens du match" style={styles.stack}>
      <MatchPlaceholder />
      <VersionPlaceholder editor={editor} />
      {!editor && <VersionPlaceholder />}
    </LoadingGroup>
  );
}

/** A related exact member has no sporting header and uses the same version placeholder. */
export function ModerationVersionLoading() {
  return (
    <LoadingGroup label="Chargement de la version du lien" style={styles.stack}>
      <VersionPlaceholder />
    </LoadingGroup>
  );
}

/** Bounded reason rows stay inside their report section while its first read is pending. */
export function ModerationReportsLoading() {
  return (
    <LoadingGroup label="Chargement des signalements" style={styles.reports}>
      <View style={styles.report}>
        <TextSkeleton width="42%" role="metadata" />
        <TextSkeleton width="90%" />
      </View>
      <View style={styles.report}>
        <TextSkeleton width="38%" role="metadata" />
        <TextSkeleton width="75%" />
      </View>
    </LoadingGroup>
  );
}

/** Canonical filter metadata loads with the field/action shape used by the existing search filter sheet. */
export function ModerationFiltersLoading() {
  return (
    <LoadingGroup label="Chargement des filtres des liens" style={styles.stack}>
      {["season", "platform", "state"].map((field) => (
        <View key={field} style={styles.stack}>
          <TextSkeleton width="30%" role="metadata" />
          <Skeleton height={tokens.size.control.default} shape="rectangle" />
        </View>
      ))}
      <Skeleton height={tokens.size.control.default} shape="rectangle" />
    </LoadingGroup>
  );
}

/** Mirrors the retained match context's heading and two sporting identity rows. */
function MatchPlaceholder() {
  return <MatchSummarySkeleton />;
}

/** Uses the approved soft version surface and, for an editor, the real control dimensions. */
function VersionPlaceholder({ editor = false }: { editor?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.insetSurface }]}>
      <View style={styles.row}>
        <TextSkeleton width="28%" />
        <TextSkeleton width="22%" />
      </View>
      <TextSkeleton width="64%" role="metadata" />
      {editor ? (
        <Skeleton height={tokens.size.control.default} shape="rectangle" />
      ) : (
        <TextSkeleton />
      )}
      {editor && (
        <Skeleton height={tokens.size.control.default} shape="rectangle" />
      )}
      <TextSkeleton width="45%" role="metadata" />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.spacing.md },
  reports: { gap: tokens.spacing.sm },
  card: {
    padding: tokens.layout.surface.inset,
    borderRadius: tokens.radius.control,
    gap: tokens.spacing.md,
  },
  row: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm },
  report: { gap: tokens.spacing.xs, paddingVertical: tokens.spacing.xs },
});
