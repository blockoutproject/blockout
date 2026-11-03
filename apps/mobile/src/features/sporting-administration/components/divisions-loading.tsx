import { StyleSheet, View } from "react-native";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { Skeleton } from "../../../shared/components/skeleton";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Division catalogue rows retain their media, name and palette slots without inventing names or colors. */
export function DivisionsLoading() {
  return (
    <LoadingGroup label="Chargement des divisions" style={styles.rows}>
      <DivisionLoading />
      <DivisionLoading />
    </LoadingGroup>
  );
}

/** Mirrors one catalogue card's media and copy while all shapes remain decorative. */
function DivisionLoading() {
  const { colors } = useTheme();
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Skeleton width={52} height={52} shape="rectangle" />
      <View style={styles.copy}>
        <Skeleton width="75%" />
        <View style={styles.palette}>
          <Skeleton width={14} height={14} />
          <Skeleton width={14} height={14} />
          <Skeleton width={14} height={14} />
        </View>
      </View>
      <Skeleton width={18} height={18} />
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: tokens.spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.lg,
  },
  copy: { flex: 1, minWidth: 0, gap: tokens.spacing.md },
  palette: { flexDirection: "row", gap: tokens.spacing.xs },
});
