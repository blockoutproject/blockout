import { StyleSheet, View } from "react-native";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { Skeleton } from "../../../shared/components/skeleton";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Three decorative cards reserve the inbox's first read within its ordinary page insets. */
export function NotificationLoading() {
  const { colors } = useTheme();
  return (
    <LoadingGroup label="Chargement des notifications" style={styles.items}>
      {Array.from({ length: 3 }, (_, index) => (
        <View
          key={index}
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.header}>
            <Skeleton
              width={tokens.size.media.row}
              height={tokens.size.media.row}
            />
            <View style={styles.identity}>
              <Skeleton />
              <Skeleton width={128} height={12} />
            </View>
          </View>
          <View style={styles.body}>
            <View style={styles.event}>
              <Skeleton width={260} height={12} />
            </View>
            <View style={styles.participant}>
              <Skeleton width={188} />
            </View>
            <View style={styles.participant}>
              <Skeleton width={164} />
            </View>
          </View>
        </View>
      ))}
    </LoadingGroup>
  );
}

const styles = StyleSheet.create({
  items: { gap: tokens.layout.list.gap },
  card: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
  },
  identity: { flex: 1, minWidth: 0, gap: tokens.spacing.optical },
  body: { gap: tokens.spacing.sm, padding: tokens.spacing.md },
  event: {
    minHeight: tokens.typography.body.lineHeight,
    justifyContent: "center",
  },
  participant: {
    minHeight: tokens.size.control.compact,
    justifyContent: "center",
  },
});
