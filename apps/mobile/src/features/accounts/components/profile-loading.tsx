import { StyleSheet, View } from "react-native";
import { Skeleton } from "../../../shared/components/skeleton";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Whole initial Account body; no live identity, field or navigation action is exposed before readiness. */
export function ProfileLoading({ editor = false }: { editor?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Chargement du profil"
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      pointerEvents="none"
      style={styles.body}
    >
      {editor ? (
        <Skeleton height={180} shape="rectangle" />
      ) : (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.raised, borderColor: colors.border },
          ]}
        >
          <View
            style={[styles.artwork, { backgroundColor: colors.skeleton }]}
          />
          <View style={styles.identity}>
            <Skeleton width={72} height={10} />
            <Skeleton width={144} />
            <Skeleton height={12} />
          </View>
        </View>
      )}
      <View style={styles.group}>
        <Skeleton width={120} />
        <Skeleton height={editor ? 180 : 144} shape="rectangle" />
      </View>
      <View style={styles.group}>
        {!editor && <Skeleton width={96} />}
        <Skeleton height={editor ? 48 : 96} shape="rectangle" />
      </View>
      <Skeleton height={48} shape="rectangle" />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: tokens.spacing.lg },
  group: { gap: tokens.spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    height: 156 + tokens.border.thin * 2,
    gap: tokens.spacing.md,
    paddingRight: tokens.spacing.md,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    overflow: "hidden",
  },
  artwork: { width: 84, alignSelf: "stretch" },
  identity: { flex: 1, minWidth: 0, gap: tokens.spacing.md },
});
