import { StyleSheet, View, useWindowDimensions } from "react-native";
import { LoadingGroup } from "@/shared/components/loading-group";
import { TextSkeleton } from "@/shared/components/text-skeleton";
import { Skeleton } from "@/shared/components/skeleton";
import { MatchSurface } from "@/features/sporting/notification-presentation";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

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
        <MatchSurface key={index}>
          <View
            style={[styles.header, { backgroundColor: colors.skeletonHeader }]}
          >
            <Skeleton
              width={tokens.size.media.row}
              height={tokens.size.media.row}
              radius={tokens.media.radius.tile}
            />
            <View style={styles.identity}>
              <TextSkeleton width={198} />
              <TextSkeleton width={128} role="metadata" />
            </View>
            <View style={styles.status} />
          </View>
          <View style={styles.body}>
            <TextSkeleton width={260} />
            {[188, 164].map((width) => (
              <View key={width} style={styles.participant}>
                <View style={styles.teamCopy}>
                  <TextSkeleton width={width} />
                </View>
                <Skeleton width={scoreSize} height={scoreSize} />
              </View>
            ))}
          </View>
        </MatchSurface>
      ))}
    </LoadingGroup>
  );
}

const styles = StyleSheet.create({
  items: { gap: tokens.layout.list.gap },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
  },
  identity: { flex: 1, minWidth: 0, gap: tokens.spacing.optical },
  status: { width: tokens.size.icon.md },
  body: { gap: tokens.spacing.sm, padding: tokens.spacing.md },
  teamCopy: { flex: 1, minWidth: 0 },
  participant: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
});
