import { StyleSheet, View, useWindowDimensions } from "react-native";
import { LoadingGroup } from "../../../shared/components/loading-group";
import { TextSkeleton } from "../../../shared/components/text-skeleton";
import { Skeleton } from "../../../shared/components/skeleton";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Three decorative cards reserve the inbox's first read within its ordinary page insets. */
export function NotificationLoading() {
  const { colors } = useTheme();
  const { fontScale } = useWindowDimensions();
  const scoreSize =
    fontScale >= 1.5
      ? tokens.size.control.default
      : tokens.size.control.compact;
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
          <View
            style={[styles.header, { backgroundColor: colors.skeletonHeader }]}
          >
            <Skeleton
              width={tokens.size.media.row}
              height={tokens.size.media.row}
            />
            <View style={styles.identity}>
              <TextSkeleton width={198} />
              <TextSkeleton width={128} role="metadata" />
            </View>
          </View>
          <View style={styles.body}>
            <View style={styles.event}>
              <TextSkeleton width={260} />
            </View>
            <View style={styles.participant}>
              <View style={styles.teamCopy}>
                <TextSkeleton width={188} />
              </View>
              <Skeleton
                width={scoreSize}
                height={scoreSize}
                shape="rectangle"
              />
            </View>
            <View style={styles.participant}>
              <View style={styles.teamCopy}>
                <TextSkeleton width={164} />
              </View>
              <Skeleton
                width={scoreSize}
                height={scoreSize}
                shape="rectangle"
              />
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
  teamCopy: { flex: 1, minWidth: 0 },
  participant: {
    minHeight: tokens.size.control.compact,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
});
