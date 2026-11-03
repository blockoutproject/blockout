import { StyleSheet, View } from "react-native";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { Skeleton } from "../../../shared/components/skeleton";
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
    <LoadingGroup label="Chargement des signalements" style={styles.stack}>
      <Skeleton width="42%" height={tokens.typography.metadata.lineHeight} />
      <Skeleton width="90%" />
      <Skeleton width="38%" height={tokens.typography.metadata.lineHeight} />
      <Skeleton width="75%" />
    </LoadingGroup>
  );
}

/** Canonical filter metadata loads with the field/action shape used by the existing search filter sheet. */
export function ModerationFiltersLoading() {
  return (
    <LoadingGroup label="Chargement des filtres des liens" style={styles.stack}>
      {["season", "platform", "state"].map((field) => (
        <View key={field} style={styles.stack}>
          <Skeleton
            width="30%"
            height={tokens.typography.metadata.lineHeight}
          />
          <Skeleton height={tokens.size.control.default} shape="rectangle" />
        </View>
      ))}
      <Skeleton height={tokens.size.control.default} shape="rectangle" />
    </LoadingGroup>
  );
}

/** Mirrors the retained match context's heading and two sporting identity rows. */
function MatchPlaceholder() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Skeleton width="60%" height={tokens.typography.title.lineHeight} />
      <Skeleton width="48%" height={tokens.typography.metadata.lineHeight} />
      {["home", "away"].map((team) => (
        <View key={team} style={styles.row}>
          <Skeleton
            width={tokens.size.icon.lg}
            height={tokens.size.icon.lg}
            shape="rectangle"
          />
          <View style={styles.copy}>
            <Skeleton width="82%" />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Uses the approved soft version surface and, for an editor, the real control dimensions. */
function VersionPlaceholder({ editor = false }: { editor?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.insetSurface }]}>
      <View style={styles.row}>
        <Skeleton width="28%" />
        <Skeleton width="22%" />
      </View>
      <Skeleton width="64%" height={tokens.typography.metadata.lineHeight} />
      <Skeleton
        height={
          editor
            ? tokens.size.control.default
            : tokens.typography.body.lineHeight
        }
        shape={editor ? "rectangle" : "text"}
      />
      {editor && (
        <Skeleton height={tokens.size.control.default} shape="rectangle" />
      )}
      <Skeleton width="45%" height={tokens.typography.metadata.lineHeight} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.spacing.md },
  card: {
    padding: tokens.layout.surface.inset,
    borderRadius: tokens.radius.control,
    gap: tokens.spacing.md,
  },
  row: { flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm },
  copy: { flex: 1 },
});
