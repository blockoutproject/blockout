import { StyleSheet, View } from "react-native";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { TextSkeleton } from "../../../shared/components/text-skeleton";
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
      <View style={[styles.rail, { backgroundColor: colors.skeletonHeader }]}>
        <Skeleton width={52} height={52} shape="rectangle" />
      </View>
      <View style={styles.copy}>
        <TextSkeleton width={130} />
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
    paddingRight: tokens.spacing.lg,
    minHeight: 116,
    overflow: "hidden",
    gap: tokens.spacing.lg,
  },
  rail: {
    width: 76,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: tokens.spacing.xl,
    paddingVertical: tokens.spacing.lg,
  },
  palette: { flexDirection: "row", gap: tokens.spacing.xs },
});
